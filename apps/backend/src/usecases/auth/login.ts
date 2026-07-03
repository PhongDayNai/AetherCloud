import * as db from '../../lib/db';
import crypto from 'crypto';
import {
  signAccess,
  signRefresh,
  hashPassword,
  hashToken,
} from '../../lib/auth';
import { ValidationError, ForbiddenError } from '../../lib/errors';

export async function login(email: any, password: any) {
  if (!email || !password) {
    throw new ValidationError('Email or password is missing');
  }

  // Tìm kiếm user trong DB
  const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
  if (userRes.rows.length === 0) {
    throw new ValidationError('Incorrect email or password');
  }

  const user = userRes.rows[0];

  // Kiểm tra trạng thái tài khoản
  if (!user.is_active) {
    throw new ForbiddenError('Account is locked');
  }

  // So khớp mật khẩu băm
  const inputHash = hashPassword(password, user.salt);
  if (inputHash !== user.password_hash) {
    throw new ValidationError('Incorrect email or password');
  }

  // Tạo JWT Tokens
  const payload = { 
    sub: user.id, 
    email: user.email, 
    role: user.role, 
    name: user.name,
    mustChangePassword: user.must_change_password 
  };
  const access = signAccess(payload);
  const refresh = signRefresh(payload);

  // Lưu hash Refresh Token vào DB
  const refreshTokenId = crypto.randomUUID();
  const refreshHash = hashToken(refresh);
  
  // Tính thời gian hết hạn Refresh Token (ví dụ: 45 ngày)
  const expiresAt = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);

  await db.query(
    'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
    [refreshTokenId, user.id, refreshHash, expiresAt]
  );

  // Cập nhật last_login_at
  await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

  return {
    access,
    refresh,
    user: {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.must_change_password
    }
  };
}
