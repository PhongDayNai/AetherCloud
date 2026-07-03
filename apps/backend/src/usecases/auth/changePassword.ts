import * as db from '../../lib/db';
import { hashPassword, generateSalt } from '../../lib/auth';
import { ValidationError, NotFoundError } from '../../lib/errors';

export async function changePassword(userId: string, oldPassword: any, newPassword: any) {
  if (!oldPassword || !newPassword) {
    throw new ValidationError('Old password or new password is missing');
  }

  const userRes = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  if (userRes.rows.length === 0) {
    throw new NotFoundError('User does not exist');
  }

  const user = userRes.rows[0];

  // Xác thực mật khẩu cũ
  const oldHash = hashPassword(oldPassword, user.salt);
  if (oldHash !== user.password_hash) {
    throw new ValidationError('Incorrect old password');
  }

  // Tạo salt mới và băm mật khẩu mới
  const newSalt = generateSalt();
  const newHash = hashPassword(newPassword, newSalt);

  await db.query(
    'UPDATE users SET password_hash = $1, salt = $2, must_change_password = false WHERE id = $3',
    [newHash, newSalt, user.id]
  );
}
