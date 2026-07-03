import * as db from '../../lib/db';
import crypto from 'crypto';
import {
  signAccess,
  signRefresh,
  hashPassword,
  generateSalt,
  hashToken,
} from '../../lib/auth';
import { ValidationError } from '../../lib/errors';

export async function register(email: any, password: any, name: any, inviteCode: any) {
  if (!email || !password || !name) {
    throw new ValidationError('Required registration fields are missing');
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const allowPublicSignup = String(process.env.ALLOW_PUBLIC_SIGNUP || 'false') === 'true';
    let invitationId: string | null = null;

    // A. Kiểm tra mã mời nếu không mở đăng ký công khai
    if (!allowPublicSignup) {
      if (!inviteCode) {
        throw new ValidationError('Registration invitation code is required');
      }

      const inviteRes = await client.query(
        'SELECT * FROM user_invitations WHERE token = $1 FOR UPDATE',
        [inviteCode.trim().toUpperCase()]
      );

      if (inviteRes.rows.length === 0) {
        throw new ValidationError('Invitation code does not exist');
      }

      const invite = inviteRes.rows[0];

      // Kiểm tra trạng thái hoạt động của mã mời
      if (!invite.is_active) {
        throw new ValidationError('Invitation code is deactivated or fully used');
      }

      // Kiểm tra hạn sử dụng
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        throw new ValidationError('Invitation code has expired');
      }

      // Kiểm tra giới hạn số lần sử dụng
      if (invite.max_uses !== null && invite.uses_count >= invite.max_uses) {
        throw new ValidationError('Invitation code has reached maximum usage limit');
      }

      invitationId = invite.id;

      // Cập nhật uses_count của mã mời
      const newUsesCount = invite.uses_count + 1;
      const shouldDeactivate = invite.max_uses !== null && newUsesCount >= invite.max_uses;

      await client.query(
        'UPDATE user_invitations SET uses_count = $1, is_active = $2 WHERE id = $3',
        [newUsesCount, !shouldDeactivate, invite.id]
      );
    }

    // B. Kiểm tra xem Email đã tồn tại chưa
    const emailLower = email.trim().toLowerCase();
    const dupRes = await client.query('SELECT 1 FROM users WHERE email = $1', [emailLower]);
    if (dupRes.rows.length > 0) {
      throw new ValidationError('Email is already in use');
    }

    // C. Tạo người dùng mới
    const id = crypto.randomUUID();
    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);
    
    await client.query(`
      INSERT INTO users (id, email, password_hash, salt, name, role, must_change_password, is_active, invitation_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [id, emailLower, passwordHash, salt, name.trim(), 'user', false, true, invitationId]);

    await client.query('COMMIT');

    // D. Đăng nhập tự động sau khi đăng ký
    const payload = { sub: id, email: emailLower, role: 'user', name: name.trim(), mustChangePassword: false };
    const access = signAccess(payload);
    const refresh = signRefresh(payload);

    const refreshTokenId = crypto.randomUUID();
    const refreshHash = hashToken(refresh);
    const expiresAt = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);

    await db.query(
      'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
      [refreshTokenId, id, refreshHash, expiresAt]
    );

    return {
      access,
      refresh,
      user: payload
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
