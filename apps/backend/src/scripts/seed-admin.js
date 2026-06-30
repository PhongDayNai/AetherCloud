require('dotenv').config();
const crypto = require('crypto');
const db = require('../lib/db');
const { hashPassword, generateSalt } = require('../lib/auth');

async function seedAdmin() {
  const client = await db.pool.connect();
  try {
    const email = (process.env.AUTH_ADMIN_EMAIL || 'admin').trim().toLowerCase();
    const password = process.env.AUTH_ADMIN_PASSWORD || 'change_me_now';
    const name = 'System Admin';
    const role = 'admin';

    console.log(`[Seed] Đang kiểm tra tài khoản Admin với email/username là "${email}"...`);

    // 1. Kiểm tra xem tài khoản Admin có trùng email đã tồn tại trong DB chưa
    const adminCheckRes = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (adminCheckRes.rows.length > 0) {
      console.log('[Seed] Tài khoản Admin đã tồn tại. Đang đồng bộ cập nhật mật khẩu mới từ tệp .env...');
      const salt = generateSalt();
      const passwordHash = hashPassword(password, salt);
      
      await client.query(`
        UPDATE users 
        SET password_hash = $1, salt = $2, name = $3, role = $4, is_active = true
        WHERE email = $5
      `, [passwordHash, salt, name, role, email]);
      
      console.log('[Seed] Cập nhật và đồng bộ mật khẩu Admin từ .env THÀNH CÔNG.');
      return;
    }

    // 2. Nếu chưa tồn tại, tạo mới
    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);
    const id = crypto.randomUUID();

    await client.query(`
      INSERT INTO users (id, email, password_hash, salt, name, role, must_change_password, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, email, passwordHash, salt, name, role, false, true]);

    console.log(`[Seed] Đã tạo mới tài khoản Admin thành công!`);
    console.log(`- Username/Email: ${email}`);
    console.log(`- Role: ${role}`);
    console.log(`- Mật khẩu: (Lấy từ cấu hình AUTH_ADMIN_PASSWORD trong file .env)`);
  } catch (err) {
    console.error('[Seed] Lỗi khi seed tài khoản Admin:', err.message);
  } finally {
    client.release();
    db.pool.end();
  }
}

// Chạy seed script
seedAdmin();
