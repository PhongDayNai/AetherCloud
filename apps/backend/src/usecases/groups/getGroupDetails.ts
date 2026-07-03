import * as db from '../../lib/db';
import { isValidUUID, getGroupMemberRole } from '../../lib/utils';
import { NotFoundError, ForbiddenError, ValidationError } from '../../lib/errors';

export async function getGroupDetails(groupId: string, userId: string) {
  if (!isValidUUID(groupId)) {
    throw new ValidationError('groupId is not in valid UUID format');
  }

  const role = await getGroupMemberRole(groupId, userId);
  if (!role) {
    throw new ForbiddenError('You are not a member of this group');
  }

  const result = await db.query(
    `SELECT id, name, owner_id, created_at 
     FROM groups 
     WHERE id = $1`,
    [groupId]
  );
  if (result.rows.length === 0) {
    throw new NotFoundError('Group not found');
  }

  return { ...result.rows[0], role };
}
