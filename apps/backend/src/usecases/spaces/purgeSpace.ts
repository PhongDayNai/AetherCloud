import * as db from '../../lib/db';
import { getGroupMemberRole } from '../../lib/utils';
import { NotFoundError, ForbiddenError } from '../../lib/errors';

export async function purgeSpace(spaceId: string, userId: string) {
  const spaceRes = await db.query('SELECT * FROM spaces WHERE id = $1', [spaceId]);
  if (spaceRes.rows.length === 0) {
    throw new NotFoundError('Không tìm thấy không gian con này');
  }
  const space = spaceRes.rows[0];

  let groupRole = null;
  if (space.group_id) {
    groupRole = await getGroupMemberRole(space.group_id, userId);
    if (!groupRole) {
      throw new ForbiddenError('Bạn không có quyền truy cập không gian con của nhóm này');
    }
  } else {
    if (space.owner_id !== userId) {
      throw new ForbiddenError('Bạn không có quyền truy cập không gian con này');
    }
  }

  const isSpaceOwner = space.owner_id === userId;
  const isGroupOwner = space.group_id && groupRole === 'owner';

  if (space.group_id) {
    if (!isGroupOwner) {
      throw new ForbiddenError('Chỉ chủ sở hữu nhóm mới có quyền xóa vĩnh viễn không gian con chung');
    }
  } else {
    if (!isSpaceOwner) {
      throw new ForbiddenError('Bạn không có quyền xóa vĩnh viễn không gian con này');
    }
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM spaces WHERE id = $1', [spaceId]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
