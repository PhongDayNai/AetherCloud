import crypto from 'crypto';
import * as db from '../../lib/db';
import { isValidUUID, getGroupMemberRole } from '../../lib/utils';
import { ForbiddenError, ValidationError } from '../../lib/errors';

export async function createSpace(name: string, description: string | undefined, type: string, groupId: string | undefined, userId: string) {
  if (!name || !type) {
    throw new ValidationError('Thiếu tên hoặc loại không gian con');
  }

  if (!['journal', 'collection', 'project'].includes(type)) {
    throw new ValidationError('Loại không gian con không hợp lệ');
  }

  if (groupId && !isValidUUID(groupId)) {
    throw new ValidationError('groupId không đúng định dạng UUID');
  }

  if (groupId) {
    const role = await getGroupMemberRole(groupId, userId);
    if (!role) {
      throw new ForbiddenError('Bạn không phải là thành viên của nhóm này');
    }
    if (role !== 'owner' && role !== 'admin') {
      throw new ForbiddenError('Chỉ chủ sở hữu hoặc quản trị viên nhóm mới được tạo không gian con chung');
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
