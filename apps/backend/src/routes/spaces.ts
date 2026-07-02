import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import fs from 'fs';
import * as db from '../lib/db';
import { requireAuth } from '../middleware/requireAuth';
import { saveUploadedFile } from '../lib/assets';

const router = express.Router();
const tempDir = '/tmp/aethercloud-upload-spaces';
fs.mkdirSync(tempDir, { recursive: true });

const upload = multer({
  dest: tempDir,
  limits: {
    files: 10,
    fileSize: 100 * 1024 * 1024, // 100MB cho upload trực tiếp vào Space
  },
});

// Middleware kiểm tra quyền sở hữu đối với space
async function checkSpaceOwnership(req: Request, res: Response, next: NextFunction) {
  const { spaceId } = req.params;
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await db.query('SELECT * FROM spaces WHERE id = $1', [spaceId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy không gian con này' });
    }
    const space = result.rows[0];
    if (space.owner_id !== req.user.sub) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập không gian con này' });
    }
    req.space = space; // Lưu lại để dùng sau
    next();
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}

// 1. GET danh sách không gian con
router.get('/', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await db.query(
      'SELECT * FROM spaces WHERE owner_id = $1 ORDER BY created_at DESC',
      [req.user.sub]
    );
    return res.json({ ok: true, spaces: result.rows });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 2. POST tạo mới không gian con
router.post('/', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const { name, description, type } = req.body || {};
  if (!name || !type) {
    return res.status(400).json({ message: 'Thiếu tên hoặc loại không gian con' });
  }

  if (!['journal', 'collection', 'project'].includes(type)) {
    return res.status(400).json({ message: 'Loại không gian con không hợp lệ' });
  }

  try {
    const id = crypto.randomUUID();
    const result = await db.query(
      `INSERT INTO spaces (id, name, description, type, owner_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, name.trim(), description ? description.trim() : null, type, req.user.sub]
    );
    return res.json({ ok: true, space: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 2b. PUT cập nhật thông tin không gian con
router.put('/:spaceId', requireAuth, checkSpaceOwnership, async (req: Request, res: Response) => {
  const { spaceId } = req.params;
  const { name, description, type } = req.body || {};
  
  if (!name || !type) {
    return res.status(400).json({ message: 'Thiếu tên hoặc loại không gian con' });
  }

  if (!['journal', 'collection', 'project'].includes(type)) {
    return res.status(400).json({ message: 'Loại không gian con không hợp lệ' });
  }

  try {
    const result = await db.query(
      `UPDATE spaces 
       SET name = $1, description = $2, type = $3
       WHERE id = $4 AND owner_id = $5 
       RETURNING *`,
      [name.trim(), description ? description.trim() : null, type, spaceId, req.user?.sub]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy không gian con này hoặc bạn không có quyền chỉnh sửa' });
    }

    return res.json({ ok: true, space: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 3. GET danh sách bài đăng thuộc không gian con
router.get('/:spaceId/posts', requireAuth, checkSpaceOwnership, async (req: Request, res: Response) => {
  const { spaceId } = req.params;
  try {
    const sql = `
      SELECT p.id AS post_id, p.space_id, p.caption, p.created_at AS post_created_at, p.user_id AS post_user_id,
             a.id AS asset_id, a.original_name, a.mime, a.size, a.rel_path, a.play_rel_path, a.hls_rel_path, a.processing_status, a.type AS asset_type, a.ext
      FROM posts p
      LEFT JOIN post_assets pa ON p.id = pa.post_id
      LEFT JOIN assets a ON pa.asset_id = a.id
      WHERE p.space_id = $1
      ORDER BY p.created_at DESC
    `;
    const result = await db.query(sql, [spaceId]);

    const postsMap = new Map();
    for (const row of result.rows) {
      if (!postsMap.has(row.post_id)) {
        postsMap.set(row.post_id, {
          id: row.post_id,
          spaceId: row.space_id,
          userId: row.post_user_id,
          caption: row.caption,
          createdAt: row.post_created_at,
          assets: []
        });
      }
      if (row.asset_id) {
        postsMap.get(row.post_id).assets.push({
          id: row.asset_id,
          originalName: row.original_name,
          mime: row.mime,
          size: Number(row.size),
          relPath: row.rel_path,
          playRelPath: row.play_rel_path,
          hlsRelPath: row.hls_rel_path,
          processingStatus: row.processing_status,
          type: row.asset_type,
          ext: row.ext
        });
      }
    }

    const posts = Array.from(postsMap.values());
    return res.json({ ok: true, posts });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 4. POST tạo bài viết mới trong không gian con (hỗ trợ upload trực tiếp hoặc đính kèm id cũ)
router.post('/:spaceId/posts', requireAuth, checkSpaceOwnership, upload.array('files', 10), async (req: Request, res: Response) => {
  const { spaceId } = req.params;
  const { caption, saveToPersonal, lastModifieds } = req.body || {};
  const isSaveToPersonal = String(saveToPersonal) === 'true';

  let lastModifiedsArray: any[] = [];
  if (lastModifieds) {
    try {
      lastModifiedsArray = JSON.parse(lastModifieds);
    } catch {
      // Ignore parse error
    }
  }

  let assetIdsInput = req.body.assetIds || req.body.asset_ids || [];

  // Parse assetIds nếu gửi dạng string JSON hoặc comma separated
  if (typeof assetIdsInput === 'string') {
    try {
      assetIdsInput = JSON.parse(assetIdsInput);
    } catch {
      assetIdsInput = assetIdsInput.split(',').map((x: string) => x.trim()).filter(Boolean);
    }
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // A. Tạo bài đăng mới
    const postId = crypto.randomUUID();
    await client.query(
      `INSERT INTO posts (id, space_id, user_id, caption)
       VALUES ($1, $2, $3, $4)`,
      [postId, spaceId, req.user?.sub, caption ? caption.trim() : null]
    );

    const linkedAssetIds: string[] = [];

    // B. Đính kèm các asset_ids có sẵn (phải thuộc quyền sở hữu của user)
    if (Array.isArray(assetIdsInput) && assetIdsInput.length > 0) {
      const checkRes = await client.query(
        'SELECT id FROM assets WHERE id = ANY($1) AND owner_id = $2',
        [assetIdsInput, req.user?.sub]
      );
      const validIds = checkRes.rows.map(r => r.id);
      
      for (const aid of validIds) {
        await client.query(
          'INSERT INTO post_assets (post_id, asset_id) VALUES ($1, $2)',
          [postId, aid]
        );
        linkedAssetIds.push(aid);
      }
    }

    // C. Upload file mới và tự động đính kèm vào bài đăng
    const files = (req.files as Express.Multer.File[]) || [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileLastModified = lastModifiedsArray[i] || null;

      const savedAsset = await saveUploadedFile(
        { ...file, lastModified: fileLastModified },
        req.user,
        null,
        isSaveToPersonal
      );

      await client.query(
        'INSERT INTO post_assets (post_id, asset_id) VALUES ($1, $2)',
        [postId, savedAsset.id]
      );
      linkedAssetIds.push(savedAsset.id);
    }

    await client.query('COMMIT');

    // D. Trả về bài đăng mới hoàn chỉnh
    const postAssetsRes = await db.query(
      'SELECT id, original_name, mime, size, rel_path, play_rel_path, hls_rel_path, processing_status, type, ext FROM assets WHERE id = ANY($1)',
      [linkedAssetIds]
    );

    return res.json({
      ok: true,
      post: {
        id: postId,
        spaceId,
        userId: req.user?.sub,
        caption: caption ? caption.trim() : null,
        createdAt: new Date().toISOString(),
        assets: postAssetsRes.rows.map(row => ({
          id: row.id,
          originalName: row.original_name,
          mime: row.mime,
          size: Number(row.size),
          relPath: row.rel_path,
          playRelPath: row.play_rel_path,
          hlsRelPath: row.hls_rel_path,
          processingStatus: row.processing_status,
          type: row.type,
          ext: row.ext
        }))
      }
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    // Xóa file temp nếu có lỗi
    const files = (req.files as Express.Multer.File[]) || [];
    for (const file of files) {
      try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch {}
    }
    return res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

export default router;
