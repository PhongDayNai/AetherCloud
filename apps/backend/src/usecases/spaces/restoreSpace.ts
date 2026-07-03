import * as db from '../../lib/db';
import { getGroupMemberRole } from '../../lib/utils';
import { NotFoundError, ForbiddenError } from '../../lib/errors';

export async function restoreSpace(spaceId: string, userId: string) {
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
  const isGroupOwnerOrAdmin = space.group_id && (groupRole === 'owner' || groupRole === 'admin');
  if (!isSpaceOwner && !isGroupOwnerOrAdmin) {
    throw new ForbiddenError('Only the space creator or group admins have permission to restore it');
  }

  await db.query(
    'UPDATE spaces SET is_deleted = false, deleted_at = null WHERE id = $1',
    [spaceId]
  );
}
