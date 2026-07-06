import crypto from 'crypto';
import * as db from '../../lib/db';
import { ForbiddenError, NotFoundError, ValidationError, ConflictError } from '../../lib/errors';
import { getGroupMemberRole } from '../../lib/utils';
import { sendNotificationRealtime } from '../../lib/websocket';

export async function inviteMemberByEmail(
  groupId: string,
  email: string,
  role: string = 'member',
  senderUserId: string
) {
  // 1. Kiểm tra quyền: Chỉ Owner hoặc Admin của nhóm mới được mời
  const senderRole = await getGroupMemberRole(groupId, senderUserId);
  if (senderRole !== 'owner' && senderRole !== 'admin') {
    throw new ForbiddenError('Only group owners or admins can invite members');
  }

  const cleanEmail = email.trim().toLowerCase();

  // 2. Tìm người gửi (sender) name
  const senderQuery = await db.query('SELECT name FROM users WHERE id = $1', [senderUserId]);
  const senderName = senderQuery.rows[0]?.name || 'Quản trị viên';

  // 3. Tìm nhóm name
  const groupQuery = await db.query('SELECT name FROM groups WHERE id = $1', [groupId]);
  if (groupQuery.rows.length === 0) {
    throw new NotFoundError('Group not found');
  }
  const groupName = groupQuery.rows[0].name;

  // 4. Tìm kiếm người dùng được mời
  const userQuery = await db.query('SELECT id, name FROM users WHERE email = $1', [cleanEmail]);
  if (userQuery.rows.length === 0) {
    throw new ValidationError('Người dùng với email này không tồn tại trên hệ thống');
  }
  const targetUser = userQuery.rows[0];

  // 5. Kiểm tra xem user được mời đã là thành viên của nhóm chưa
  const memberCheck = await db.query(
    'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, targetUser.id]
  );
  if (memberCheck.rows.length > 0) {
    throw new ConflictError('Người dùng này đã là thành viên của nhóm');
  }

  // 5b. Kiểm tra xem đã có lời mời trùng lặp chưa đọc gửi tới user này chưa
  const pendingInviteCheck = await db.query(
    `SELECT id FROM notifications 
     WHERE user_id = $1 AND type = 'group_invite' AND is_read = false AND (metadata->>'groupId') = $2`,
    [targetUser.id, groupId]
  );
  if (pendingInviteCheck.rows.length > 0) {
    throw new ConflictError('Đã có một lời mời chưa phản hồi được gửi tới người dùng này');
  }


  // 6. Tạo lời mời dưới dạng một Notification cho user đích
  const notificationId = crypto.randomUUID();
  const notificationTitle = 'Group Invitation';
  const notificationContent = `${senderName} has invited you to join group "${groupName}" as ${role}.`;

  // Để người dùng có thể Chấp nhận/Từ chối trực tiếp từ Notification,
  // chúng ta tạo một mã mời nhóm riêng biệt dành riêng cho lần mời này:
  // - Chỉ dùng được đúng 1 lần (max_uses = 1)
  // - Hết hạn sau đúng 24 giờ
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  // const expiresAt = new Date(Date.now() + 1 * 60 * 1000);
  const inviteToken = crypto.randomBytes(6).toString('hex').toUpperCase();

  await db.query(
    `INSERT INTO group_invitations (id, group_id, created_by, token, max_uses, uses_count, is_active, expires_at, created_at)
     VALUES ($1, $2, $3, $4, 1, 0, true, $5, NOW())`,
    [crypto.randomUUID(), groupId, senderUserId, inviteToken, expiresAt]
  );

  const inviteMetadata = {
    groupId,
    groupName,
    senderName,
    role,
    token: inviteToken,
    expiresAt: expiresAt.toISOString()
  };

  await db.query(
    `INSERT INTO notifications (id, user_id, title, content, type, is_read, created_at, metadata)
     VALUES ($1, $2, $3, $4, 'group_invite', false, NOW(), $5)`,
    [
      notificationId,
      targetUser.id,
      notificationTitle,
      notificationContent,
      inviteMetadata
    ]
  );

  // Bắn thông báo realtime
  sendNotificationRealtime(targetUser.id, {
    id: notificationId,
    title: notificationTitle,
    content: notificationContent,
    type: 'group_invite',
    is_read: false,
    created_at: new Date().toISOString(),
    metadata: inviteMetadata
  });

  return { success: true, message: 'Invitation sent successfully' };
}
