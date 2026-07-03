import * as db from '../../lib/db';
import { isValidUUID, getGroupMemberRole } from '../../lib/utils';
import { ValidationError, NotFoundError, ForbiddenError } from '../../lib/errors';

export async function removeGroupMember(groupId: string, targetUserId: string, actorUserId: string) {
  if (!isValidUUID(groupId) || !isValidUUID(targetUserId)) {
    throw new ValidationError('ID không đúng định dạng UUID');
  }

  const targetRole = await getGroupMemberRole(groupId, targetUserId);
  if (!targetRole) {
    throw new NotFoundError('Không tìm thấy thành viên này trong nhóm');
  }

  const actorRole = await getGroupMemberRole(groupId, actorUserId);
  if (!actorRole) {
    throw new ForbiddenError('Bạn không phải là thành viên của nhóm này');
  }

  // Trường hợp 1: Tự rời nhóm
  if (targetUserId === actorUserId) {
    if (targetRole === 'owner') {
      throw new ValidationError('Chủ sở hữu không thể tự rời nhóm. Hãy chuyển quyền sở hữu hoặc xóa nhóm.');
    }
    await db.query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, targetUserId]);
    return 'Bạn đã rời khỏi nhóm thành công';
  }

  // Trường hợp 2: Trục xuất thành viên khác
  if (actorRole !== 'owner' && actorRole !== 'admin') {
    throw new ForbiddenError('Bạn không có quyền trục xuất thành viên');
  }
  // Admin không thể trục xuất Admin khác hoặc Owner
  if (actorRole === 'admin' && (targetRole === 'admin' || targetRole === 'owner')) {
    throw new ForbiddenError('Quản trị viên không thể trục xuất quản trị viên khác hoặc chủ sở hữu');
  }
  if (targetRole === 'owner') {
    throw new ForbiddenError('Không thể trục xuất chủ sở hữu nhóm');
  }

  await db.query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, targetUserId]);
  return 'Đã trục xuất thành viên thành công';
}
