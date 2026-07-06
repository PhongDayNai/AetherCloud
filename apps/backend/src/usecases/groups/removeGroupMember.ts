import crypto from 'crypto';
import * as db from '../../lib/db';
import { isValidUUID, getGroupMemberRole } from '../../lib/utils';
import { ValidationError, NotFoundError, ForbiddenError } from '../../lib/errors';
import { leaveGroup } from './leaveGroup';
import { sendNotificationRealtime } from '../../lib/websocket';

export async function removeGroupMember(groupId: string, targetUserId: string, actorUserId: string) {
  if (!isValidUUID(groupId) || !isValidUUID(targetUserId)) {
    throw new ValidationError('ID is not in valid UUID format');
  }

  const targetRole = await getGroupMemberRole(groupId, targetUserId);
  if (!targetRole) {
    throw new NotFoundError('Member not found in the group');
  }

  const actorRole = await getGroupMemberRole(groupId, actorUserId);
  if (!actorRole) {
    throw new ForbiddenError('You are not a member of this group');
  }

  // Trường hợp 1: Tự rời nhóm
  if (targetUserId === actorUserId) {
    const result = await leaveGroup(groupId, targetUserId);
    return result.message;
  }

  // Trường hợp 2: Trục xuất thành viên khác
  if (actorRole !== 'owner' && actorRole !== 'admin') {
    throw new ForbiddenError('You do not have permission to remove members');
  }
  // Admin không thể trục xuất Admin khác hoặc Owner
  if (actorRole === 'admin' && (targetRole === 'admin' || targetRole === 'owner')) {
    throw new ForbiddenError('Admins cannot remove other admins or the owner');
  }
  if (targetRole === 'owner') {
    throw new ForbiddenError('Cannot remove the group owner');
  }

  // Lấy thông tin nhóm name và tên actor
  const infoQuery = await db.query(
    `SELECT g.name as group_name, g.owner_id as group_owner_id, u.name as actor_name
     FROM groups g, users u
     WHERE g.id = $1 AND u.id = $2`,
    [groupId, actorUserId]
  );
  
  if (infoQuery.rows.length === 0) {
    throw new NotFoundError('Group or Actor not found');
  }
  
  const { group_name: groupName, group_owner_id: ownerId, actor_name: actorName } = infoQuery.rows[0];

  // Thực hiện xóa
  await db.query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, targetUserId]);

  // Dọn dẹp các thông báo mời chưa đọc gửi cho thành viên bị trục xuất liên quan đến nhóm này
  await db.query(
    "DELETE FROM notifications WHERE user_id = $1 AND type = 'group_invite' AND (metadata->>'groupId') = $2",
    [targetUserId, groupId]
  );

  // 1. Tạo thông báo gửi cho người bị trục xuất
  const kickNotificationId = crypto.randomUUID();
  const kickTitle = 'Group Notification';
  const kickContent = `You have been removed from group "${groupName}" by ${actorName}.`;
  await db.query(
    `INSERT INTO notifications (id, user_id, title, content, type, is_read, created_at, metadata)
     VALUES ($1, $2, $3, $4, 'group_kick', false, NOW(), $5)`,
    [kickNotificationId, targetUserId, kickTitle, kickContent, { groupId, groupName }]
  );
  
  sendNotificationRealtime(targetUserId, {
    id: kickNotificationId,
    title: kickTitle,
    content: kickContent,
    type: 'group_kick',
    is_read: false,
    created_at: new Date().toISOString(),
    metadata: { groupId, groupName }
  });

  // 2. Nếu người thực hiện trục xuất là Admin (không phải Owner), gửi thông báo báo cáo cho Owner nhóm
  if (actorUserId !== ownerId) {
    const targetUserQuery = await db.query('SELECT name FROM users WHERE id = $1', [targetUserId]);
    const targetName = targetUserQuery.rows[0]?.name || 'Member';

    const reportNotificationId = crypto.randomUUID();
    const reportTitle = 'Member Expelled';
    const reportContent = `Admin ${actorName} has removed member ${targetName} from group "${groupName}".`;
    await db.query(
      `INSERT INTO notifications (id, user_id, title, content, type, is_read, created_at, metadata)
       VALUES ($1, $2, $3, $4, 'group_kick', false, NOW(), $5)`,
      [reportNotificationId, ownerId, reportTitle, reportContent, { groupId, groupName, actorName, targetName }]
    );
    
    sendNotificationRealtime(ownerId, {
      id: reportNotificationId,
      title: reportTitle,
      content: reportContent,
      type: 'group_kick',
      is_read: false,
      created_at: new Date().toISOString(),
      metadata: { groupId, groupName, actorName, targetName }
    });
  }

  return 'Successfully removed member from the group';
}
