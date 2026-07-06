import * as db from '../../lib/db';
import { NotFoundError, ConflictError } from '../../lib/errors';

export async function declineGroupInvitation(token: string, userId: string, inviteNotificationId?: string) {
  // Tìm thông tin nhóm từ mã mời
  const inviteQuery = await db.query(
    'SELECT group_id FROM group_invitations WHERE token = $1',
    [token]
  );

  if (inviteQuery.rows.length === 0) {
    throw new NotFoundError('Invitation link is invalid or has been deleted');
  }

  const groupId = inviteQuery.rows[0].group_id;

  // Kiểm tra xem user đã là thành viên nhóm chưa
  const memberCheck = await db.query(
    'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId]
  );
  if (memberCheck.rows.length > 0) {
    // Nếu đã là thành viên mà bấm Decline, cập nhật trạng thái thông báo thành accepted và trả về thành công
    const targetNotiId = inviteNotificationId || (
      await db.query(
        `SELECT id FROM notifications 
         WHERE user_id = $1 AND type = 'group_invite' AND is_read = false AND (metadata->>'groupId') = $2
         LIMIT 1`,
        [userId, groupId]
      )
    ).rows[0]?.id;

    if (targetNotiId) {
      await db.query(
        `UPDATE notifications 
         SET is_read = true, 
             metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{status}', '"accepted"') 
         WHERE id = $1`,
        [targetNotiId]
      );
    }
    return { success: true, groupId };
  }



  let updated = false;

  // Nếu có inviteNotificationId, cập nhật trực tiếp bản ghi đó
  if (inviteNotificationId) {
    const res = await db.query(
      `UPDATE notifications 
       SET is_read = true, 
           metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{status}', '"declined"') 
       WHERE id = $1 AND user_id = $2`,
      [inviteNotificationId, userId]
    );
    if (res.rowCount !== null && res.rowCount > 0) {
      updated = true;
    }
  }

  // Nếu chưa cập nhật, dò tìm tự động
  if (!updated) {
    const inviteNotificationQuery = await db.query(
      `SELECT id, metadata 
       FROM notifications 
       WHERE user_id = $1 AND type = 'group_invite' AND is_read = false`,
      [userId]
    );

    for (const row of inviteNotificationQuery.rows) {
      try {
        const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
        if (meta && (meta.groupId === groupId || meta.token === token)) {
          await db.query(
            `UPDATE notifications 
             SET is_read = true, 
                 metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{status}', '"declined"') 
             WHERE id = $1`,
            [row.id]
          );
          break;
        }
      } catch (e) {
        // Bỏ qua
      }
    }
  }

  return { success: true, groupId };
}
