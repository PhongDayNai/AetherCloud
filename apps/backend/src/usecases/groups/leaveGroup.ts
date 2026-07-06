import crypto from 'crypto';
import * as db from '../../lib/db';
import { ForbiddenError, NotFoundError } from '../../lib/errors';
import { getGroupMemberRole } from '../../lib/utils';
import { sendNotificationRealtime } from '../../lib/websocket';

export async function leaveGroup(groupId: string, userId: string) {
  const userRole = await getGroupMemberRole(groupId, userId);
  if (!userRole) {
    throw new NotFoundError('You are not a member of this group');
  }

  if (userRole === 'owner') {
    throw new ForbiddenError('Group owners cannot leave the group. You must transfer ownership or disband the group first.');
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Lấy thông tin user name và group name
    const infoQuery = await client.query(
      `SELECT u.name as user_name, g.name as group_name, g.owner_id as group_owner_id
       FROM users u, groups g
       WHERE u.id = $1 AND g.id = $2`,
      [userId, groupId]
    );

    if (infoQuery.rows.length === 0) {
      throw new NotFoundError('User or group not found');
    }

    const { user_name: userName, group_name: groupName, group_owner_id: ownerId } = infoQuery.rows[0];

    // Xóa khỏi bảng group_members
    await client.query(
      'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    // Dọn dẹp các thông báo mời chưa phản hồi gửi cho thành viên tự rời nhóm liên quan đến nhóm này
    await client.query(
      `DELETE FROM notifications 
       WHERE user_id = $1 
         AND type = 'group_invite' 
         AND (metadata->>'groupId') = $2 
         AND (metadata->>'status' IS NULL OR metadata->>'status' = '')`,
      [userId, groupId]
    );

    // Tạo thông báo cho Owner nhóm
    const notificationId = crypto.randomUUID();
    const notificationTitle = 'Member Left Group';
    const notificationContent = `User ${userName} has left group "${groupName}".`;

    await client.query(
      `INSERT INTO notifications (id, user_id, title, content, type, is_read, created_at, metadata)
       VALUES ($1, $2, $3, $4, 'group_leave', false, NOW(), $5)`,
      [
        notificationId,
        ownerId,
        notificationTitle,
        notificationContent,
        { groupId, groupName, userName, userId }
      ]
    );

    await client.query('COMMIT');

    // Bắn thông báo realtime tới Owner nhóm
    sendNotificationRealtime(ownerId, {
      id: notificationId,
      title: notificationTitle,
      content: notificationContent,
      type: 'group_leave',
      is_read: false,
      created_at: new Date().toISOString(),
      metadata: { groupId, groupName, userName, userId }
    });

    return { success: true, message: 'You have left the group successfully' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
