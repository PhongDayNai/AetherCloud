import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import crypto from 'crypto';
import { requireAuth } from '../middleware/requireAuth';
import * as db from '../lib/db';
import {
  saveUploadedFile,
  listAssets,
  getAsset,
  getAbsPathFromAsset,
  getPlayableAbsPathFromAsset,
  getHlsAbsPathFromAsset,
  getHlsDirAbsPathFromAsset,
  listAlbums,
  assignAlbum,
  setAssetAlbums,
  listTags,
  setAssetTags,
  listDocProjects,
  assignDocProject,
  setAssetDocProjects,
  moveToTrash,
  restoreFromTrash,
  purgeDeleted,
  Asset,
  getUnifiedStats,
} from '../lib/assets';
import { getStorageUsage } from '../lib/storage';
import { isValidUUID, filterValidUUIDs, isGroupMember, getGroupMemberRole } from '../lib/utils';

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
  try {
    const asset = await getAsset(id);
    if (!asset) return res.status(404).json({ message: 'Không tìm thấy tệp tin' });
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    if (asset.groupId) {
      // Kiểm tra quyền thành viên nhóm
      const memberRes = await db.query(
        'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
        [asset.groupId, req.user.sub]
      );
      if (memberRes.rows.length === 0) {
        return res.status(403).json({ message: 'Bạn không có quyền truy cập tệp tin thuộc nhóm này' });
      }
      req.groupRole = memberRes.rows[0].role;
    } else {
      // Kiểm tra sở hữu cá nhân
      if (asset.ownerId !== req.user.sub) {
        return res.status(403).json({ message: 'Bạn không có quyền truy cập tệp tin này' });
      }
    }

    // Nếu là thao tác chỉnh sửa/xóa (PUT/DELETE/PATCH)
    const isWrite = ['PUT', 'DELETE', 'PATCH'].includes(req.method);
    if (isWrite) {
      if (asset.groupId) {
        const isCreator = asset.ownerId === req.user.sub;
        const isManager = req.groupRole === 'owner' || req.groupRole === 'admin';
        if (!isCreator && !isManager) {
          return res.status(403).json({ message: 'Chỉ người đóng góp hoặc quản trị viên nhóm mới có quyền thay đổi tệp tin này' });
        }
      } else {
        if (asset.ownerId !== req.user.sub) {
          return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa tệp tin này' });
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
  if (!ids.length) return res.status(400).json({ message: 'Danh sách ids không chứa UUID hợp lệ' });
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const assetsRes = await db.query(
      'SELECT id, owner_id, group_id, is_deleted FROM assets WHERE id = ANY($1)',
      [ids]
    );
    if (assetsRes.rows.length !== ids.length) {
      return res.status(404).json({ message: 'Một số tệp tin không tồn tại hoặc ID không hợp lệ' });
    }

    const verifiedAssets: any[] = [];
    for (const asset of assetsRes.rows) {
      let role: string | null = null;
      if (asset.group_id) {
        role = await getGroupMemberRole(asset.group_id, req.user.sub);
        if (!role) {
          return res.status(403).json({ message: 'Bạn không có quyền thao tác trên một số tệp tin của nhóm' });
        }
        const isCreator = asset.owner_id === req.user.sub;
        const isManager = role === 'owner' || role === 'admin';
        if (!isCreator && isManager) {
          verifiedAssets.push({ ...asset, groupRole: role });
          continue; // Người quản trị nhóm có quyền thao tác trên tệp tin của thành viên khác
        }
        if (!isCreator && !isManager) {
          return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa hoặc xóa tệp tin của thành viên khác' });
        }
      } else {
        if (asset.owner_id !== req.user.sub) {
          return res.status(403).json({ message: 'Bạn không có quyền thao tác trên một số tệp tin cá nhân của người khác' });
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
      // Nếu lọc theo nhóm, xác minh quyền thành viên nhóm của user hiện tại
      if (groupId) {
        if (groupId && !isValidUUID(groupId)) {
          return res.status(400).json({ message: 'groupId không đúng định dạng UUID' });
        }
        if (!(await isGroupMember(groupId, req.user.sub))) {
          return res.status(403).json({ message: 'Bạn không có quyền truy cập tệp tin của nhóm này' });
        }
      }

      const items = await listAssets(limit, {
        includeTrash,
        onlyTrash,
        owner: req.user.sub,
        cursor,
        type,
        subType,
        category,
        album,
        tag,
        docProject,
        groupId
      });

      let nextCursor: string | null = null;
      if (items.length > 0 && items.length === limit) {
        const lastItem = items[items.length - 1];
        const cursorObj = { takenAt: lastItem.takenAt, id: lastItem.id };
        nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString('base64');
      }

      return res.json({ items, nextCursor });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // 2. POST khởi tạo session upload chunk
  router.post('/upload-chunk/init', requireAuth, async (req: Request, res: Response) => {
    const { fileName, mime, totalSize, lastModified, groupId, saveToPersonal } = req.body || {};
    if (!fileName || !mime) return res.status(400).json({ message: 'fileName and mime are required' });
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    // Xác minh quyền thành viên nhóm nếu upload vào nhóm
    if (groupId) {
      if (!isValidUUID(groupId)) {
        return res.status(400).json({ message: 'groupId không đúng định dạng UUID' });
      }
      try {
        if (!(await isGroupMember(groupId, req.user.sub))) {
          return res.status(403).json({ message: 'Bạn không có quyền tải tệp lên nhóm này' });
        }
      } catch (e: any) {
        return res.status(500).json({ message: e.message });
      }
    }

    const uploadId = crypto.randomUUID();
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

      // Xác minh lại quyền thành viên nhóm (phòng ngừa TOCTOU khi thành viên bị trục xuất trong lúc upload)
      if (session.groupId) {
        if (!(await isGroupMember(session.groupId, req.user?.sub))) {
          return res.status(403).json({ message: 'Bạn không còn là thành viên của nhóm này' });
        }
      }

      let saved: Asset;
      if (session.groupId) {
        // 1. Tải lên nhóm
        saved = await saveUploadedFile(fileData, req.user, session.groupId, true);

        // 2. Nhân bản sang cá nhân nếu tích chọn
        if (session.saveToPersonal) {
          await saveUploadedFile(fileData, req.user, null, true);
        }
      } else {
        // Tải lên cá nhân
        saved = await saveUploadedFile(fileData, req.user, null, true);
      }

      try { fs.rmSync(session.chunkDir, { recursive: true, force: true }); } catch { }
      chunkSessions.delete(req.params.uploadId);

      return res.json({ ok: true, item: saved });
    } catch (e: any) {
      try { if (fs.existsSync(merged)) fs.unlinkSync(merged); } catch { }
      return res.status(500).json({ message: e.message });
    }
  });

  // 5. POST upload thông thường (cho các file nhỏ)
  router.post('/upload', requireAuth, upload.array('files', 50), async (req: Request, res: Response) => {
    const files = (req.files as Express.Multer.File[]) || [];
    const lastModified = req.body.lastModified ? Number(req.body.lastModified) : null;
    const groupId = req.body.groupId || null;
    const saveToPersonal = String(req.body.saveToPersonal) === 'true';

    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    // Xác minh quyền thành viên nhóm nếu uploader vào nhóm
    if (groupId) {
      if (!isValidUUID(groupId)) {
        return res.status(400).json({ message: 'groupId không đúng định dạng UUID' });
      }
      try {
        if (!(await isGroupMember(groupId, req.user.sub))) {
          return res.status(403).json({ message: 'Bạn không quyền tải tệp lên nhóm này' });
        }
      } catch (e: any) {
        return res.status(500).json({ message: e.message });
      }
    }

    try {
      const saved: Asset[] = [];
      for (const f of files) {
        const fileData = { ...f, lastModified };
        if (groupId) {
          // 1. Tải lên nhóm
          const savedAsset = await saveUploadedFile(fileData, req.user, groupId, true);
          saved.push(savedAsset);

          // 2. Nhân bản sang cá nhân nếu tích chọn
          if (saveToPersonal) {
            await saveUploadedFile(fileData, req.user, null, true);
          }
        } else {
          // Tải lên cá nhân
          const savedAsset = await saveUploadedFile(fileData, req.user, null, true);
          saved.push(savedAsset);
        }
      }
      return res.json({ ok: true, count: saved.length, items: saved });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // 6. GET danh sách albums
  router.get('/albums', requireAuth, async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const groupId = req.query.groupId ? String(req.query.groupId) : undefined;

    if (groupId) {
      if (!isValidUUID(groupId)) {
        return res.status(400).json({ message: 'groupId không đúng định dạng UUID' });
      }
      const isMember = await isGroupMember(groupId, req.user.sub);
      if (!isMember) {
        return res.status(403).json({ message: 'Bạn không có quyền truy cập thông tin nhóm này' });
      }
    }

    try {
      const items = await listAlbums(req.user.sub, groupId || null);
      return res.json({ items });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // 7. GET danh sách project tài liệu
  router.get('/doc-projects', requireAuth, async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const groupId = req.query.groupId ? String(req.query.groupId) : undefined;

    if (groupId) {
      if (!isValidUUID(groupId)) {
        return res.status(400).json({ message: 'groupId không đúng định dạng UUID' });
      }
      const isMember = await isGroupMember(groupId, req.user.sub);
      if (!isMember) {
        return res.status(403).json({ message: 'Bạn không có quyền truy cập thông tin nhóm này' });
      }
    }

    try {
      const items = await listDocProjects(req.user.sub, groupId || null);
      return res.json({ items });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // 8. POST gán album hàng loạt (Bulk)
  router.post('/bulk/album', requireAuth, checkBulkOwnership, async (req: Request, res: Response) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const albumName = String(req.body?.albumName || '').trim();
    if (!albumName) return res.status(400).json({ message: 'albumName is required' });

    try {
      const result = await assignAlbum(ids, albumName);
      return res.json({ ok: true, ...result });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // 9. POST gán project tài liệu hàng loạt (Bulk)
  router.post('/bulk/doc-project', requireAuth, checkBulkOwnership, async (req: Request, res: Response) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const projectName = String(req.body?.projectName || '').trim();
    if (!projectName) return res.status(400).json({ message: 'projectName is required' });

    try {
      const result = await assignDocProject(ids, projectName);
      return res.json({ ok: true, ...result });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // 10. POST bỏ vào thùng rác hàng loạt (Bulk)
  router.post('/bulk/trash', requireAuth, checkBulkOwnership, async (req: Request, res: Response) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    try {
      const result = await moveToTrash(ids);
      return res.json({ ok: true, ...result });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // 11. POST khôi phục hàng loạt từ thùng rác (Bulk)
  router.post('/bulk/restore', requireAuth, checkBulkOwnership, async (req: Request, res: Response) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    try {
      const result = await restoreFromTrash(ids);
      return res.json({ ok: true, ...result });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // 12. POST xóa vĩnh viễn hàng loạt (Bulk)
  router.post('/bulk/purge', requireAuth, checkBulkOwnership, async (req: Request, res: Response) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    try {
      // Tái sử dụng danh sách assets đã được checkBulkOwnership xác thực và gán vai trò nhóm
      const assets = req.bulkAssets || [];
      for (const asset of assets) {
        if (asset.group_id) {
          if (asset.groupRole !== 'owner') {
            return res.status(403).json({ message: 'Chỉ chủ sở hữu nhóm mới có quyền xóa vĩnh viễn các tệp tin trong nhóm' });
          }
        } else {
          if (asset.owner_id !== req.user.sub) {
            return res.status(403).json({ message: 'Bạn không có quyền xóa vĩnh viễn tệp tin cá nhân của người khác' });
          }
        }
      }

      const result = await purgeDeleted(ids);
      return res.json({ ok: true, ...result });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
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
      const result = await setAssetAlbums(req.params.id, albumNames);
      if (result.updated === 0) return res.status(404).json({ message: 'Asset not found' });
      return res.json({ ok: true, ...result });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // 17b. PUT cập nhật tập tài liệu (doc projects) của 1 asset
  router.put('/:id/doc-projects', requireAuth, checkAssetOwnership, async (req: Request, res: Response) => {
    const projectNames = Array.isArray(req.body?.projectNames) ? req.body.projectNames : [];
    try {
      const result = await setAssetDocProjects(req.params.id, projectNames);
      if (result.updated === 0) return res.status(404).json({ message: 'Không tìm thấy tài liệu hoặc định dạng không đúng' });
      return res.json({ ok: true, ...result });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // 18. GET danh sách nhãn (Tags)
  router.get('/tags', requireAuth, async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const groupId = req.query.groupId ? String(req.query.groupId) : undefined;

    if (groupId) {
      if (!isValidUUID(groupId)) {
        return res.status(400).json({ message: 'groupId không đúng định dạng UUID' });
      }
      const isMember = await isGroupMember(groupId, req.user.sub);
      if (!isMember) {
        return res.status(403).json({ message: 'Bạn không có quyền truy cập thông tin nhóm này' });
      }
    }

    try {
      const items = await listTags(req.user.sub, groupId || null);
      return res.json({ ok: true, items });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // 19. PUT cập nhật nhãn của 1 asset
  router.put('/:id/tags', requireAuth, checkAssetOwnership, async (req: Request, res: Response) => {
    const tags = Array.isArray(req.body?.tags) ? req.body.tags : [];
    try {
      const result = await setAssetTags(req.params.id, tags);
      if (result.updated === 0) return res.status(404).json({ message: 'Asset not found' });
      return res.json({ ok: true, ...result });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // 19b. POST chia sẻ tệp tin hàng loạt vào nhóm (Nhân bản metadata)
  router.post('/bulk/share', requireAuth, checkBulkOwnership, async (req: Request, res: Response) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const { groupId } = req.body || {};
    if (!groupId) return res.status(400).json({ message: 'groupId là bắt buộc' });

    // Xác thực định dạng UUID của groupId đầu vào
    if (!isValidUUID(groupId)) {
      return res.status(400).json({ message: 'groupId không đúng định dạng UUID' });
    }

    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    // Lọc chỉ giữ lại các ID asset đúng định dạng UUID để tránh lỗi syntax DB
    const validIds = filterValidUUIDs(ids);

    try {
      // Kiểm tra quyền thành viên nhóm nhận chia sẻ
      if (!(await isGroupMember(groupId, req.user.sub))) {
        return res.status(403).json({ message: 'Bạn không phải là thành viên của nhóm nhận chia sẻ' });
      }

      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');
        let sharedCount = 0;

        for (const aid of validIds) {
          // Lấy asset gốc (chỉ cho phép các tệp tin đang hoạt động, không nằm trong thùng rác)
          const assetRes = await client.query('SELECT * FROM assets WHERE id = $1 AND is_deleted = false', [aid]);
          if (assetRes.rows.length === 0) continue;
          const original = assetRes.rows[0];

          // Kiểm tra xem tệp tin này đã được chia sẻ vào nhóm đó chưa (tránh trùng lặp)
          const dupRes = await client.query(
            'SELECT 1 FROM assets WHERE group_id = $1 AND rel_path = $2 AND is_deleted = false LIMIT 1',
            [groupId, original.rel_path]
          );
          if (dupRes.rows.length > 0) continue; // Bỏ qua nếu đã chia sẻ

          // Tạo asset mới chia sẻ vào nhóm
          const newId = crypto.randomUUID();
          await client.query(`
          INSERT INTO assets (
            id, original_name, mime, size, owner_id, group_id, uploaded_at, taken_at, rel_path,
            play_rel_path, hls_rel_path, processing_status, processing_started_at,
            processing_finished_at, ext, album_name, album_names, doc_project_name,
            doc_project_names, tags, is_deleted, deleted_at, is_library, type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        `, [
            newId, original.original_name, original.mime, original.size, req.user.sub, groupId,
            new Date().toISOString(), original.taken_at, original.rel_path, original.play_rel_path, original.hls_rel_path,
            original.processing_status, original.processing_started_at, original.processing_finished_at,
            original.ext, null, '{}', null, '{}', original.tags, false, null, true, original.type
          ]);
          sharedCount++;
        }

        await client.query('COMMIT');
        return res.json({ ok: true, sharedCount });
      } catch (err: any) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
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

    // Xác minh định dạng UUID của groupId nếu được gửi lên để tránh lỗi DB query
    if (groupId && !isValidUUID(groupId)) {
      return res.status(400).json({ message: 'groupId không đúng định dạng UUID' });
    }

    try {
      let result;
      if (groupId) {
        // Xác minh quyền thành viên nhóm
        if (!(await isGroupMember(groupId, req.user.sub))) {
          return res.status(403).json({ message: 'Bạn không có quyền truy cập thông tin nhóm này' });
        }

        result = await db.query(
          `SELECT id FROM assets 
         WHERE group_id = $1 
           AND processing_status = 'processing' 
           AND is_deleted = false 
         ORDER BY uploaded_at DESC`,
          [groupId]
        );
      } else {
        result = await db.query(
          `SELECT id FROM assets 
         WHERE owner_id = $1 
           AND group_id IS NULL 
           AND processing_status = 'processing' 
           AND is_deleted = false 
         ORDER BY uploaded_at DESC`,
          [req.user.sub]
        );
      }

      const ids = result.rows.map(row => row.id);
      return res.json({ ok: true, ids });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // 19d. GET kiểm tra nhanh trạng thái xử lý (processing status) của danh sách asset IDs
  router.get('/status', requireAuth, async (req: Request, res: Response) => {
    const idsInput = String(req.query.ids || '').trim();
    if (!idsInput) {
      return res.status(400).json({ message: 'Danh sách ids là bắt buộc (ids=id1,id2,...)' });
    }

    // Lọc chỉ giữ lại các ID đúng định dạng UUID để tránh lỗi Postgres quăng Exception kiểu dữ liệu
    const ids = filterValidUUIDs(idsInput.split(','));
    if (ids.length === 0) {
      return res.status(400).json({ message: 'Danh sách ids không chứa UUID hợp lệ' });
    }

    try {
      // Chỉ cho phép xem trạng thái của các file thuộc sở hữu của user hoặc thuộc nhóm mà user là thành viên
      const result = await db.query(
        `SELECT id, processing_status, play_rel_path, hls_rel_path, owner_id, group_id 
       FROM assets 
       WHERE id = ANY($1)`,
        [ids]
      );

      // Filter xem người dùng có quyền đọc không
      const verifiedStatuses = [];
      for (const row of result.rows) {
        let hasAccess = false;
        if (row.group_id) {
          const memberRes = await db.query(
            'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
            [row.group_id, req.user?.sub]
          );
          if (memberRes.rows.length > 0) hasAccess = true;
        } else {
          if (row.owner_id === req.user?.sub) hasAccess = true;
        }

        if (hasAccess) {
          verifiedStatuses.push({
            id: row.id,
            processingStatus: row.processing_status,
            playRelPath: row.play_rel_path,
            hlsRelPath: row.hls_rel_path
          });
        }
      }

      return res.json({ ok: true, statuses: verifiedStatuses });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // 20. GET thông tin chi tiết của 1 asset
  router.get('/:id', requireAuth, checkAssetOwnership, async (req: Request, res: Response) => {
    return res.json(req.asset);
  });

  export default router;
