import crypto from 'crypto';
import * as db from '../../lib/db';
import { isValidUUID, getGroupMemberRole } from '../../lib/utils';
import { ForbiddenError, ValidationError } from '../../lib/errors';

export async function createSpace(name: string, description: string | undefined, type: string, groupId: string | undefined, userId: string) {
  if (!name || !type) {
    throw new ValidationError('Name or type of space is missing');
  }

  if (!['journal', 'collection', 'project'].includes(type)) {
    throw new ValidationError('Invalid space type');
  }

  if (groupId && !isValidUUID(groupId)) {
    throw new ValidationError('groupId is not in valid UUID format');
  }

  if (groupId) {
    const role = await getGroupMemberRole(groupId, userId);
    if (!role) {
      throw new ForbiddenError('You are not a member of this group');
    }
    if (role !== 'owner' && role !== 'admin') {
      throw new ForbiddenError('Only the group owner or admins can create a shared space');
    }

    const id = crypto.randomUUID();
    const result = await db.query(
      `INSERT INTO spaces (id, name, description, type, owner_id, group_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, name.trim(), description ? description.trim() : null, type, userId, groupId]
    );
    return result.rows[0];
  } else {
    const id = crypto.randomUUID();
    const result = await db.query(
      `INSERT INTO spaces (id, name, description, type, owner_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, name.trim(), description ? description.trim() : null, type, userId]
    );
    return result.rows[0];
  }
}
