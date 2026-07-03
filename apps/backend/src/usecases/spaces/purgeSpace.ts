import * as db from '../../lib/db';
import { getGroupMemberRole } from '../../lib/utils';
import { NotFoundError, ForbiddenError } from '../../lib/errors';

export async function purgeSpace(spaceId: string, userId: string) {
  const spaceRes = await db.query('SELECT * FROM spaces WHERE id = $1', [spaceId]);
  if (spaceRes.rows.length === 0) {
    throw new NotFoundError('Space not found');
  }
  const space = spaceRes.rows[0];

  let groupRole = null;
  if (space.group_id) {
    groupRole = await getGroupMemberRole(space.group_id, userId);
    if (!groupRole) {
      throw new ForbiddenError('You do not have permission to access the spaces of this group');
    }
  } else {
    if (space.owner_id !== userId) {
      throw new ForbiddenError('You do not have permission to access this space');
    }
  }

  const isSpaceOwner = space.owner_id === userId;
  const isGroupOwner = space.group_id && groupRole === 'owner';

  if (space.group_id) {
    if (!isGroupOwner) {
      throw new ForbiddenError('Only the group owner has permission to permanently delete this space');
    }
  } else {
    if (!isSpaceOwner) {
      throw new ForbiddenError('You do not have permission to permanently delete this space');
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
