import * as db from '../../lib/db';

export async function getUserGroups(userId: string) {
  const result = await db.query(
    `SELECT g.id, g.name, g.owner_id, g.created_at, gm.role 
     FROM groups g
     JOIN group_members gm ON g.id = gm.group_id
     WHERE gm.user_id = $1
     ORDER BY g.created_at DESC`,
    [userId]
  );
  return result.rows;
}
