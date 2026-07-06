import * as db from '../../lib/db';
import { ForbiddenError, NotFoundError } from '../../lib/errors';
import { getGroupMemberRole } from '../../lib/utils';

export async function deactivateGroupInvitation(invitationId: string, userId: string) {
  // Tìm thông tin nhóm từ mã mời
  const inviteQuery = await db.query(
    'SELECT group_id, is_active FROM group_invitations WHERE id = $1',
    [invitationId]
  );
  
  if (inviteQuery.rows.length === 0) {
    throw new NotFoundError('Invitation code not found');
  }

  const { group_id: groupId, is_active: isActive } = inviteQuery.rows[0];

  if (!isActive) {
    return { success: true, message: 'Invitation is already locked' };
  }

  // Kiểm tra quyền: Chỉ Owner hoặc Admin của nhóm mới được khóa mã mời
  const userRole = await getGroupMemberRole(groupId, userId);
  if (userRole !== 'owner' && userRole !== 'admin') {
    throw new ForbiddenError('Only group owners or admins can deactivate invitations');
  }

  await db.query(
    'UPDATE group_invitations SET is_active = false WHERE id = $1',
    [invitationId]
  );

  return { success: true, message: 'Invitation deactivated successfully' };
}
