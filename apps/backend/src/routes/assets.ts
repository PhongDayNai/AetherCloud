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
  moveToTrash,
  restoreFromTrash,
  purgeDeleted,
  Asset,
} from '../lib/assets';

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
}

const chunkSessions = new Map<string, ChunkSession>();

// Middleware kiểm tra quyền sở hữu đối với 1 asset
async function checkAssetOwnership(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;
  try {
    const asset = await getAsset(id);
    if (!asset) return res.status(404).json({ message: 'Không tìm thấy tệp tin' });
    if (!req.user || asset.ownerId !== req.user.sub) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập tệp tin này' });
    }
    req.asset = asset; // Truyền asset đã query sang handler kế tiếp để tái sử dụng
    next();
  } catch (e: any) {
    return res.status(500).json({ message: e.message });
  }
}

// Middleware kiểm tra quyền sở hữu đối với danh sách bulk assets
async function checkBulkOwnership(req: Request, res: Response, next: NextFunction) {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  if (!ids.length) return res.status(400).json({ message: 'Danh sách ids là bắt buộc' });
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const checkRes = await db.query(
      'SELECT COUNT(*)::int AS count FROM assets WHERE id = ANY($1) AND owner_id = $2',
      [ids, req.user.sub]
    );
    if (checkRes.rows[0].count !== ids.length) {
      return res.status(403).json({ message: 'Bạn không có quyền thao tác trên một số tệp tin' });
    }
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
  try {
    const items = await listAssets(limit, { includeTrash, onlyTrash, owner: req.user.sub });
    return res.json({ items });
  } catch (e: any) {
    return res.status(500).json({ message: e.message });
  }
});

// 2. POST khởi tạo session upload chunk
router.post('/upload-chunk/init', requireAuth, (req: Request, res: Response) => {
  const { fileName, mime, totalSize, lastModified } = req.body || {};
  if (!fileName || !mime) return res.status(400).json({ message: 'fileName and mime are required' });

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

  await new Promise((resolve) => ws.on('finish', resolve));

  try {
    const stat = fs.statSync(merged);
    const saved = await saveUploadedFile(
      {
        path: merged,
        originalname: session.fileName,
        mimetype: session.mime,
        size: stat.size,
        lastModified: session.lastModified,
      },
      req.user
    );

    try { fs.rmSync(session.chunkDir, { recursive: true, force: true }); } catch {}
    chunkSessions.delete(req.params.uploadId);

    return res.json({ ok: true, item: saved });
  } catch (e: any) {
    try { if (fs.existsSync(merged)) fs.unlinkSync(merged); } catch {}
    return res.status(500).json({ message: e.message });
  }
});

// 5. POST upload thông thường (cho các file nhỏ)
router.post('/upload', requireAuth, upload.array('files', 50), async (req: Request, res: Response) => {
  const files = (req.files as Express.Multer.File[]) || [];
  const lastModified = req.body.lastModified ? Number(req.body.lastModified) : null;
  try {
    const saved = await Promise.all(files.map((f) => saveUploadedFile({ ...f, lastModified }, req.user)));
    return res.json({ ok: true, count: saved.length, items: saved });
  } catch (e: any) {
    return res.status(500).json({ message: e.message });
  }
});

// 6. GET danh sách albums
router.get('/albums', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const items = await listAlbums(req.user.sub);
    return res.json({ items });
  } catch (e: any) {
    return res.status(500).json({ message: e.message });
  }
});

// 7. GET danh sách project tài liệu
router.get('/doc-projects', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const items = await listDocProjects(req.user.sub);
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
  try {
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

// 18. GET danh sách nhãn (Tags)
router.get('/tags', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const items = await listTags(req.user.sub);
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

// 20. GET thông tin chi tiết của 1 asset
router.get('/:id', requireAuth, checkAssetOwnership, async (req: Request, res: Response) => {
  return res.json(req.asset);
});

export default router;
