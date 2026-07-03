import * as db from '../../lib/db';
import { getGroupMemberRole } from '../../lib/utils';
import { NotFoundError, ForbiddenError, ValidationError } from '../../lib/errors';

export async function updateSpace(spaceId: string, name: string, description: string | undefined, type: string, userId: string) {
  if (!name || !type) {
    throw new ValidationError('Name or type of space is missing');
  }

  if (!['journal', 'collection', 'project'].includes(type)) {
    throw new ValidationError('Invalid space type');
  }

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
  if (!isSpaceOwner && !isGroupOwner) {
    throw new ForbiddenError('Only the space creator or group owner has permission to change it');
  }

  const result = await db.query(
    `UPDATE spaces 
     SET name = $1, description = $2, type = $3
     WHERE id = $4
     RETURNING *`,
    [name.trim(), description ? description.trim() : null, type, spaceId]
  );
  return result.rows[0];
}
