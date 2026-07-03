import * as db from '../../lib/db';
import { getGroupMemberRole } from '../../lib/utils';
import { NotFoundError, ForbiddenError, ValidationError } from '../../lib/errors';

export async function updateSpace(spaceId: string, name: string, description: string | undefined, type: string, userId: string) {
  if (!name || !type) {
    throw new ValidationError('Thiếu tên hoặc loại không gian con');
  }

  if (!['journal', 'collection', 'project'].includes(type)) {
    throw new ValidationError('Loại không gian con không hợp lệ');
  }

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
  if (!isSpaceOwner && !isGroupOwner) {
    throw new ForbiddenError('Chỉ người tạo không gian con hoặc chủ sở hữu nhóm mới có quyền thay đổi');
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
