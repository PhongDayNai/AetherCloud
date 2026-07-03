import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import crypto from 'crypto';
import { requireAuth } from '../middleware/requireAuth';
import * as db from '../lib/db';
import {
  getAsset,
  getAbsPathFromAsset,
  getPlayableAbsPathFromAsset,
  getHlsAbsPathFromAsset,
  getHlsDirAbsPathFromAsset,
  Asset,
  getUnifiedStats,
  LIBRARY_PATH,
  isEditableTextAsset,
} from '../lib/assets';
import { getStorageUsage } from '../lib/storage';
import { isValidUUID, filterValidUUIDs, isGroupMember, getGroupMemberRole } from '../lib/utils';
import { DomainError } from '../lib/errors';
import * as assetsUsecase from '../usecases/assets';

const router = express.Router();
const tempDir = '/tmp/aethercloud-upload';
fs.mkdirSync(tempDir, { recursive: true });

const upload = multer({
  dest: tempDir,
  limits: {
    files: 50,
    fileSize: 20 * 1024 * 1024 * 1024, // 20GB/file safety guard
  },
});

interface ChunkSession {
  fileName: string;
  mime: string;
  totalSize: number;
  chunkDir: string;
  createdAt: number;
  lastModified: number | null;
  groupId: string | null;
  saveToPersonal: boolean;
}

const chunkSessions = new Map<string, ChunkSession>();

// Middleware kiểm tra quyền sở hữu đối với 1 asset
async function checkAssetOwnership(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;
  if (!isValidUUID(id)) {
    return res.status(400).json({ message: 'Invalid ID format' });
  }
  try {
    const asset = await getAsset(id);
    if (!asset) return res.status(404).json({ message: 'File not found' });
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    if (asset.groupId) {
      // Kiểm tra quyền thành viên nhóm
      const role = await getGroupMemberRole(asset.groupId, req.user.sub);
      if (!role) {
        return res.status(403).json({ message: 'You do not have permission to access files in this group' });
      }
      req.groupRole = role;
    } else {
      // Kiểm tra sở hữu cá nhân
      if (asset.ownerId !== req.user.sub) {
        return res.status(403).json({ message: 'You do not have permission to access this file' });
      }
    }

    // Nếu là thao tác chỉnh sửa/xóa (PUT/DELETE/PATCH)
    const isWrite = ['PUT', 'DELETE', 'PATCH'].includes(req.method);
    if (isWrite) {
      if (asset.groupId) {
        const isCreator = asset.ownerId === req.user.sub;
        const isManager = req.groupRole === 'owner' || req.groupRole === 'admin';
        if (!isCreator && !isManager) {
          return res.status(403).json({ message: 'Only contributors or group admins can modify this file' });
        }
      } else {
        if (asset.ownerId !== req.user.sub) {
          return res.status(403).json({ message: 'You do not have permission to edit this file' });
        }
      }
    }

    req.asset = asset; // Truyền asset đã query sang handler kế tiếp
    next();
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}

// Middleware kiểm tra quyền sở hữu đối với danh sách bulk assets (Chỉnh sửa/Xóa tạm thời/Khôi phục)
async function checkBulkOwnership(req: Request, res: Response, next: NextFunction) {
  const idsInput = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const ids = filterValidUUIDs(idsInput);
  if (!ids.length) return res.status(400).json({ message: 'Ids list does not contain valid UUIDs' });
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const assetsRes = await db.query(
      'SELECT id, owner_id, group_id, is_deleted FROM assets WHERE id = ANY($1)',
      [ids]
    );
    if (assetsRes.rows.length !== ids.length) {
      return res.status(404).json({ message: 'Some files do not exist or have invalid IDs' });
    }

    const verifiedAssets: any[] = [];
    for (const asset of assetsRes.rows) {
      let role: string | null = null;
      if (asset.group_id) {
        role = await getGroupMemberRole(asset.group_id, req.user.sub);
        if (!role) {
          return res.status(403).json({ message: 'You do not have permission to perform actions on some group files' });
        }
        const isCreator = asset.owner_id === req.user.sub;
        const isManager = role === 'owner' || role === 'admin';
        if (!isCreator && !isManager) {
          return res.status(403).json({ message: 'You do not have permission to edit or delete files belonging to other members' });
        }
      } else {
        if (asset.owner_id !== req.user.sub) {
          return res.status(403).json({ message: 'You do not have permission to perform actions on other people\'s personal files' });
        }
      }
      verifiedAssets.push({ ...asset, groupRole: role });
    }

    req.bulkAssets = verifiedAssets; // Cache lại danh sách để router kế tiếp dùng trực tiếp không cần query lại
    next();
  } catch (e: any) {
    return res.status(500).json({ message: e.message });
  }
}

// 1. GET danh sách assets
router.get('/', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const limit = Number(req.query.limit || 200);
  const includeTrash = String(req.query.includeTrash || 'false') === 'true';
  const onlyTrash = String(req.query.onlyTrash || 'false') === 'true';
  const cursor = req.query.cursor ? String(req.query.cursor) : undefined;

  const type = req.query.type ? String(req.query.type) : undefined;
  const subType = req.query.subType ? String(req.query.subType) : undefined;
  const category = req.query.category ? String(req.query.category) : undefined;
  const album = req.query.album ? String(req.query.album) : undefined;
  const tag = req.query.tag ? String(req.query.tag) : undefined;
  const docProject = req.query.docProject ? String(req.query.docProject) : undefined;
  const groupId = req.query.groupId ? String(req.query.groupId) : undefined;

  try {
    const result = await assetsUsecase.listUserAssets(req.user.sub, limit, {
      includeTrash,
      onlyTrash,
      cursor,
      type,
      subType,
      category,
      album,
      tag,
      docProject,
      groupId
    });
    return res.json(result);
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 2. POST khởi tạo session upload chunk
router.post('/upload-chunk/init', requireAuth, async (req: Request, res: Response) => {
  const { fileName, mime, totalSize, lastModified, groupId, saveToPersonal } = req.body || {};
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const { uploadId } = await assetsUsecase.initUploadChunk(fileName, mime, totalSize, lastModified, groupId, saveToPersonal, req.user.sub);
    const chunkDir = path.join(tempDir, uploadId);
    fs.mkdirSync(chunkDir, { recursive: true });

    chunkSessions.set(uploadId, {
      fileName,
      mime,
      totalSize: Number(totalSize || 0),
      chunkDir,
      createdAt: Date.now(),
      lastModified: lastModified ? Number(lastModified) : null,
      groupId: groupId || null,
      saveToPersonal: String(saveToPersonal) === 'true',
    });

    return res.json({ ok: true, uploadId });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 3. POST tải lên từng chunk
router.post('/upload-chunk/:uploadId', requireAuth, upload.single('chunk'), (req: Request, res: Response) => {
  const session = chunkSessions.get(req.params.uploadId);
  if (!session) return res.status(404).json({ message: 'upload session not found' });
  if (!req.file) return res.status(400).json({ message: 'chunk is required' });

  const index = Number(req.body?.index);
  if (!Number.isFinite(index) || index < 0) return res.status(400).json({ message: 'invalid chunk index' });

  const dest = path.join(session.chunkDir, `${String(index).padStart(8, '0')}.part`);
  fs.renameSync(req.file.path, dest);
  return res.json({ ok: true, index });
});

// 4. POST xác nhận hoàn tất ghép chunk
router.post('/upload-chunk/:uploadId/complete', requireAuth, async (req: Request, res: Response) => {
  const session = chunkSessions.get(req.params.uploadId);
  if (!session) return res.status(404).json({ message: 'upload session not found' });

  const parts = fs.readdirSync(session.chunkDir).filter((x) => x.endsWith('.part')).sort();
  if (!parts.length) return res.status(400).json({ message: 'no chunks uploaded' });

  const merged = path.join(tempDir, `${req.params.uploadId}.merged`);
  const ws = fs.createWriteStream(merged);
  for (const p of parts) {
    const buf = fs.readFileSync(path.join(session.chunkDir, p));
    ws.write(buf);
  }
  ws.end();

  await new Promise<void>((resolve) => ws.on('finish', () => resolve()));

  try {
    const stat = fs.statSync(merged);
    const fileData = {
      path: merged,
      originalname: session.fileName,
      mimetype: session.mime,
      size: stat.size,
      lastModified: session.lastModified,
    };

    const saved = await assetsUsecase.completeUploadChunk(fileData, session.groupId, session.saveToPersonal, req.user);

    try { fs.rmSync(session.chunkDir, { recursive: true, force: true }); } catch { }
    chunkSessions.delete(req.params.uploadId);

    return res.json({ ok: true, item: saved });
  } catch (err: any) {
    try { if (fs.existsSync(merged)) fs.unlinkSync(merged); } catch { }
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 5. POST upload thông thường (cho các file nhỏ)
router.post('/upload', requireAuth, upload.array('files', 50), async (req: Request, res: Response) => {
  const files = (req.files as Express.Multer.File[]) || [];
  const lastModified = req.body.lastModified ? Number(req.body.lastModified) : null;
  const groupId = req.body.groupId || null;
  const saveToPersonal = String(req.body.saveToPersonal) === 'true';

  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const cleanFiles = files.map(f => ({
    path: f.path,
    originalname: f.originalname,
    mimetype: f.mimetype,
    size: f.size
  }));

  try {
    const items = await assetsUsecase.uploadSmallFiles(cleanFiles, lastModified, groupId, saveToPersonal, req.user);
    return res.json({ ok: true, count: items.length, items });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 6. GET danh sách albums
router.get('/albums', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const groupId = req.query.groupId ? String(req.query.groupId) : null;

  try {
    const items = await assetsUsecase.listUserAlbums(req.user.sub, groupId);
    return res.json({ items });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 7. GET danh sách project tài liệu
router.get('/doc-projects', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const groupId = req.query.groupId ? String(req.query.groupId) : null;

  try {
    const items = await assetsUsecase.listUserDocProjects(req.user.sub, groupId);
    return res.json({ items });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 8. POST gán album hàng loạt (Bulk)
router.post('/bulk/album', requireAuth, checkBulkOwnership, async (req: Request, res: Response) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const albumName = String(req.body?.albumName || '').trim();

  try {
    const result = await assetsUsecase.assignBulkAlbum(ids, albumName);
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 9. POST gán project tài liệu hàng loạt (Bulk)
router.post('/bulk/doc-project', requireAuth, checkBulkOwnership, async (req: Request, res: Response) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const projectName = String(req.body?.projectName || '').trim();

  try {
    const result = await assetsUsecase.assignBulkDocProject(ids, projectName);
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 10. POST bỏ vào thùng rác hàng loạt (Bulk)
router.post('/bulk/trash', requireAuth, checkBulkOwnership, async (req: Request, res: Response) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  try {
    const result = await assetsUsecase.moveBulkToTrash(ids);
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 11. POST khôi phục hàng loạt từ thùng rác (Bulk)
router.post('/bulk/restore', requireAuth, checkBulkOwnership, async (req: Request, res: Response) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  try {
    const result = await assetsUsecase.restoreBulkFromTrash(ids);
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 12. POST xóa vĩnh viễn hàng loạt (Bulk)
router.post('/bulk/purge', requireAuth, checkBulkOwnership, async (req: Request, res: Response) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const result = await assetsUsecase.purgeBulkAssets(ids, req.bulkAssets || [], req.user.sub);
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 13. GET playlist master HLS (.m3u8)
router.get('/_media/hls/:id/master.m3u8', requireAuth, checkAssetOwnership, async (req: Request, res: Response) => {
  try {
    const asset = req.asset as Asset;
    const hlsMasterAbs = getHlsAbsPathFromAsset(asset);
    if (!hlsMasterAbs || !fs.existsSync(hlsMasterAbs)) {
      return res.status(404).json({ message: 'HLS not ready' });
    }

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-store');
    return res.sendFile(hlsMasterAbs);
  } catch (e: any) {
    return res.status(500).json({ message: e.message });
  }
});

// 14. GET phân đoạn HLS segment (.ts hoặc .m3u8 phụ)
router.get('/_media/hls/:id/:segment', requireAuth, checkAssetOwnership, async (req: Request, res: Response) => {
  try {
    const asset = req.asset as Asset;
    const hlsDir = getHlsDirAbsPathFromAsset(asset);
    if (!hlsDir || !fs.existsSync(hlsDir)) return res.status(404).json({ message: 'HLS not ready' });

    const seg = path.basename(req.params.segment || '');
    if (!seg || (!seg.endsWith('.ts') && !seg.endsWith('.m3u8'))) {
      return res.status(400).json({ message: 'Invalid segment' });
    }

    const abs = path.join(hlsDir, seg);
    if (!fs.existsSync(abs)) return res.status(404).json({ message: 'Segment missing' });

    if (seg.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-store');
    } else {
      res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Cache-Control', 'private, max-age=86400, immutable');
    }

    return res.sendFile(abs);
  } catch (e: any) {
    return res.status(500).json({ message: e.message });
  }
});

// 15. GET file xem trực tiếp (Playable MP4)
router.get('/_media/play/:id', requireAuth, checkAssetOwnership, async (req: Request, res: Response) => {
  try {
    const asset = req.asset as Asset;
    const playAbs = getPlayableAbsPathFromAsset(asset);
    if (!playAbs || !fs.existsSync(playAbs)) {
      return res.redirect(`/api/assets/_media/original/${asset.id}`);
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(asset.originalName || 'video')}.mp4"`);
    res.setHeader('Cache-Control', 'private, max-age=86400, immutable');
    return res.sendFile(playAbs);
  } catch (e: any) {
    return res.status(500).json({ message: e.message });
  }
});

// 16. GET tải/xem file gốc (Original file)
router.get('/_media/original/:id', requireAuth, checkAssetOwnership, async (req: Request, res: Response) => {
  try {
    const asset = req.asset as Asset;
    const abs = getAbsPathFromAsset(asset);
    if (!fs.existsSync(abs)) return res.status(404).json({ message: 'File missing' });

    res.setHeader('Content-Type', asset.mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(asset.originalName || 'file')}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.sendFile(abs);
  } catch (e: any) {
    return res.status(500).json({ message: e.message });
  }
});

// 17. PUT cập nhật album của 1 asset
router.put('/:id/albums', requireAuth, checkAssetOwnership, async (req: Request, res: Response) => {
  const albumNames = Array.isArray(req.body?.albumNames) ? req.body.albumNames : [];
  try {
    const result = await assetsUsecase.updateAssetAlbums(req.params.id, albumNames);
    return res.json({ ok: true, ...result });
  } catch (e: any) {
    if (e instanceof DomainError) {
      return res.status(e.statusCode).json({ message: e.message });
    }
    return res.status(500).json({ message: e.message });
  }
});

// 17b. PUT cập nhật tập tài liệu (doc projects) của 1 asset
router.put('/:id/doc-projects', requireAuth, checkAssetOwnership, async (req: Request, res: Response) => {
  const projectNames = Array.isArray(req.body?.projectNames) ? req.body.projectNames : [];
  try {
    const result = await assetsUsecase.updateAssetDocProjects(req.params.id, projectNames);
    return res.json({ ok: true, ...result });
  } catch (e: any) {
    if (e instanceof DomainError) {
      return res.status(e.statusCode).json({ message: e.message });
    }
    return res.status(500).json({ message: e.message });
  }
});

// 18. GET danh sách nhãn (Tags)
router.get('/tags', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const groupId = req.query.groupId ? String(req.query.groupId) : null;

  try {
    const items = await assetsUsecase.listUserTags(req.user.sub, groupId);
    return res.json({ ok: true, items });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 19. PUT cập nhật nhãn của 1 asset
router.put('/:id/tags', requireAuth, checkAssetOwnership, async (req: Request, res: Response) => {
  const tags = Array.isArray(req.body?.tags) ? req.body.tags : [];
  try {
    const result = await assetsUsecase.updateAssetTags(req.params.id, tags);
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 19b. POST chia sẻ tệp tin hàng loạt vào nhóm (Nhân bản metadata)
router.post('/bulk/share', requireAuth, checkBulkOwnership, async (req: Request, res: Response) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const { groupId } = req.body || {};
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const { sharedCount } = await assetsUsecase.bulkShareToGroup(ids, groupId, req.user.sub);
    return res.json({ ok: true, sharedCount });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 19c. GET thống kê hợp nhất cho Dashboard
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const groupId = req.query.groupId ? String(req.query.groupId) : undefined;
  try {
    const storage = await getStorageUsage();
    const stats = await getUnifiedStats(req.user.sub, storage, groupId || null);
    return res.json(stats);
  } catch (e: any) {
    return res.status(500).json({ message: e.message });
  }
});

// 19e. GET danh sách toàn bộ asset IDs đang ở trạng thái processing của user hoặc nhóm hiện tại
router.get('/processing', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const groupId = req.query.groupId ? String(req.query.groupId) : undefined;

  try {
    const ids = await assetsUsecase.getProcessingAssets(groupId, req.user.sub);
    return res.json({ ok: true, ids });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 19d. GET kiểm tra nhanh trạng thái xử lý (processing status) của danh sách asset IDs
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  const idsInput = String(req.query.ids || '').trim();
  if (!idsInput) {
    return res.status(400).json({ message: 'Ids list is required (ids=id1,id2,...)' });
  }

  const ids = filterValidUUIDs(idsInput.split(','));
  if (ids.length === 0) {
    return res.status(400).json({ message: 'Ids list does not contain valid UUIDs' });
  }

  try {
    const statuses = await assetsUsecase.getAssetsStatus(ids, req.user!.sub);
    return res.json({ ok: true, statuses });
  } catch (e: any) {
    return res.status(500).json({ message: e.message });
  }
});

// 20. GET thông tin chi tiết của 1 asset
router.get('/:id', requireAuth, checkAssetOwnership, async (req: Request, res: Response) => {
  return res.json(req.asset);
});

// 21. PUT cập nhật nội dung tệp (Write content với OCC)
router.put('/:id/content', requireAuth, checkAssetOwnership, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { content, version } = req.body || {};

  if (typeof content !== 'string') {
    return res.status(400).json({ message: 'Content must be a string' });
  }
  if (typeof version !== 'number') {
    return res.status(400).json({ message: 'Version number must be a number' });
  }

  const asset = req.asset!;
  if (asset.isDeleted) {
    return res.status(400).json({ message: 'Cannot modify a file that is in the trash.' });
  }
  if (!isEditableTextAsset(asset)) {
    return res.status(400).json({ message: 'This file type is not editable.' });
  }

  const currentAbsPath = getAbsPathFromAsset(asset);

  // OCC: check version
  if (version !== asset.version) {
    let serverContent = '';
    try {
      let activeExists = false;
      try {
        await fs.promises.access(currentAbsPath, fs.constants.F_OK);
        activeExists = true;
      } catch {}
      if (activeExists) {
        serverContent = await fs.promises.readFile(currentAbsPath, 'utf8');
      }
    } catch (e: any) {
      console.error('[OCC] Error reading server content:', e.message);
    }
    return res.status(409).json({
      message: 'Conflict',
      serverContent,
    });
  }

  const client = await db.pool.connect();
  let tempFilePath = '';
  let backupAbsPath = '';
  try {
    // 1. Chuẩn bị thư mục và đường dẫn sao lưu
    const versionsDir = path.join(LIBRARY_PATH, 'derived', 'versions', id);
    await fs.promises.mkdir(versionsDir, { recursive: true });

    const backupFileName = `${asset.version}.bin`;
    backupAbsPath = path.join(versionsDir, backupFileName);

    // 2. Ghi nội dung mới vào tệp tạm để đảm bảo an toàn giao dịch
    tempFilePath = currentAbsPath + '.tmp';
    await fs.promises.writeFile(tempFilePath, content, 'utf8');
    const tempStat = await fs.promises.stat(tempFilePath);
    const newSize = tempStat.size;

    await client.query('BEGIN');

    // Sao lưu file hiện tại thành một phiên bản cũ
    let activeExists = false;
    try {
      await fs.promises.access(currentAbsPath, fs.constants.F_OK);
      activeExists = true;
    } catch {}

    if (activeExists) {
      await fs.promises.copyFile(currentAbsPath, backupAbsPath);
    } else {
      await fs.promises.writeFile(currentAbsPath, '', 'utf8');
      await fs.promises.copyFile(currentAbsPath, backupAbsPath);
    }

    const backupRelPath = path.relative(LIBRARY_PATH, backupAbsPath).replaceAll('\\', '/');
    const backupStat = await fs.promises.stat(backupAbsPath);
    const backupSize = backupStat.size;

    const versionId = crypto.randomUUID();
    const versionCreator = asset.lastModifiedById || asset.ownerId;
    await client.query(`
      INSERT INTO asset_versions (id, asset_id, version_number, rel_path, size, created_at, created_by)
      VALUES ($1, $2, $3, $4, $5, NOW(), $6)
    `, [versionId, id, asset.version, backupRelPath, backupSize, versionCreator]);

    // 3. Cập nhật thông tin asset chính
    const nextVersion = asset.version + 1;
    const nowStr = new Date().toISOString();
    const updateRes = await client.query(`
      UPDATE assets
      SET version = version + 1, size = $1, uploaded_at = $2, last_modified_by = $3
      WHERE id = $4 AND version = $5
    `, [newSize, nowStr, req.user!.sub, id, asset.version]);

    if (updateRes.rowCount === 0) {
      throw new Error('OCC_CONFLICT');
    }

    // Ghi nhận giao dịch DB thành công
    await client.query('COMMIT');

    // 4. Đổi tên tệp tạm thành tệp chính (hoạt động nguyên tử - atomic operation)
    await fs.promises.rename(tempFilePath, currentAbsPath);

    return res.json({ ok: true, version: nextVersion, size: newSize, uploadedAt: nowStr });
  } catch (err: any) {
    await client.query('ROLLBACK');
    
    // Dọn dẹp tệp rác khi rollback
    try {
      if (tempFilePath) {
        let tempExists = false;
        try {
          await fs.promises.access(tempFilePath, fs.constants.F_OK);
          tempExists = true;
        } catch {}
        if (tempExists) await fs.promises.unlink(tempFilePath);
      }
      if (backupAbsPath) {
        let backupExists = false;
        try {
          await fs.promises.access(backupAbsPath, fs.constants.F_OK);
          backupExists = true;
        } catch {}
        if (backupExists) await fs.promises.unlink(backupAbsPath);
      }
    } catch (fsErr: any) {
      console.error('[Rollback Cleanup] Error cleaning up files:', fsErr.message);
    }

    if (err.message === 'OCC_CONFLICT') {
      let serverContent = '';
      try {
        let activeExists = false;
        try {
          await fs.promises.access(currentAbsPath, fs.constants.F_OK);
          activeExists = true;
        } catch {}
        if (activeExists) {
          serverContent = await fs.promises.readFile(currentAbsPath, 'utf8');
        }
      } catch {}
      return res.status(409).json({
        message: 'Conflict',
        serverContent,
      });
    }
    return res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

router.get('/:id/versions', requireAuth, checkAssetOwnership, async (req: Request, res: Response) => {
  const { id } = req.params;
  const asset = req.asset!;
  try {
    const activeUserRes = await db.query(`
      SELECT name FROM users WHERE id = $1
    `, [asset.lastModifiedById || asset.ownerId]);
    const activeUserName = activeUserRes.rows[0]?.name || 'Unknown';

    const activeItem = {
      versionNumber: asset.version,
      size: asset.size,
      createdAt: asset.uploadedAt || new Date().toISOString(),
      createdBy: {
        id: asset.lastModifiedById || asset.ownerId,
        name: activeUserName,
      },
      isActive: true,
    };

    const queryRes = await db.query(`
      SELECT av.version_number, av.size, av.created_at, u.id AS user_id, u.name AS user_name
      FROM asset_versions av
      LEFT JOIN users u ON av.created_by = u.id
      WHERE av.asset_id = $1
      ORDER BY av.version_number DESC
    `, [id]);

    const historyItems = queryRes.rows.map((row: any) => ({
      versionNumber: row.version_number,
      size: Number(row.size),
      createdAt: new Date(row.created_at).toISOString(),
      createdBy: row.user_id ? {
        id: row.user_id,
        name: row.user_name || 'Unknown',
      } : null,
      isActive: false,
    }));

    return res.json({ ok: true, items: [activeItem, ...historyItems] });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 22b. GET nội dung của một phiên bản cụ thể
router.get('/:id/versions/:versionNumber/content', requireAuth, checkAssetOwnership, async (req: Request, res: Response) => {
  const { id, versionNumber } = req.params;
  const targetVer = Number(versionNumber);

  if (Number.isNaN(targetVer)) {
    return res.status(400).json({ message: 'Invalid version number' });
  }

  const asset = req.asset!;
  if (!isEditableTextAsset(asset)) {
    return res.status(400).json({ message: 'This file type is not editable.' });
  }

  const currentAbsPath = getAbsPathFromAsset(asset);

  try {
    // Nếu yêu cầu phiên bản đang hoạt động hiện tại (active)
    if (targetVer === asset.version) {
      let content = '';
      let activeExists = false;
      try {
        await fs.promises.access(currentAbsPath, fs.constants.F_OK);
        activeExists = true;
      } catch {}
      if (activeExists) {
        content = await fs.promises.readFile(currentAbsPath, 'utf8');
      }
      return res.json({ ok: true, versionNumber: targetVer, content });
    }

    // Truy vấn file backup trong db
    const targetRes = await db.query(`
      SELECT * FROM asset_versions
      WHERE asset_id = $1 AND version_number = $2
    `, [id, targetVer]);

    if (targetRes.rows.length === 0) {
      return res.status(404).json({ message: `Version ${targetVer} not found` });
    }

    const targetVerRow = targetRes.rows[0];
    const targetAbsPath = path.join(LIBRARY_PATH, targetVerRow.rel_path);

    let backupExists = false;
    try {
      await fs.promises.access(targetAbsPath, fs.constants.F_OK);
      backupExists = true;
    } catch {}

    if (!backupExists) {
      return res.status(410).json({ message: 'Version backup file is missing on disk' });
    }

    const content = await fs.promises.readFile(targetAbsPath, 'utf8');
    return res.json({ ok: true, versionNumber: targetVer, content });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 23. POST khôi phục tệp về một phiên bản lịch sử cụ thể
router.post('/:id/versions/:versionNumber/restore', requireAuth, checkAssetOwnership, async (req: Request, res: Response) => {
  const { id, versionNumber } = req.params;
  const targetVer = Number(versionNumber);

  if (Number.isNaN(targetVer)) {
    return res.status(400).json({ message: 'Invalid version number' });
  }

  const asset = req.asset!;
  if (asset.isDeleted) {
    return res.status(400).json({ message: 'Cannot modify a file that is in the trash.' });
  }
  if (!isEditableTextAsset(asset)) {
    return res.status(400).json({ message: 'This file type is not editable.' });
  }

  const currentAbsPath = getAbsPathFromAsset(asset);

  // Manual write permission check for POST restore method
  if (asset.groupId) {
    const isCreator = asset.ownerId === req.user!.sub;
    const isManager = req.groupRole === 'owner' || req.groupRole === 'admin';
    if (!isCreator && !isManager) {
      return res.status(403).json({ message: 'Only contributors or group admins can modify this file' });
    }
  } else {
    if (asset.ownerId !== req.user!.sub) {
      return res.status(403).json({ message: 'You do not have permission to edit this file' });
    }
  }

  // 1. Kiểm tra sự tồn tại của phiên bản đích
  const targetRes = await db.query(`
    SELECT * FROM asset_versions
    WHERE asset_id = $1 AND version_number = $2
  `, [id, targetVer]);

  if (targetRes.rows.length === 0) {
    return res.status(404).json({ message: `Version ${targetVer} not found` });
  }

  const targetVerRow = targetRes.rows[0];
  const targetAbsPath = path.join(LIBRARY_PATH, targetVerRow.rel_path);

  let targetExists = false;
  try {
    await fs.promises.access(targetAbsPath, fs.constants.F_OK);
    targetExists = true;
  } catch {}

  if (!targetExists) {
    return res.status(410).json({ message: 'Target version backup file has been deleted or is missing on disk' });
  }

  const client = await db.pool.connect();
  let tempFilePath = '';
  let backupAbsPath = '';
  try {
    // 2. Chuẩn bị thư mục và đường dẫn sao lưu
    const versionsDir = path.join(LIBRARY_PATH, 'derived', 'versions', id);
    await fs.promises.mkdir(versionsDir, { recursive: true });

    const backupFileName = `${asset.version}.bin`;
    backupAbsPath = path.join(versionsDir, backupFileName);

    // Ghi nội dung của phiên bản cần phục hồi vào tệp tạm trước
    tempFilePath = currentAbsPath + '.tmp';
    await fs.promises.copyFile(targetAbsPath, tempFilePath);
    const tempStat = await fs.promises.stat(tempFilePath);
    const newSize = tempStat.size;

    await client.query('BEGIN');

    // Sao lưu bản hiện tại trước khi ghi đè
    let activeExists = false;
    try {
      await fs.promises.access(currentAbsPath, fs.constants.F_OK);
      activeExists = true;
    } catch {}

    if (activeExists) {
      await fs.promises.copyFile(currentAbsPath, backupAbsPath);
    } else {
      await fs.promises.writeFile(currentAbsPath, '', 'utf8');
      await fs.promises.copyFile(currentAbsPath, backupAbsPath);
    }

    const backupRelPath = path.relative(LIBRARY_PATH, backupAbsPath).replaceAll('\\', '/');
    const backupStat = await fs.promises.stat(backupAbsPath);
    const backupSize = backupStat.size;

    const versionId = crypto.randomUUID();
    const versionCreator = asset.lastModifiedById || asset.ownerId;
    await client.query(`
      INSERT INTO asset_versions (id, asset_id, version_number, rel_path, size, created_at, created_by)
      VALUES ($1, $2, $3, $4, $5, NOW(), $6)
    `, [versionId, id, asset.version, backupRelPath, backupSize, versionCreator]);

    // 4. Tăng version chính của asset lên
    const nextVersion = asset.version + 1;
    const nowStr = new Date().toISOString();
    const updateRes = await client.query(`
      UPDATE assets
      SET version = version + 1, size = $1, uploaded_at = $2, last_modified_by = $3
      WHERE id = $4 AND version = $5
    `, [newSize, nowStr, req.user!.sub, id, asset.version]);

    if (updateRes.rowCount === 0) {
      throw new Error('OCC_CONFLICT');
    }

    // Ghi nhận giao dịch DB thành công
    await client.query('COMMIT');

    // Đổi tên tệp tạm thành tệp chính (hoạt động nguyên tử)
    await fs.promises.rename(tempFilePath, currentAbsPath);

    return res.json({ ok: true, version: nextVersion, size: newSize, uploadedAt: nowStr });
  } catch (err: any) {
    await client.query('ROLLBACK');

    // Dọn dẹp tệp rác khi rollback
    try {
      if (tempFilePath) {
        let tempExists = false;
        try {
          await fs.promises.access(tempFilePath, fs.constants.F_OK);
          tempExists = true;
        } catch {}
        if (tempExists) await fs.promises.unlink(tempFilePath);
      }
      if (backupAbsPath) {
        let backupExists = false;
        try {
          await fs.promises.access(backupAbsPath, fs.constants.F_OK);
          backupExists = true;
        } catch {}
        if (backupExists) await fs.promises.unlink(backupAbsPath);
      }
    } catch (fsErr: any) {
      console.error('[Rollback Cleanup] Error cleaning up files:', fsErr.message);
    }

    if (err.message === 'OCC_CONFLICT') {
      return res.status(409).json({ message: 'Conflict: The file has been modified by another process. Please reload and try again.' });
    }
    return res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

export default router;
