import crypto from 'crypto';
import fs from 'fs';
import * as db from '../../lib/db';
import { saveUploadedFile } from '../../lib/assets';
import { filterValidUUIDs, isGroupMember } from '../../lib/utils';
import { NotFoundError, ForbiddenError, ValidationError } from '../../lib/errors';

export async function createSpacePost(
  spaceId: string,
  caption: string | undefined,
  saveToPersonal: boolean,
  lastModifiedsArray: any[],
  assetIdsInput: any[],
  files: any[],
  user: any
) {
  const spaceRes = await db.query('SELECT * FROM spaces WHERE id = $1', [spaceId]);
  if (spaceRes.rows.length === 0) {
    throw new NotFoundError('Space not found');
  }
  const space = spaceRes.rows[0];

  if (space.is_deleted) {
    throw new ValidationError('This space has been soft deleted');
  }

  if (space.group_id) {
    const isMember = await isGroupMember(space.group_id, user.sub);
    if (!isMember) {
      throw new ForbiddenError('You do not have permission to access the spaces of this group');
    }
  } else {
    if (space.owner_id !== user.sub) {
      throw new ForbiddenError('You do not have permission to access this space');
    }
  }

  const validAssetIds = filterValidUUIDs(assetIdsInput);
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // A. Tạo bài đăng mới
    const postId = crypto.randomUUID();
    await client.query(
      `INSERT INTO posts (id, space_id, user_id, caption)
       VALUES ($1, $2, $3, $4)`,
      [postId, spaceId, user.sub, caption ? caption.trim() : null]
    );

    const linkedAssetIds: string[] = [];
    const groupId = space.group_id || null;

    // B. Đính kèm các asset_ids có sẵn (phải thuộc quyền sở hữu của user hoặc thuộc về nhóm chứa space)
    if (validAssetIds.length > 0) {
      let checkRes;
      if (groupId) {
        checkRes = await client.query(
          `SELECT * FROM assets 
           WHERE id = ANY($1) 
           AND is_deleted = false
           AND (
             owner_id = $2 OR 
             group_id = $3
           )`,
          [validAssetIds, user.sub, groupId]
        );
        
        for (const original of checkRes.rows) {
          if (original.group_id === groupId) {
            await client.query(
              'INSERT INTO post_assets (post_id, asset_id) VALUES ($1, $2)',
              [postId, original.id]
            );
            linkedAssetIds.push(original.id);
          } else {
            // Tệp ban đầu là cá nhân, cần nhân bản metadata cho nhóm để phân quyền an toàn
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
                  doc_project_names, tags, is_deleted, deleted_at, is_library, type, version, last_modified_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
              `, [
                targetAssetId, original.original_name, original.mime, original.size, user.sub, groupId,
                new Date().toISOString(), original.taken_at, original.rel_path, original.play_rel_path, original.hls_rel_path,
                original.processing_status, original.processing_started_at, original.processing_finished_at,
                original.ext, null, '{}', null, '{}', original.tags, false, null, false, original.type,
                original.version !== undefined && original.version !== null ? Number(original.version) : 1,
                original.last_modified_by || null
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
        checkRes = await client.query(
          'SELECT id FROM assets WHERE id = ANY($1) AND is_deleted = false AND owner_id = $2 AND group_id IS NULL',
          [validAssetIds, user.sub]
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
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileLastModified = lastModifiedsArray[i] || null;

      if (groupId) {
        const savedAsset = await saveUploadedFile(
          { ...file, lastModified: fileLastModified },
          user,
          groupId,
          true
        );

        await client.query(
          'INSERT INTO post_assets (post_id, asset_id) VALUES ($1, $2)',
          [postId, savedAsset.id]
        );
        linkedAssetIds.push(savedAsset.id);

        if (saveToPersonal) {
          await saveUploadedFile(
            { ...file, lastModified: fileLastModified },
            user,
            null,
            true
          );
        }
      } else {
        const savedAsset = await saveUploadedFile(
          { ...file, lastModified: fileLastModified },
          user,
          null,
          saveToPersonal
        );

        await client.query(
          'INSERT INTO post_assets (post_id, asset_id) VALUES ($1, $2)',
          [postId, savedAsset.id]
        );
        linkedAssetIds.push(savedAsset.id);
      }
    }

    await client.query('COMMIT');

    const postAssetsRes = await db.query(
      `SELECT id, original_name, mime, size, rel_path, play_rel_path, hls_rel_path, processing_status, type, ext,
              uploaded_at, taken_at, album_name, album_names, doc_project_name, doc_project_names, tags, version, last_modified_by
       FROM assets WHERE id = ANY($1)`,
      [linkedAssetIds]
    );

    return {
      post: {
        id: postId,
        spaceId,
        userId: user.sub,
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
          ext: row.ext,
          uploadedAt: row.uploaded_at,
          takenAt: row.taken_at,
          albumName: row.album_name,
          albumNames: row.album_names,
          docProjectName: row.doc_project_name,
          docProjectNames: row.doc_project_names,
          tags: row.tags,
          version: row.version !== undefined && row.version !== null ? Number(row.version) : 1,
          lastModifiedById: row.last_modified_by || null
        }))
      }
    };
  } catch (err) {
    await client.query('ROLLBACK');
    // Xóa file temp nếu có lỗi
    for (const file of files) {
      try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch {}
    }
    throw err;
  } finally {
    client.release();
  }
}
