import * as db from '../../lib/db';
import { isValidUUID, getGroupMemberRole, isGroupMember } from '../../lib/utils';
import { ValidationError, ForbiddenError } from '../../lib/errors';

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
