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
  const notificationTitle = 'Lời mời tham gia nhóm';
  const notificationContent = `${senderName} đã mời bạn tham gia vào nhóm "${groupName}" với vai trò ${role === 'admin' ? 'Quản trị viên' : 'Thành viên'}.`;

  // Để người dùng có thể Chấp nhận/Từ chối trực tiếp từ Notification, 
  // chúng ta cần cung cấp một mã mời có hiệu lực cho nhóm đó.
  // Ta sẽ tìm xem nhóm đã có mã mời active nào chưa, nếu chưa ta sẽ tự động tạo một mã mời không hết hạn và unlimited sử dụng cho nhóm.
  let inviteToken = '';
  const activeInviteQuery = await db.query(
    'SELECT token FROM group_invitations WHERE group_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1',
    [groupId]
  );
  
  if (activeInviteQuery.rows.length > 0) {
    inviteToken = activeInviteQuery.rows[0].token;
  } else {
    // Tự động sinh một mã mời unlimited
    inviteToken = crypto.randomBytes(6).toString('hex').toUpperCase();
    await db.query(
      `INSERT INTO group_invitations (id, group_id, created_by, token, max_uses, uses_count, is_active, expires_at, created_at)
       VALUES ($1, $2, $3, $4, null, 0, true, null, NOW())`,
      [crypto.randomUUID(), groupId, senderUserId, inviteToken]
    );
  }

  await db.query(
    `INSERT INTO notifications (id, user_id, title, content, type, is_read, created_at, metadata)
     VALUES ($1, $2, $3, $4, 'group_invite', false, NOW(), $5)`,
    [
      notificationId,
      targetUser.id,
      notificationTitle,
      notificationContent,
      { groupId, groupName, senderName, role, token: inviteToken }
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
    metadata: { groupId, groupName, senderName, role, token: inviteToken }
  });

  return { success: true, message: 'Invitation sent successfully' };
}
