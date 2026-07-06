import * as db from '../../lib/db';
import { NotFoundError } from '../../lib/errors';

export async function declineGroupInvitation(token: string, userId: string) {
  // Tìm thông tin nhóm từ mã mời
  const inviteQuery = await db.query(
    'SELECT group_id FROM group_invitations WHERE token = $1',
    [token]
  );

  if (inviteQuery.rows.length === 0) {
    throw new NotFoundError('Invitation link is invalid or has been deleted');
  }

  const groupId = inviteQuery.rows[0].group_id;

  // Ghi nhận phản hồi declined
  await db.query(
    `INSERT INTO group_invite_responses (user_id, group_id, status, updated_at)
     VALUES ($1, $2, 'declined', NOW())
     ON CONFLICT (user_id, group_id) 
     DO UPDATE SET status = 'declined', updated_at = NOW()`,
    [userId, groupId]
  );

  // Tìm và tự động đánh dấu đã đọc lời mời tương ứng
  const inviteNotificationQuery = await db.query(
    `SELECT id, metadata 
     FROM notifications 
     WHERE user_id = $1 AND type = 'group_invite' AND is_read = false`,
    [userId]
  );

  for (const row of inviteNotificationQuery.rows) {
    try {
      const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
      if (meta && meta.groupId === groupId) {
        await db.query(
          'UPDATE notifications SET is_read = true WHERE id = $1',
          [row.id]
        );
        break;
      }
    } catch (e) {
      // Bỏ qua
    }
  }

  return { success: true, groupId };
}
