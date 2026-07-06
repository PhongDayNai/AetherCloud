import * as db from '../../lib/db';
import { ForbiddenError } from '../../lib/errors';
import { getGroupMemberRole } from '../../lib/utils';

export async function getGroupInvitations(groupId: string, userId: string) {
  // Kiểm tra quyền: Chỉ Owner hoặc Admin của nhóm mới được xem danh sách mã mời
  const userRole = await getGroupMemberRole(groupId, userId);
  if (userRole !== 'owner' && userRole !== 'admin') {
    throw new ForbiddenError('Only group owners or admins can view invitations');
  }

  const queryText = `
    SELECT id, token, max_uses, uses_count, is_active, expires_at, created_at
    FROM group_invitations
    WHERE group_id = $1
    ORDER BY created_at DESC
  `;
  const res = await db.query(queryText, [groupId]);
  return res.rows;
}
