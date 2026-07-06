import * as db from '../../lib/db';

export async function getUserNotifications(
  userId: string, 
  isRead?: boolean, 
  limit: number = 20, 
  offset: number = 0
) {
  let queryText = `
    SELECT id, user_id, title, content, type, is_read, created_at, metadata
    FROM notifications
    WHERE user_id = $1
  `;
  const params: any[] = [userId];
  let paramIndex = 2;

  if (isRead !== undefined) {
    queryText += ` AND is_read = $${paramIndex}`;
    params.push(isRead);
    paramIndex++;
  }

  queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit);
  params.push(offset);

  const res = await db.query(queryText, params);
  return res.rows;
}
