import * as db from '../../lib/db';

export async function getUserNotifications(userId: string, isRead?: boolean) {
  let queryText = `
    SELECT id, user_id, title, content, type, is_read, created_at, metadata
    FROM notifications
    WHERE user_id = $1
  `;
  const params: any[] = [userId];

  if (isRead !== undefined) {
    queryText += ' AND is_read = $2';
    params.push(isRead);
  }

  queryText += ' ORDER BY created_at DESC';

  const res = await db.query(queryText, params);
  return res.rows;
}
