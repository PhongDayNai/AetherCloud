import * as db from '../../lib/db';
import { hashToken } from '../../lib/auth';
import { ValidationError } from '../../lib/errors';

export async function logoutOthers(userId: string, token: string) {
  if (!token) {
    throw new ValidationError('Thiếu token phiên hiện tại');
  }

  const refreshHash = hashToken(token);
  
  // Xóa tất cả token ngoại trừ token hiện tại
  await db.query(
    'DELETE FROM refresh_tokens WHERE user_id = $1 AND token_hash != $2',
    [userId, refreshHash]
  );
}
