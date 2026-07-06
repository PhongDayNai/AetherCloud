import * as db from '../../lib/db';
import { ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors';
import { getGroupMemberRole } from '../../lib/utils';
import { sendNotificationRealtime } from '../../lib/websocket';

export async function revokeGroupInvitation(groupId: string, notificationId: string, actorUserId: string) {
  // Kiểm tra quyền: Chỉ Owner hoặc Admin của nhóm mới được hủy lời mời
  const actorRole = await getGroupMemberRole(groupId, actorUserId);
  if (actorRole !== 'owner' && actorRole !== 'admin') {
    throw new ForbiddenError('Only group owners or admins can revoke invitations');
  }

  // Tìm notification để lấy user_id của người bị hủy
  const notiQuery = await db.query(
    `SELECT user_id, metadata FROM notifications 
     WHERE id = $1 AND type = 'group_invite' AND (metadata->>'groupId') = $2`,
    [notificationId, groupId]
  );

  if (notiQuery.rows.length === 0) {
    throw new NotFoundError('Invitation not found or already resolved');
  }

  const targetUserId = notiQuery.rows[0].user_id;
  const rawMeta = notiQuery.rows[0].metadata;

  // Kiểm tra xem lời mời đã được phản hồi (Accept/Decline) trước đó chưa
  try {
    const meta = typeof rawMeta === 'string' ? JSON.parse(rawMeta) : rawMeta;
    if (meta && (meta.status === 'accepted' || meta.status === 'declined')) {
      throw new ValidationError('This invitation has already been resolved and cannot be revoked', 'INVITATION_ALREADY_RESOLVED');
    }
  } catch (e) {
    if (e instanceof ValidationError) {
      throw e;
    }
  }

  // Thực hiện DELETE cả token mời tương ứng trong bảng group_invitations (nếu có)
  try {
    const meta = typeof rawMeta === 'string' ? JSON.parse(rawMeta) : rawMeta;
    const token = meta?.token;
    if (token) {
      await db.query('DELETE FROM group_invitations WHERE token = $1', [token]);
    }
  } catch (e) {
    // Bỏ qua lỗi parse metadata
  }

  // Thực hiện DELETE notification
  await db.query('DELETE FROM notifications WHERE id = $1', [notificationId]);

  // Bắn thông báo realtime tới targetUser để họ biến mất notification ở quả chuông ngay lập tức
  sendNotificationRealtime(targetUserId, {
    type: 'notification_deleted',
    data: { id: notificationId }
  });

  return { success: true };
}
