import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import * as db from '../lib/db';
import { hashPassword, generateSalt } from '../lib/auth';

async function seedAdmin() {
  const client = await db.pool.connect();
  try {
    const email = (process.env.AUTH_ADMIN_EMAIL || 'admin').trim().toLowerCase();
    const password = process.env.AUTH_ADMIN_PASSWORD || 'change_me_now';
    const name = 'System Admin';
    const role = 'admin';

    console.log(`[Seed] Checking Admin account with email/username "${email}"...`);

    // 1. Kiểm tra xem tài khoản Admin có trùng email đã tồn tại trong DB chưa
    const adminCheckRes = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (adminCheckRes.rows.length > 0) {
      console.log('[Seed] Admin account already exists. Syncing and updating password from .env file...');
      const salt = generateSalt();
      const passwordHash = hashPassword(password, salt);
      
      await client.query(`
        UPDATE users 
        SET password_hash = $1, salt = $2, name = $3, role = $4, is_active = true
        WHERE email = $5
      `, [passwordHash, salt, name, role, email]);
      
      console.log('[Seed] Updated and synced Admin password from .env SUCCESSFUL.');
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

    console.log(`[Seed] Successfully created new Admin account!`);
    console.log(`- Username/Email: ${email}`);
    console.log(`- Role: ${role}`);
    console.log(`- Password: (Retrieved from AUTH_ADMIN_PASSWORD inside .env file)`);
  } catch (err: any) {
    console.error('[Seed] Error seeding Admin account:', err.message);
  } finally {
    client.release();
    db.pool.end();
  }
}

// Chạy seed script
seedAdmin();
