import * as db from '../../lib/db';
import { isValidUUID, getGroupMemberRole } from '../../lib/utils';
import { NotFoundError, ForbiddenError, ValidationError } from '../../lib/errors';

export async function updateGroupMemberRole(groupId: string, targetUserId: string, role: string, actorUserId: string) {
  if (!isValidUUID(groupId) || !isValidUUID(targetUserId)) {
    throw new ValidationError('ID không đúng định dạng UUID');
  }

  if (!role || (role !== 'admin' && role !== 'member')) {
    throw new ValidationError('Vai trò cập nhật không hợp lệ (admin hoặc member)');
  }

  const actorRole = await getGroupMemberRole(groupId, actorUserId);
  if (actorRole !== 'owner') {
    throw new ForbiddenError('Chỉ chủ sở hữu nhóm mới có quyền thay đổi vai trò thành viên');
  }

  const targetRole = await getGroupMemberRole(groupId, targetUserId);
  if (!targetRole) {
    throw new NotFoundError('Không tìm thấy thành viên này trong nhóm');
  }
  if (targetRole === 'owner') {
    throw new ValidationError('Không thể thay đổi vai trò của chủ sở hữu nhóm');
  }

  await db.query(
    'UPDATE group_members SET role = $1 WHERE group_id = $2 AND user_id = $3',
    [role, groupId, targetUserId]
  );
}
