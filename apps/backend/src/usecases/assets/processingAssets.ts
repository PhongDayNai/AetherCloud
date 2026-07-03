import * as db from '../../lib/db';
import { isValidUUID, filterValidUUIDs, isGroupMember } from '../../lib/utils';
import { ValidationError, ForbiddenError } from '../../lib/errors';

export async function getProcessingAssets(groupId: string | undefined, userId: string) {
  if (groupId && !isValidUUID(groupId)) {
    throw new ValidationError('groupId is not in valid UUID format');
  }

  let result;
  if (groupId) {
    if (!(await isGroupMember(groupId, userId))) {
      throw new ForbiddenError('You do not have permission to access this group information');
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
      [userId]
    );
  }

  return result.rows.map(row => row.id);
}

export async function getAssetsStatus(ids: string[], userId: string) {
  const result = await db.query(
    `SELECT id, processing_status, play_rel_path, hls_rel_path, owner_id, group_id 
     FROM assets 
     WHERE id = ANY($1)`,
    [ids]
  );

  const verifiedStatuses = [];
  for (const row of result.rows) {
    let hasAccess = false;
    if (row.group_id) {
      if (await isGroupMember(row.group_id, userId)) hasAccess = true;
    } else {
      if (row.owner_id === userId) hasAccess = true;
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

  return verifiedStatuses;
}
