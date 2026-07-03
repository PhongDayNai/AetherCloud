import * as db from '../../lib/db';
import { isGroupMember } from '../../lib/utils';
import { NotFoundError, ForbiddenError, ValidationError } from '../../lib/errors';

export async function getSpacePosts(spaceId: string, userId: string) {
  const spaceRes = await db.query('SELECT * FROM spaces WHERE id = $1', [spaceId]);
  if (spaceRes.rows.length === 0) {
    throw new NotFoundError('Space not found');
  }
  const space = spaceRes.rows[0];

  if (space.is_deleted) {
    throw new ValidationError('This space has been soft deleted');
  }

  if (space.group_id) {
    const isMember = await isGroupMember(space.group_id, userId);
    if (!isMember) {
      throw new ForbiddenError('You do not have permission to access the spaces of this group');
    }
  } else {
    if (space.owner_id !== userId) {
      throw new ForbiddenError('You do not have permission to access this space');
    }
  }

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
        userName: row.post_user_name || 'System User',
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

  return Array.from(postsMap.values());
}
