const express = require('express');
const crypto = require('crypto');
const db = require('../lib/db');
const {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  signAccess,
  signRefresh,
  verifyAccess,
  verifyRefresh,
  cookieOpts,
  hashPassword,
  generateSalt,
  hashToken,
} = require('../lib/auth');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

// 1. Đăng nhập
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Thiếu email hoặc mật khẩu' });
  }

  try {
    // Tìm kiếm user trong DB
    const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ message: 'Tài khoản hoặc mật khẩu không chính xác' });
    }

    const user = userRes.rows[0];

    // Kiểm tra trạng thái tài khoản
    if (!user.is_active) {
      return res.status(403).json({ message: 'Tài khoản đã bị khóa' });
    }

    // So khớp mật khẩu băm
    const inputHash = hashPassword(password, user.salt);
    if (inputHash !== user.password_hash) {
      return res.status(401).json({ message: 'Tài khoản hoặc mật khẩu không chính xác' });
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

    res.cookie(ACCESS_COOKIE, access, cookieOpts());
    res.cookie(REFRESH_COOKIE, refresh, cookieOpts());

    return res.json({ 
      ok: true, 
      user: {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.must_change_password
      }
    });
  } catch (err) {
    console.error('[Auth Route] Login error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
});

// 2. Đăng ký
router.post('/register', async (req, res) => {
  const { email, password, name, invite_code } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ message: 'Thiếu thông tin đăng ký bắt buộc' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const allowPublicSignup = String(process.env.ALLOW_PUBLIC_SIGNUP || 'false') === 'true';
    let invitationId = null;

    // A. Kiểm tra mã mời nếu không mở đăng ký công khai
    if (!allowPublicSignup) {
      if (!invite_code) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Yêu cầu mã mời đăng ký' });
      }

      const inviteRes = await client.query(
        'SELECT * FROM user_invitations WHERE token = $1 FOR UPDATE',
        [invite_code.trim().toUpperCase()]
      );

      if (inviteRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Mã mời không tồn tại' });
      }

      const invite = inviteRes.rows[0];

      // Kiểm tra trạng thái hoạt động của mã mời
      if (!invite.is_active) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Mã mời đã bị vô hiệu hóa hoặc dùng hết lượt' });
      }

      // Kiểm tra hạn sử dụng
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Mã mời đã hết hạn sử dụng' });
      }

      // Kiểm tra giới hạn số lần sử dụng
      if (invite.max_uses !== null && invite.uses_count >= invite.max_uses) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Mã mời đã dùng hết số lần tối đa' });
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
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Email đã được sử dụng' });
    }

    // C. Tạo người dùng mới
    const id = crypto.randomUUID();
    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);
    
    // Người dùng đăng ký tự do hoặc qua mã mời mặc định có role = 'user'
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

    res.cookie(ACCESS_COOKIE, access, cookieOpts());
    res.cookie(REFRESH_COOKIE, refresh, cookieOpts());

    return res.json({ ok: true, user: payload });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Auth Route] Register error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  } finally {
    client.release();
  }
});

// 3. Làm mới Token (Refresh)
router.post('/refresh', async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) return res.status(401).json({ message: 'Thiếu token' });

  try {
    const payload = verifyRefresh(token);
    const refreshHash = hashToken(token);

    // Kiểm tra trong database
    const tokenRes = await db.query(
      'SELECT * FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW()',
      [refreshHash]
    );

    if (tokenRes.rows.length === 0) {
      return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }

    // Kiểm tra thông tin người dùng
    const userRes = await db.query('SELECT * FROM users WHERE id = $1', [payload.sub]);
    if (userRes.rows.length === 0 || !userRes.rows[0].is_active) {
      // Hủy token
      await db.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [refreshHash]);
      return res.status(401).json({ message: 'Tài khoản không hoạt động' });
    }

    const user = userRes.rows[0];

    // Cấp access token mới
    const newAccess = signAccess({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      mustChangePassword: user.must_change_password
    });

    res.cookie(ACCESS_COOKIE, newAccess, cookieOpts());
    return res.json({ ok: true });
  } catch (err) {
    // Xóa token lỗi
    try {
      const refreshHash = hashToken(token);
      await db.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [refreshHash]);
    } catch {}
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }
});

// 4. Đăng xuất
router.post('/logout', async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    try {
      const refreshHash = hashToken(token);
      await db.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [refreshHash]);
    } catch (err) {
      console.error('[Auth Route] Logout token delete error:', err);
    }
  }
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
  return res.json({ ok: true });
});

// 5. Lấy thông tin user hiện tại
router.get('/me', requireAuth, async (req, res) => {
  // Lấy dữ liệu mới nhất từ DB để đảm bảo cờ must_change_password cập nhật đúng
  try {
    const userRes = await db.query('SELECT id, email, name, role, must_change_password FROM users WHERE id = $1', [req.user.sub]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ message: 'Người dùng không tồn tại' });
    }
    const user = userRes.rows[0];
    return res.json({
      user: {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.must_change_password
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
});

// 6. Đổi mật khẩu
router.post('/change-password', requireAuth, async (req, res) => {
  const { old_password, new_password } = req.body || {};
  if (!old_password || !new_password) {
    return res.status(400).json({ message: 'Thiếu mật khẩu cũ hoặc mật khẩu mới' });
  }

  try {
    // Lấy thông tin user hiện tại
    const userRes = await db.query('SELECT * FROM users WHERE id = $1', [req.user.sub]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ message: 'Người dùng không tồn tại' });
    }

    const user = userRes.rows[0];

    // Xác thực mật khẩu cũ
    const oldHash = hashPassword(old_password, user.salt);
    if (oldHash !== user.password_hash) {
      return res.status(400).json({ message: 'Mật khẩu cũ không chính xác' });
    }

    // Tạo salt mới và băm mật khẩu mới
    const newSalt = generateSalt();
    const newHash = hashPassword(new_password, newSalt);

    await db.query(
      'UPDATE users SET password_hash = $1, salt = $2, must_change_password = false WHERE id = $3',
      [newHash, newSalt, user.id]
    );

    return res.json({ ok: true, message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    console.error('[Auth Route] Change password error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
});

// 7. Đăng xuất các thiết bị khác (Logout Others)
router.post('/logout-others', requireAuth, async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) return res.status(401).json({ message: 'Thiếu token phiên hiện tại' });

  try {
    const refreshHash = hashToken(token);
    
    // Xóa tất cả token ngoại trừ token hiện tại
    await db.query(
      'DELETE FROM refresh_tokens WHERE user_id = $1 AND token_hash != $2',
      [req.user.sub, refreshHash]
    );

    return res.json({ ok: true, message: 'Đã đăng xuất khỏi các thiết bị khác thành công' });
  } catch (err) {
    console.error('[Auth Route] Logout others error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
});

module.exports = router;
