import * as db from '../../lib/db';
import { NotFoundError } from '../../lib/errors';

export async function deleteNotification(notificationId: string, userId: string) {
  const check = await db.query(
    'SELECT id FROM notifications WHERE id = $1 AND user_id = $2',
    [notificationId, userId]
  );

  if (check.rows.length === 0) {
    throw new NotFoundError('Notification not found');
  }

  await db.query(
    'DELETE FROM notifications WHERE id = $1',
    [notificationId]
  );

  return { success: true };
}
