import * as db from '../../lib/db';
import { isValidUUID, getGroupMemberRole } from '../../lib/utils';
import { ValidationError, NotFoundError, ForbiddenError } from '../../lib/errors';

export async function removeGroupMember(groupId: string, targetUserId: string, actorUserId: string) {
  if (!isValidUUID(groupId) || !isValidUUID(targetUserId)) {
    throw new ValidationError('ID is not in valid UUID format');
  }

  const targetRole = await getGroupMemberRole(groupId, targetUserId);
  if (!targetRole) {
    throw new NotFoundError('Member not found in the group');
  }

  const actorRole = await getGroupMemberRole(groupId, actorUserId);
  if (!actorRole) {
    throw new ForbiddenError('You are not a member of this group');
  }

  // Trường hợp 1: Tự rời nhóm
  if (targetUserId === actorUserId) {
    if (targetRole === 'owner') {
      throw new ValidationError('The owner cannot leave the group. Please transfer ownership or delete the group.');
    }
    await db.query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, targetUserId]);
    return 'You have successfully left the group';
  }

  // Trường hợp 2: Trục xuất thành viên khác
  if (actorRole !== 'owner' && actorRole !== 'admin') {
    throw new ForbiddenError('You do not have permission to remove members');
  }
  // Admin không thể trục xuất Admin khác hoặc Owner
  if (actorRole === 'admin' && (targetRole === 'admin' || targetRole === 'owner')) {
    throw new ForbiddenError('Admins cannot remove other admins or the owner');
  }
  if (targetRole === 'owner') {
    throw new ForbiddenError('Cannot remove the group owner');
  }

  await db.query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, targetUserId]);
  return 'Successfully removed member from the group';
}
