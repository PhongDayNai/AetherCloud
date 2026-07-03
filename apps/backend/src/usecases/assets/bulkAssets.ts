import crypto from 'crypto';
import * as db from '../../lib/db';
import {
  listAlbums,
  assignAlbum,
  listDocProjects,
  assignDocProject,
  moveToTrash,
  restoreFromTrash,
  purgeDeleted,
} from '../../lib/assets';
import { isValidUUID, filterValidUUIDs, isGroupMember } from '../../lib/utils';
import { ValidationError, ForbiddenError } from '../../lib/errors';

export async function listUserAlbums(userId: string, groupId: string | null) {
  if (groupId) {
    if (!isValidUUID(groupId)) {
      throw new ValidationError('groupId is not in valid UUID format');
    }
    const isMember = await isGroupMember(groupId, userId);
    if (!isMember) {
      throw new ForbiddenError('You do not have permission to access this group information');
    }
  }
  return listAlbums(userId, groupId);
}

export async function listUserDocProjects(userId: string, groupId: string | null) {
  if (groupId) {
    if (!isValidUUID(groupId)) {
      throw new ValidationError('groupId is not in valid UUID format');
    }
    const isMember = await isGroupMember(groupId, userId);
    if (!isMember) {
      throw new ForbiddenError('You do not have permission to access this group information');
    }
  }
  return listDocProjects(userId, groupId);
}

export async function assignBulkAlbum(ids: string[], albumName: string) {
  if (!albumName.trim()) {
    throw new ValidationError('albumName is required');
  }
  return assignAlbum(ids, albumName);
}

export async function assignBulkDocProject(ids: string[], projectName: string) {
  if (!projectName.trim()) {
    throw new ValidationError('projectName is required');
  }
  return assignDocProject(ids, projectName);
}

export async function moveBulkToTrash(ids: string[]) {
  return moveToTrash(ids);
}

export async function restoreBulkFromTrash(ids: string[]) {
  return restoreFromTrash(ids);
}

export async function purgeBulkAssets(ids: string[], bulkAssets: any[], userId: string) {
  for (const asset of bulkAssets) {
    if (asset.group_id) {
      if (asset.groupRole !== 'owner') {
        throw new ForbiddenError('Only the group owner can permanently delete files in the group');
      }
    } else {
      if (asset.owner_id !== userId) {
        throw new ForbiddenError('You do not have permission to permanently delete other people\'s personal files');
      }
    }
  }
  return purgeDeleted(ids);
}

export async function bulkShareToGroup(ids: string[], groupId: string, userId: string) {
  if (!groupId) {
    throw new ValidationError('groupId is required');
  }

  if (!isValidUUID(groupId)) {
    throw new ValidationError('groupId is not in valid UUID format');
  }

  const validIds = filterValidUUIDs(ids);

  if (!(await isGroupMember(groupId, userId))) {
    throw new ForbiddenError('You are not a member of the recipient group');
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    let sharedCount = 0;

    for (const aid of validIds) {
      const assetRes = await client.query('SELECT * FROM assets WHERE id = $1 AND is_deleted = false', [aid]);
      if (assetRes.rows.length === 0) continue;
      const original = assetRes.rows[0];

      const dupRes = await client.query(
        'SELECT 1 FROM assets WHERE group_id = $1 AND rel_path = $2 AND is_deleted = false LIMIT 1',
        [groupId, original.rel_path]
      );
      if (dupRes.rows.length > 0) continue;

      const newId = crypto.randomUUID();
      await client.query(`
        INSERT INTO assets (
          id, original_name, mime, size, owner_id, group_id, uploaded_at, taken_at, rel_path,
          play_rel_path, hls_rel_path, processing_status, processing_started_at,
          processing_finished_at, ext, album_name, album_names, doc_project_name,
          doc_project_names, tags, is_deleted, deleted_at, is_library, type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      `, [
        newId, original.original_name, original.mime, original.size, userId, groupId,
        new Date().toISOString(), original.taken_at, original.rel_path, original.play_rel_path, original.hls_rel_path,
        original.processing_status, original.processing_started_at, original.processing_finished_at,
        original.ext, null, '{}', null, '{}', original.tags, false, null, true, original.type
      ]);
      sharedCount++;
    }

    await client.query('COMMIT');
    return { sharedCount };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
