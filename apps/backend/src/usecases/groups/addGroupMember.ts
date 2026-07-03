import * as db from '../../lib/db';
import { isValidUUID, getGroupMemberRole, isGroupMember } from '../../lib/utils';
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from '../../lib/errors';

export async function addGroupMember(groupId: string, email: string, role: string, actorUserId: string) {
  if (!isValidUUID(groupId)) {
    throw new ValidationError('groupId không đúng định dạng UUID');
  }

  if (!email || !email.trim()) {
    throw new ValidationError('Email thành viên không được để trống');
  }

  if (role === 'owner') {
    throw new ValidationError('Không thể thêm trực tiếp thành viên với vai trò chủ sở hữu');
  }
  if (role !== 'admin' && role !== 'member') {
    throw new ValidationError('Vai trò không hợp lệ (admin hoặc member)');
  }

  const actorRole = await getGroupMemberRole(groupId, actorUserId);
  if (actorRole !== 'owner' && actorRole !== 'admin') {
    throw new ForbiddenError('Chỉ chủ sở hữu hoặc quản trị viên mới được thêm thành viên');
  }

  if (role === 'admin' && actorRole !== 'owner') {
    throw new ForbiddenError('Chỉ chủ sở hữu nhóm mới có quyền chỉ định quản trị viên mới');
  }

  // Tìm user theo email
  const userRes = await db.query('SELECT id FROM users WHERE email = $1 AND is_active = true LIMIT 1', [email.trim().toLowerCase()]);
  if (userRes.rows.length === 0) {
    throw new NotFoundError('Không tìm thấy người dùng hoạt động với email này');
  }
  const targetUserId = userRes.rows[0].id;

  // Kiểm tra xem đã là thành viên chưa
  if (await isGroupMember(groupId, targetUserId)) {
    throw new ConflictError('Người dùng này đã là thành viên của nhóm');
  }

  await db.query(
    'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)',
    [groupId, targetUserId, role]
  );
}
