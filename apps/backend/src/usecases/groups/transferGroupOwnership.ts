import crypto from 'crypto';
import * as db from '../../lib/db';
import { isValidUUID, getGroupMemberRole, isGroupMember } from '../../lib/utils';
import { ValidationError, ForbiddenError, NotFoundError } from '../../lib/errors';
import { sendNotificationRealtime } from '../../lib/websocket';

export async function transferGroupOwnership(groupId: string, targetUserId: string, actorUserId: string) {
  if (!isValidUUID(groupId) || !isValidUUID(targetUserId)) {
    throw new ValidationError('ID is not in valid UUID format');
  }

  const actorRole = await getGroupMemberRole(groupId, actorUserId);
  if (actorRole !== 'owner') {
    throw new ForbiddenError('Only the current group owner can transfer group ownership');
  }

  if (targetUserId === actorUserId) {
    throw new ValidationError('You are already the owner of this group');
  }

  if (!(await isGroupMember(groupId, targetUserId))) {
    throw new ValidationError('The transferee must be a member of the group');
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Lấy thông tin nhóm name, tên actor và tên target user
    const infoQuery = await client.query(
      `SELECT 
         g.name as group_name, 
         u1.name as actor_name,
         u2.name as target_name
       FROM groups g
       JOIN users u1 ON u1.id = $2
       JOIN users u2 ON u2.id = $3
       WHERE g.id = $1`,
      [groupId, actorUserId, targetUserId]
    );
    
    if (infoQuery.rows.length === 0) {
      throw new NotFoundError('Group, Actor, or Target User not found');
    }
    
    const { group_name: groupName, actor_name: actorName, target_name: targetName } = infoQuery.rows[0];

    // 1. Cập nhật owner_id trong bảng groups
    await client.query(
      'UPDATE groups SET owner_id = $1 WHERE id = $2',
      [targetUserId, groupId]
    );

    // 2. Nâng cấp người nhận thành 'owner' trong group_members
    await client.query(
      "UPDATE group_members SET role = 'owner' WHERE group_id = $1 AND user_id = $2",
      [groupId, targetUserId]
    );

    // 3. Hạ cấp owner cũ (user hiện tại) xuống thành 'admin'
    await client.query(
      "UPDATE group_members SET role = 'admin' WHERE group_id = $1 AND user_id = $2",
      [groupId, actorUserId]
    );

    // 4. Tạo thông báo cho chủ sở hữu mới
    const notificationId = crypto.randomUUID();
    const notificationTitle = 'Group Ownership Transferred';
    const notificationContent = `You have been promoted to Owner of group "${groupName}" by ${actorName}.`;
    
    await client.query(
      `INSERT INTO notifications (id, user_id, title, content, type, is_read, created_at, metadata)
       VALUES ($1, $2, $3, $4, 'group_owner_transfer', false, NOW(), $5)`,
      [notificationId, targetUserId, notificationTitle, notificationContent, { groupId, groupName, newOwnerName: targetName }]
    );

    await client.query('COMMIT');

    // Gửi WebSocket realtime tới chủ sở hữu mới
    sendNotificationRealtime(targetUserId, {
      id: notificationId,
      title: notificationTitle,
      content: notificationContent,
      type: 'group_owner_transfer',
      is_read: false,
      created_at: new Date().toISOString(),
      metadata: { groupId, groupName, newOwnerName: targetName }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
