import crypto from 'crypto';
import * as db from '../../lib/db';
import { ValidationError, ConflictError, NotFoundError } from '../../lib/errors';
import { sendNotificationRealtime } from '../../lib/websocket';

export async function acceptGroupInvitation(token: string, userId: string) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lấy chi tiết mã mời và nhóm (khóa dòng bằng FOR UPDATE OF gi để tránh race condition)
    const inviteQuery = await client.query(
      `SELECT gi.id as invite_id, gi.group_id, gi.is_active, gi.expires_at, gi.max_uses, gi.uses_count,
              g.name as group_name, g.owner_id as group_owner_id, u.name as joiner_name
       FROM group_invitations gi
       JOIN groups g ON gi.group_id = g.id
       JOIN users u ON u.id = $2
       WHERE gi.token = $1
       FOR UPDATE OF gi`,
      [token, userId]
    );

    if (inviteQuery.rows.length === 0) {
      throw new NotFoundError('Invitation link is invalid or has been deleted');
    }

    const invite = inviteQuery.rows[0];
    const { group_id: groupId, group_name: groupName, group_owner_id: ownerId, joiner_name: joinerName } = invite;

    // 2. Kiểm tra tính hợp lệ của mã mời
    const now = new Date();
    const isExpired = invite.expires_at ? new Date(invite.expires_at) < now : false;
    const isLimitReached = invite.max_uses ? invite.uses_count >= invite.max_uses : false;

    if (!invite.is_active || isExpired || isLimitReached) {
      throw new ValidationError('This invitation link has expired or been deactivated');
    }

    // 3. Kiểm tra xem user đã là thành viên nhóm chưa
    const memberCheck = await client.query(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );
    if (memberCheck.rows.length > 0) {
      throw new ConflictError('You are already a member of this group');
    }

    // Tìm xem có notification mời trực tiếp nào chưa đọc cho user này vào nhóm này không
    const inviteNotificationQuery = await client.query(
      `SELECT id, metadata 
       FROM notifications 
       WHERE user_id = $1 AND type = 'group_invite' AND is_read = false`,
      [userId]
    );

    let targetRole = 'member';
    let matchedNotificationId: string | null = null;

    for (const row of inviteNotificationQuery.rows) {
      try {
        const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
        if (meta && meta.groupId === groupId) {
          if (meta.role === 'admin' || meta.role === 'member') {
            targetRole = meta.role;
          }
          matchedNotificationId = row.id;
          break;
        }
      } catch (e) {
        // Bỏ qua lỗi parse
      }
    }

    // 4. Thêm thành viên vào nhóm với role thích hợp
    await client.query(
      'INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES ($1, $2, $3, NOW())',
      [groupId, userId, targetRole]
    );

    // 5. Cập nhật lượt dùng mã mời
    const newUsesCount = invite.uses_count + 1;
    const shouldDeactivate = invite.max_uses ? newUsesCount >= invite.max_uses : false;
    await client.query(
      'UPDATE group_invitations SET uses_count = $1, is_active = $2 WHERE id = $3',
      [newUsesCount, !shouldDeactivate, invite.invite_id]
    );

    // 6. Ghi nhận phản hồi accepted
    await client.query(
      `INSERT INTO group_invite_responses (user_id, group_id, status, updated_at)
       VALUES ($1, $2, 'accepted', NOW())
       ON CONFLICT (user_id, group_id) 
       DO UPDATE SET status = 'accepted', updated_at = NOW()`,
      [userId, groupId]
    );

    // Tự động đánh dấu đã đọc lời mời nếu có
    if (matchedNotificationId) {
      await client.query(
        'UPDATE notifications SET is_read = true WHERE id = $1',
        [matchedNotificationId]
      );
    }

    // 7. Tạo và bắn thông báo cho Owner của nhóm
    const notificationId = crypto.randomUUID();
    const notificationTitle = 'New Member Joined';
    const notificationContent = `User ${joinerName} has joined group "${groupName}" via invite code.`;
    
    await client.query(
      `INSERT INTO notifications (id, user_id, title, content, type, is_read, created_at, metadata)
       VALUES ($1, $2, $3, $4, 'group_join', false, NOW(), $5)`,
      [
        notificationId,
        ownerId,
        notificationTitle,
        notificationContent,
        { groupId, groupName, joinerName, userId }
      ]
    );

    await client.query('COMMIT');

    // Bắn thông báo qua WebSocket realtime
    sendNotificationRealtime(ownerId, {
      id: notificationId,
      title: notificationTitle,
      content: notificationContent,
      type: 'group_join',
      is_read: false,
      created_at: new Date().toISOString(),
      metadata: { groupId, groupName, joinerName, userId }
    });

    return { success: true, groupId, groupName };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
