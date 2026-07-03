import * as db from '../../lib/db';
import { isValidUUID, getGroupMemberRole, isGroupMember } from '../../lib/utils';
import { ValidationError, ForbiddenError } from '../../lib/errors';

export async function transferGroupOwnership(groupId: string, targetUserId: string, actorUserId: string) {
  if (!isValidUUID(groupId) || !isValidUUID(targetUserId)) {
    throw new ValidationError('ID không đúng định dạng UUID');
  }

  const actorRole = await getGroupMemberRole(groupId, actorUserId);
  if (actorRole !== 'owner') {
    throw new ForbiddenError('Chỉ chủ sở hữu nhóm hiện tại mới có quyền chuyển nhượng nhóm');
  }

  if (targetUserId === actorUserId) {
    throw new ValidationError('Bạn đã là chủ sở hữu của nhóm này');
  }

  if (!(await isGroupMember(groupId, targetUserId))) {
    throw new ValidationError('Người nhận chuyển nhượng phải là thành viên của nhóm');
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

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

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
