import * as db from '../../lib/db';
import { isValidUUID, getGroupMemberRole } from '../../lib/utils';
import { ForbiddenError, ValidationError } from '../../lib/errors';

export async function listSpaces(userId: string, groupId: string | undefined, includeTrash: boolean, onlyTrash: boolean) {
  if (groupId && !isValidUUID(groupId)) {
    throw new ValidationError('groupId is not in valid UUID format');
  }

  let sqlCondition = 'AND is_deleted = false';
  if (onlyTrash) {
    sqlCondition = 'AND is_deleted = true';
  } else if (includeTrash) {
    sqlCondition = '';
  }

  if (groupId) {
    const role = await getGroupMemberRole(groupId, userId);
    if (!role) {
      throw new ForbiddenError('You do not have permission to access the spaces of this group');
    }

    let actualCondition = sqlCondition;
    if (role === 'member' && (onlyTrash || includeTrash)) {
      actualCondition = 'AND is_deleted = false';
    }

    const result = await db.query(
      `SELECT * FROM spaces WHERE group_id = $1 ${actualCondition} ORDER BY created_at DESC`,
      [groupId]
    );
    return result.rows;
  } else {
    const result = await db.query(
      `SELECT * FROM spaces WHERE owner_id = $1 AND group_id IS NULL ${sqlCondition} ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }
}
