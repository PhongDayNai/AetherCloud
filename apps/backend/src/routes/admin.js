const express = require('express');
const crypto = require('crypto');
const db = require('../lib/db');
const { requireAuth } = require('../middleware/requireAuth');
const { generateSalt, hashPassword } = require('../lib/auth');

const router = express.Router();

// Middleware kiểm tra vai trò admin
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Quyền truy cập bị từ chối: Yêu cầu vai trò Admin' });
  }
  next();
}

// Hàm sinh mã mời 6 ký tự ngẫu nhiên (chữ in hoa và số)
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Áp dụng middleware requireAuth và requireAdmin cho tất cả routes admin
router.use(requireAuth);
router.use(requireAdmin);

// 1. Sinh mã mời đăng ký mới
router.post('/invitations', async (req, res) => {
  const { max_uses, expires_in_hours } = req.body || {};
  
  let maxUses = 1;
  if (max_uses !== undefined) {
    const parsed = parseInt(max_uses, 10);
    maxUses = Number.isNaN(parsed) ? 1 : parsed;
  }

  let expiresAt = null;
  if (expires_in_hours !== undefined) {
    const parsed = parseInt(expires_in_hours, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      expiresAt = new Date(Date.now() + parsed * 60 * 60 * 1000);
    }
  }

  try {
    let token = generateInviteCode();
    let isUnique = false;
    let retries = 0;

    // Đảm bảo token sinh ra là duy nhất trong DB
    while (!isUnique && retries < 10) {
      const checkRes = await db.query('SELECT 1 FROM user_invitations WHERE token = $1', [token]);
      if (checkRes.rows.length === 0) {
        isUnique = true;
      } else {
        token = generateInviteCode();
        retries++;
      }
    }

    if (!isUnique) {
      return res.status(500).json({ message: 'Không thể sinh mã mời độc nhất' });
    }

    const invitationId = crypto.randomUUID();
    await db.query(`
      INSERT INTO user_invitations (id, token, created_by, max_uses, uses_count, is_active, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [invitationId, token, req.user.sub, maxUses === 0 ? null : maxUses, 0, true, expiresAt]);

    return res.json({
      ok: true,
      invitation: {
        id: invitationId,
        token,
        maxUses: maxUses === 0 ? null : maxUses,
        is_active: true,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
      }
    });
  } catch (err) {
    console.error('[Admin API] Create invitation error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
});

// 2. Vô hiệu hóa mã mời chủ động
router.put('/invitations/:id/deactivate', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'UPDATE user_invitations SET is_active = false WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Không tìm thấy mã mời' });
    }

    return res.json({ ok: true, message: 'Đã vô hiệu hóa mã mời thành công' });
  } catch (err) {
    console.error('[Admin API] Deactivate invitation error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
});

// 3. Reset mật khẩu người dùng khác (cấp mật khẩu tạm thời)
router.post('/users/:id/reset-password', async (req, res) => {
  const { id } = req.params;
  const { temp_password } = req.body || {};

  if (!temp_password) {
    return res.status(400).json({ message: 'Yêu cầu mật khẩu tạm thời' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Kiểm tra xem user có tồn tại không
    const userRes = await client.query('SELECT role FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Phòng ngừa: Admin không thể reset mật khẩu của admin khác nếu cần thiết (hoặc cho phép)
    // Ở đây cho phép admin reset nhưng ghi nhận bảo mật
    const salt = generateSalt();
    const newHash = hashPassword(temp_password, salt);

    // Cập nhật mật khẩu và gán cờ must_change_password = true
    await client.query(`
      UPDATE users 
      SET password_hash = $1, salt = $2, must_change_password = true 
      WHERE id = $3
    `, [newHash, salt, id]);

    // Đăng xuất user bị reset khỏi tất cả các thiết bị
    await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [id]);

    await client.query('COMMIT');
    return res.json({ ok: true, message: 'Đã đặt lại mật khẩu và thu hồi tất cả phiên đăng nhập của người dùng' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Admin API] Reset password error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  } finally {
    client.release();
  }
});

module.exports = router;
