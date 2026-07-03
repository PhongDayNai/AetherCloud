import * as db from '../../lib/db';
import { NotFoundError } from '../../lib/errors';

export async function getMe(userId: string) {
  const userRes = await db.query('SELECT id, email, name, role, must_change_password, avatar_url FROM users WHERE id = $1', [userId]);
  if (userRes.rows.length === 0) {
    throw new NotFoundError('Người dùng không tồn tại');
  }
  const user = userRes.rows[0];
  return {
    user: {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.must_change_password,
      avatarUrl: user.avatar_url
    }
  };
}
