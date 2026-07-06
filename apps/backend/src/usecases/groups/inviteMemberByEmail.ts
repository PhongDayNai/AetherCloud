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
    throw new ValidationError('User with this email does not exist.', 'USER_NOT_FOUND');
  }
  const targetUser = userQuery.rows[0];

  // 5. Kiểm tra xem user được mời đã là thành viên của nhóm chưa
  const memberCheck = await db.query(
    'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, targetUser.id]
  );
  if (memberCheck.rows.length > 0) {
    throw new ConflictError('This user is already a member of the group.', 'ALREADY_MEMBER');
  }

  // 5b. Kiểm tra xem đã có lời mời trùng lặp đang chờ phản hồi gửi tới user này chưa (chưa accept/decline và chưa hết hạn)
  const pendingInviteCheck = await db.query(
    `SELECT id, metadata FROM notifications 
     WHERE user_id = $1 
       AND type = 'group_invite' 
       AND (metadata->>'groupId') = $2 
       AND (metadata->>'status' IS NULL OR metadata->>'status' = '')`,
    [targetUser.id, groupId]
  );
  
  let hasActivePending = false;
  const now = new Date();
  for (const row of pendingInviteCheck.rows) {
    try {
      const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
      if (meta && meta.expiresAt) {
        const isExpired = new Date(meta.expiresAt) < now;
        if (!isExpired) {
          hasActivePending = true;
          break;
        }
      } else {
        hasActivePending = true;
        break;
      }
    } catch (e) {
      // Bỏ qua lỗi parse
    }
  }

  if (hasActivePending) {
    throw new ConflictError('This user already has a pending invitation to join this group.', 'PENDING_INVITE_EXISTS');
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
  const inviteToken = crypto.randomBytes(32).toString('hex');

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
