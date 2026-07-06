import crypto from 'crypto';
import * as db from '../../lib/db';
import { isValidUUID, getGroupMemberRole } from '../../lib/utils';
import { NotFoundError, ForbiddenError, ValidationError } from '../../lib/errors';
import { sendNotificationRealtime } from '../../lib/websocket';

export async function updateGroupMemberRole(groupId: string, targetUserId: string, role: string, actorUserId: string) {
  if (!isValidUUID(groupId) || !isValidUUID(targetUserId)) {
    throw new ValidationError('ID is not in valid UUID format');
  }

  if (!role || (role !== 'admin' && role !== 'member')) {
    throw new ValidationError('Invalid updated role (admin or member)');
  }

  const actorRole = await getGroupMemberRole(groupId, actorUserId);
  if (actorRole !== 'owner') {
    throw new ForbiddenError('Only the group owner can change member roles');
  }

  const targetRole = await getGroupMemberRole(groupId, targetUserId);
  if (!targetRole) {
    throw new NotFoundError('Member not found in the group');
  }
  if (targetRole === 'owner') {
    throw new ValidationError('Cannot change the role of the group owner');
  }

  // Lấy tên nhóm
  const groupQuery = await db.query('SELECT name FROM groups WHERE id = $1', [groupId]);
  if (groupQuery.rows.length === 0) {
    throw new NotFoundError('Group not found');
  }
  const groupName = groupQuery.rows[0].name;

  // Thực hiện cập nhật
  await db.query(
    'UPDATE group_members SET role = $1 WHERE group_id = $2 AND user_id = $3',
    [role, groupId, targetUserId]
  );

  // Tạo thông báo gửi cho thành viên được cập nhật vai trò
  const notificationId = crypto.randomUUID();
  const notificationTitle = 'Cập nhật vai trò trong nhóm';
  const notificationContent = `Vai trò của bạn trong nhóm "${groupName}" đã được thay đổi thành ${role === 'admin' ? 'Quản trị viên' : 'Thành viên'}.`;
  
  await db.query(
    `INSERT INTO notifications (id, user_id, title, content, type, is_read, created_at, metadata)
     VALUES ($1, $2, $3, $4, 'system', false, NOW(), $5)`,
    [notificationId, targetUserId, notificationTitle, notificationContent, { groupId, groupName, role }]
  );

  // Bắn WebSocket realtime tới thành viên đó
  sendNotificationRealtime(targetUserId, {
    id: notificationId,
    title: notificationTitle,
    content: notificationContent,
    type: 'system',
    is_read: false,
    created_at: new Date().toISOString(),
    metadata: { groupId, groupName, role }
  });
}
