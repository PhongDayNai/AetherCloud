import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import fs from 'fs';
import * as db from '../lib/db';
import { requireAuth } from '../middleware/requireAuth';
import { saveUploadedFile } from '../lib/assets';
import { isValidUUID, filterValidUUIDs, getGroupMemberRole } from '../lib/utils';

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
  if (!isValidUUID(spaceId)) {
    return res.status(400).json({ message: 'spaceId không đúng định dạng UUID' });
  }
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await db.query('SELECT * FROM spaces WHERE id = $1', [spaceId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy không gian con này' });
    }
    const space = result.rows[0];

    // Kiểm tra Soft Delete: Chỉ cho phép đi qua ở API restore và API purge
    const isTrashAction = req.path.endsWith('/restore') || req.path.endsWith('/purge');
    if (space.is_deleted && !isTrashAction) {
      return res.status(404).json({ message: 'Không gian con này đã bị xóa tạm thời' });
    }
    
    if (space.group_id) {
      // Kiểm tra xem user có phải thành viên nhóm không
      const role = await getGroupMemberRole(space.group_id, req.user.sub);
      if (!role) {
        return res.status(403).json({ message: 'Bạn không có quyền truy cập không gian con của nhóm này' });
      }
      req.groupRole = role; // Lưu lại vai trò
    } else {
      // Kiểm tra sở hữu cá nhân
      if (space.owner_id !== req.user.sub) {
        return res.status(403).json({ message: 'Bạn không có quyền truy cập không gian con này' });
      }
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
  const groupId = req.query.groupId ? String(req.query.groupId) : undefined;

  if (groupId && !isValidUUID(groupId)) {
    return res.status(400).json({ message: 'groupId không đúng định dạng UUID' });
  }

  const includeTrash = String(req.query.includeTrash || 'false') === 'true';
  const onlyTrash = String(req.query.onlyTrash || 'false') === 'true';

  let sqlCondition = 'AND is_deleted = false';
  if (onlyTrash) {
    sqlCondition = 'AND is_deleted = true';
  } else if (includeTrash) {
    sqlCondition = '';
  }

  try {
    if (groupId) {
      // Xác minh quyền thành viên nhóm
      const role = await getGroupMemberRole(groupId, req.user.sub);
      if (!role) {
        return res.status(403).json({ message: 'Bạn không có quyền truy cập không gian con của nhóm này' });
      }

      // Thành viên thường (member) không được xem các Space trong thùng rác của nhóm
      let actualCondition = sqlCondition;
      if (role === 'member' && (onlyTrash || includeTrash)) {
        actualCondition = 'AND is_deleted = false';
      }

      const result = await db.query(
        `SELECT * FROM spaces WHERE group_id = $1 ${actualCondition} ORDER BY created_at DESC`,
        [groupId]
      );
      return res.json({ ok: true, spaces: result.rows });
    } else {
      const result = await db.query(
        `SELECT * FROM spaces WHERE owner_id = $1 AND group_id IS NULL ${sqlCondition} ORDER BY created_at DESC`,
        [req.user.sub]
      );
      return res.json({ ok: true, spaces: result.rows });
    }
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 2. POST tạo mới không gian con
router.post('/', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const { name, description, type, groupId } = req.body || {};
  if (!name || !type) {
    return res.status(400).json({ message: 'Thiếu tên hoặc loại không gian con' });
  }

  if (!['journal', 'collection', 'project'].includes(type)) {
    return res.status(400).json({ message: 'Loại không gian con không hợp lệ' });
  }

  if (groupId && !isValidUUID(groupId)) {
    return res.status(400).json({ message: 'groupId không đúng định dạng UUID' });
  }

  try {
    if (groupId) {
      // Xác minh quyền Admin/Owner của nhóm để tạo Space nhóm
      const role = await getGroupMemberRole(groupId, req.user.sub);
      if (!role) {
        return res.status(403).json({ message: 'Bạn không phải là thành viên của nhóm này' });
      }
      if (role !== 'owner' && role !== 'admin') {
        return res.status(403).json({ message: 'Chỉ chủ sở hữu hoặc quản trị viên nhóm mới được tạo không gian con chung' });
      }

      const id = crypto.randomUUID();
      const result = await db.query(
        `INSERT INTO spaces (id, name, description, type, owner_id, group_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [id, name.trim(), description ? description.trim() : null, type, req.user.sub, groupId]
      );
      return res.json({ ok: true, space: result.rows[0] });
    } else {
      const id = crypto.randomUUID();
      const result = await db.query(
        `INSERT INTO spaces (id, name, description, type, owner_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [id, name.trim(), description ? description.trim() : null, type, req.user.sub]
      );
      return res.json({ ok: true, space: result.rows[0] });
    }
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

  // Chỉ người tạo ra Space hoặc chủ sở hữu nhóm mới có quyền thay đổi thông tin Space
  const isSpaceOwner = req.space.owner_id === req.user?.sub;
  const isGroupOwner = req.space.group_id && req.groupRole === 'owner';
  if (!isSpaceOwner && !isGroupOwner) {
    return res.status(403).json({ message: 'Chỉ người tạo không gian con hoặc chủ sở hữu nhóm mới có quyền thay đổi' });
  }

  try {
    const result = await db.query(
      `UPDATE spaces 
       SET name = $1, description = $2, type = $3
       WHERE id = $4
       RETURNING *`,
      [name.trim(), description ? description.trim() : null, type, spaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy không gian con này' });
    }

    return res.json({ ok: true, space: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 2c. DELETE đưa không gian con vào thùng rác (Soft Delete)
router.delete('/:spaceId', requireAuth, checkSpaceOwnership, async (req: Request, res: Response) => {
  const { spaceId } = req.params;

  // Quyền xóa tạm thời: Người tạo Space hoặc Admin/Owner của nhóm
  const isSpaceOwner = req.space.owner_id === req.user?.sub;
  const isGroupOwnerOrAdmin = req.space.group_id && (req.groupRole === 'owner' || req.groupRole === 'admin');
  if (!isSpaceOwner && !isGroupOwnerOrAdmin) {
    return res.status(403).json({ message: 'Chỉ người tạo không gian con hoặc quản trị viên nhóm mới có quyền xóa tạm thời' });
  }

  try {
    await db.query(
      'UPDATE spaces SET is_deleted = true, deleted_at = NOW() WHERE id = $1',
      [spaceId]
    );
    return res.json({ ok: true, message: 'Đã đưa không gian con vào thùng rác thành công' });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 2d. POST khôi phục không gian con từ thùng rác
router.post('/:spaceId/restore', requireAuth, checkSpaceOwnership, async (req: Request, res: Response) => {
  const { spaceId } = req.params;

  // Quyền khôi phục: Người tạo Space hoặc Admin/Owner của nhóm
  const isSpaceOwner = req.space.owner_id === req.user?.sub;
  const isGroupOwnerOrAdmin = req.space.group_id && (req.groupRole === 'owner' || req.groupRole === 'admin');
  if (!isSpaceOwner && !isGroupOwnerOrAdmin) {
    return res.status(403).json({ message: 'Chỉ người tạo không gian con hoặc quản trị viên nhóm mới có quyền khôi phục' });
  }

  try {
    await db.query(
      'UPDATE spaces SET is_deleted = false, deleted_at = null WHERE id = $1',
      [spaceId]
    );
    return res.json({ ok: true, message: 'Khôi phục không gian con thành công' });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 2e. DELETE xóa vĩnh viễn không gian con (Purge)
router.delete('/:spaceId/purge', requireAuth, checkSpaceOwnership, async (req: Request, res: Response) => {
  const { spaceId } = req.params;

  // Quyền xóa vĩnh viễn (Purge): 
  // - Space cá nhân: Chỉ chủ sở hữu Space.
  // - Space nhóm: Chỉ duy nhất Owner của nhóm (để quản lý dung lượng chung).
  const isSpaceOwner = req.space.owner_id === req.user?.sub;
  const isGroupOwner = req.space.group_id && req.groupRole === 'owner';

  if (req.space.group_id) {
    if (!isGroupOwner) {
      return res.status(403).json({ message: 'Chỉ chủ sở hữu nhóm mới có quyền xóa vĩnh viễn không gian con chung' });
    }
  } else {
    if (!isSpaceOwner) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa vĩnh viễn không gian con này' });
    }
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Xóa cứng không gian con khỏi DB (CASCADE sẽ tự động xóa posts và post_assets liên quan trong DB)
    await client.query('DELETE FROM spaces WHERE id = $1', [spaceId]);

    await client.query('COMMIT');
    return res.json({ ok: true, message: 'Đã xóa vĩnh viễn không gian con thành công. Các tệp đính kèm mồ côi sẽ tự động được dọn dẹp.' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// 3. GET danh sách bài đăng thuộc không gian con
router.get('/:spaceId/posts', requireAuth, checkSpaceOwnership, async (req: Request, res: Response) => {
  const { spaceId } = req.params;
  try {
    const sql = `
      SELECT p.id AS post_id, p.space_id, p.caption, p.created_at AS post_created_at, p.user_id AS post_user_id,
             u.name AS post_user_name, u.avatar_url AS post_user_avatar_url,
             a.id AS asset_id, a.original_name, a.mime, a.size, a.rel_path, a.play_rel_path, a.hls_rel_path, a.processing_status, a.type AS asset_type, a.ext
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN post_assets pa ON p.id = pa.post_id
      LEFT JOIN assets a ON pa.asset_id = a.id AND a.is_deleted = false
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
          userName: row.post_user_name || 'Người dùng hệ thống',
          userAvatarUrl: row.post_user_avatar_url,
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

  // Lọc chỉ giữ lại các ID đúng định dạng UUID để tránh lỗi Postgres quăng Exception kiểu dữ liệu
  const validAssetIds = filterValidUUIDs(assetIdsInput);

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
    const groupId = req.space?.group_id || null;

    // B. Đính kèm các asset_ids có sẵn (phải thuộc quyền sở hữu của user hoặc thuộc về nhóm chứa space)
    if (validAssetIds.length > 0) {
      let checkRes;
      if (groupId) {
        // Lấy tất cả tệp tin hợp lệ và đang hoạt động (do user sở hữu hoặc thuộc nhóm này)
        checkRes = await client.query(
          `SELECT * FROM assets 
           WHERE id = ANY($1) 
           AND is_deleted = false
           AND (
             owner_id = $2 OR 
             group_id = $3
           )`,
          [validAssetIds, req.user?.sub, groupId]
        );
        
        for (const original of checkRes.rows) {
          if (original.group_id === groupId) {
            // Tệp đã thuộc về nhóm, đính kèm trực tiếp
            await client.query(
              'INSERT INTO post_assets (post_id, asset_id) VALUES ($1, $2)',
              [postId, original.id]
            );
            linkedAssetIds.push(original.id);
          } else {
            // Tệp ban đầu là cá nhân, cần nhân bản metadata cho nhóm để phân quyền an toàn
            // Kiểm tra xem đã được nhân bản vào nhóm trước đó chưa (tránh trùng lặp)
            const dupRes = await client.query(
              'SELECT id FROM assets WHERE group_id = $1 AND rel_path = $2 AND is_deleted = false LIMIT 1',
              [groupId, original.rel_path]
            );
            let targetAssetId = dupRes.rows[0]?.id;

            if (!targetAssetId) {
              targetAssetId = crypto.randomUUID();
              await client.query(`
                INSERT INTO assets (
                  id, original_name, mime, size, owner_id, group_id, uploaded_at, taken_at, rel_path,
                  play_rel_path, hls_rel_path, processing_status, processing_started_at,
                  processing_finished_at, ext, album_name, album_names, doc_project_name,
                  doc_project_names, tags, is_deleted, deleted_at, is_library, type
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
              `, [
                targetAssetId, original.original_name, original.mime, original.size, req.user?.sub, groupId,
                new Date().toISOString(), original.taken_at, original.rel_path, original.play_rel_path, original.hls_rel_path,
                original.processing_status, original.processing_started_at, original.processing_finished_at,
                original.ext, null, '{}', null, '{}', original.tags, false, null, false, original.type
              ]);
            }

            await client.query(
              'INSERT INTO post_assets (post_id, asset_id) VALUES ($1, $2)',
              [postId, targetAssetId]
            );
            linkedAssetIds.push(targetAssetId);
          }
        }
      } else {
        // Space cá nhân, đính kèm trực tiếp tệp cá nhân của user đang hoạt động
        checkRes = await client.query(
          'SELECT id FROM assets WHERE id = ANY($1) AND is_deleted = false AND owner_id = $2 AND group_id IS NULL',
          [validAssetIds, req.user?.sub]
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
    }

    // C. Upload file mới và tự động đính kèm vào bài đăng
    const files = (req.files as Express.Multer.File[]) || [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileLastModified = lastModifiedsArray[i] || null;

      if (groupId) {
        // Đăng bài nhóm:
        // 1. Tạo asset chính gắn vào nhóm (is_library = true)
        const savedAsset = await saveUploadedFile(
          { ...file, lastModified: fileLastModified },
          req.user,
          groupId,
          true
        );

        await client.query(
          'INSERT INTO post_assets (post_id, asset_id) VALUES ($1, $2)',
          [postId, savedAsset.id]
        );
        linkedAssetIds.push(savedAsset.id);

        // 2. Nếu tích chọn "Đồng thời lưu cá nhân": Nhân bản thêm asset cá nhân trỏ chung file vật lý
        if (isSaveToPersonal) {
          await saveUploadedFile(
            { ...file, lastModified: fileLastModified },
            req.user,
            null,
            true
          );
        }
      } else {
        // Đăng bài cá nhân:
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
