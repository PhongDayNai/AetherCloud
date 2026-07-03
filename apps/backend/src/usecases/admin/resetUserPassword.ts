import * as db from '../../lib/db';
import { generateSalt, hashPassword } from '../../lib/auth';
import { isValidUUID } from '../../lib/utils';
import { ValidationError, NotFoundError } from '../../lib/errors';

export async function resetUserPassword(targetUserId: string, tempPassword: any) {
  if (!isValidUUID(targetUserId)) {
    throw new ValidationError('id người dùng không đúng định dạng UUID');
  }

  if (!tempPassword) {
    throw new ValidationError('Yêu cầu mật khẩu tạm thời');
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Kiểm tra xem user có tồn tại không
    const userRes = await client.query('SELECT role FROM users WHERE id = $1', [targetUserId]);
    if (userRes.rows.length === 0) {
      throw new NotFoundError('Không tìm thấy người dùng');
    }

    const salt = generateSalt();
    const newHash = hashPassword(tempPassword, salt);

    // Cập nhật mật khẩu và gán cờ must_change_password = true
    await client.query(`
      UPDATE users 
      SET password_hash = $1, salt = $2, must_change_password = true 
      WHERE id = $3
    `, [newHash, salt, targetUserId]);

    // Đăng xuất user bị reset khỏi tất cả các thiết bị
    await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [targetUserId]);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
