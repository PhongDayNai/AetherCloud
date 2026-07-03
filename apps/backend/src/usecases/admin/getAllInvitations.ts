import * as db from '../../lib/db';

export async function getAllInvitations() {
  const result = await db.query(`
    SELECT i.*, u.email as creator_email, u.name as creator_name
    FROM user_invitations i
    JOIN users u ON i.created_by = u.id
    ORDER BY i.created_at DESC
  `);
  return result.rows;
}
