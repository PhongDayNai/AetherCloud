import * as db from '../../lib/db';
import {
  signAccess,
  verifyRefresh,
  hashToken,
} from '../../lib/auth';
import { ValidationError } from '../../lib/errors';

export async function refresh(token: string) {
  if (!token) {
    throw new ValidationError('Token is missing');
  }

  const payload = verifyRefresh(token);
  const refreshHash = hashToken(token);

  // Kiểm tra trong database
  const tokenRes = await db.query(
    'SELECT * FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW()',
    [refreshHash]
  );

  if (tokenRes.rows.length === 0) {
    throw new ValidationError('Token is invalid or expired');
  }

  // Kiểm tra thông tin người dùng
  const userRes = await db.query('SELECT * FROM users WHERE id = $1', [payload.sub]);
  if (userRes.rows.length === 0 || !userRes.rows[0].is_active) {
    // Hủy token
    await db.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [refreshHash]);
    throw new ValidationError('Account is inactive');
  }

  const user = userRes.rows[0];

  // Cập nhật lại Access Token mới
  const newAccess = signAccess({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    mustChangePassword: user.must_change_password
  });

  return { access: newAccess };
}
