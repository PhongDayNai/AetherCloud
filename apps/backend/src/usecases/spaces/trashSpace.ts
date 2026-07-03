import * as db from '../../lib/db';
import { getGroupMemberRole } from '../../lib/utils';
import { NotFoundError, ForbiddenError } from '../../lib/errors';

export async function trashSpace(spaceId: string, userId: string) {
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
  const isGroupOwnerOrAdmin = space.group_id && (groupRole === 'owner' || groupRole === 'admin');
  if (!isSpaceOwner && !isGroupOwnerOrAdmin) {
    throw new ForbiddenError('Chỉ người tạo không gian con hoặc quản trị viên nhóm mới có quyền xóa tạm thời');
  }

  await db.query(
    'UPDATE spaces SET is_deleted = true, deleted_at = NOW() WHERE id = $1',
    [spaceId]
  );
}
