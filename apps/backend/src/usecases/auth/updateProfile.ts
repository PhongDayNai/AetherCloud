import * as db from '../../lib/db';
import { signAccess } from '../../lib/auth';
import { ValidationError } from '../../lib/errors';

export async function updateProfile(userId: string, name: any) {
  if (!name || !name.trim()) {
    throw new ValidationError('Display name cannot be empty');
  }

  await db.query('UPDATE users SET name = $1 WHERE id = $2', [name.trim(), userId]);

  // Trả về thông tin user mới
  const userRes = await db.query('SELECT id, email, name, role, must_change_password, avatar_url FROM users WHERE id = $1', [userId]);
  const user = userRes.rows[0];

  // Tạo Access Token mới chứa Name mới để đồng bộ các nơi
  const newAccess = signAccess({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    mustChangePassword: user.must_change_password
  });

  return {
    newAccess,
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
