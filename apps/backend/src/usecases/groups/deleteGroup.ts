import * as db from '../../lib/db';
import { isValidUUID, getGroupMemberRole } from '../../lib/utils';
import { ValidationError, ForbiddenError } from '../../lib/errors';

export async function deleteGroup(groupId: string, actorUserId: string) {
  if (!isValidUUID(groupId)) {
    throw new ValidationError('groupId is not in valid UUID format');
  }

  const actorRole = await getGroupMemberRole(groupId, actorUserId);
  if (actorRole !== 'owner') {
    throw new ForbiddenError('Only the group owner can delete the group');
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Xóa tất cả assets thuộc nhóm (sau đó cleaner sẽ dọn dẹp file vật lý mồ côi)
    await client.query('DELETE FROM assets WHERE group_id = $1', [groupId]);

    // Xóa tất cả các thông báo liên quan đến nhóm bị xóa
    await client.query("DELETE FROM notifications WHERE (metadata->>'groupId') = $1", [groupId]);

    // Xóa nhóm (sẽ tự động CASCADE xóa group_members, spaces, group_invitations của nhóm)
    await client.query('DELETE FROM groups WHERE id = $1', [groupId]);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
