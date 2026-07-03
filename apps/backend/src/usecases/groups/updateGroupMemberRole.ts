import * as db from '../../lib/db';
import { isValidUUID, getGroupMemberRole } from '../../lib/utils';
import { NotFoundError, ForbiddenError, ValidationError } from '../../lib/errors';

export async function updateGroupMemberRole(groupId: string, targetUserId: string, role: string, actorUserId: string) {
  if (!isValidUUID(groupId) || !isValidUUID(targetUserId)) {
    throw new ValidationError('ID is not in valid UUID format');
  }

  if (!role || (role !== 'admin' && role !== 'member')) {
    throw new ValidationError('Invalid updated role (admin or member)');
  }

  const actorRole = await getGroupMemberRole(groupId, actorUserId);
  if (actorRole !== 'owner') {
    throw new ForbiddenError('Only the group owner can change member roles');
  }

  const targetRole = await getGroupMemberRole(groupId, targetUserId);
  if (!targetRole) {
    throw new NotFoundError('Member not found in the group');
  }
  if (targetRole === 'owner') {
    throw new ValidationError('Cannot change the role of the group owner');
  }

  await db.query(
    'UPDATE group_members SET role = $1 WHERE group_id = $2 AND user_id = $3',
    [role, groupId, targetUserId]
  );
}
