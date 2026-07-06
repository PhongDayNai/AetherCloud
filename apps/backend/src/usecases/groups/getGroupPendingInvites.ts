import * as db from '../../lib/db';
import { ForbiddenError } from '../../lib/errors';
import { getGroupMemberRole } from '../../lib/utils';

export async function getGroupPendingInvites(groupId: string, actorUserId: string) {
  // Kiểm tra quyền: Chỉ Owner hoặc Admin của nhóm mới được xem
  const actorRole = await getGroupMemberRole(groupId, actorUserId);
  if (actorRole !== 'owner' && actorRole !== 'admin') {
    throw new ForbiddenError('Only group owners or admins can view pending invites');
  }

  const res = await db.query(
    `SELECT n.id as notification_id, n.created_at, n.metadata, u.email, u.name as user_name
     FROM notifications n
     JOIN users u ON n.user_id = u.id
     WHERE n.type = 'group_invite' 
       AND (n.metadata->>'groupId') = $1
       AND (n.metadata->>'status' IS NULL OR n.metadata->>'status' = '')
     ORDER BY n.created_at DESC`,
    [groupId]
  );

  const pending = [];
  const now = new Date();

  for (const row of res.rows) {
    try {
      const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
      const expiresAt = meta?.expiresAt ? new Date(meta.expiresAt) : null;
      const isExpired = expiresAt ? expiresAt < now : false;

      // Chỉ lấy những lời mời chưa hết hạn
      if (!isExpired) {
        pending.push({
          id: row.notification_id,
          email: row.email,
          name: row.user_name || row.email,
          role: meta?.role || 'member',
          invited_at: row.created_at,
          expires_at: meta?.expiresAt || null
        });
      }
    } catch (e) {
      // Bỏ qua lỗi parse
    }
  }

  return { pending };
}
