import * as db from '../../lib/db';
import { isValidUUID, isGroupMember } from '../../lib/utils';
import { ForbiddenError, ValidationError } from '../../lib/errors';

export async function getGroupMembers(groupId: string, userId: string) {
  if (!isValidUUID(groupId)) {
    throw new ValidationError('groupId không đúng định dạng UUID');
  }

  const isMember = await isGroupMember(groupId, userId);
  if (!isMember) {
    throw new ForbiddenError('Bạn không phải là thành viên của nhóm này');
  }

  const result = await db.query(
    `SELECT gm.user_id, gm.role, gm.joined_at, u.name, u.email 
     FROM group_members gm
     JOIN users u ON gm.user_id = u.id
     WHERE gm.group_id = $1
     ORDER BY 
       CASE gm.role 
         WHEN 'owner' THEN 1 
         WHEN 'admin' THEN 2 
         ELSE 3 
       END, 
       gm.joined_at ASC`,
    [groupId]
  );
  return result.rows;
}
