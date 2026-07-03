import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import * as db from '../lib/db';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function createInvite() {
  const args = process.argv.slice(2);
  const maxUsesInput = args[0]; // Đối số 1: Số lần dùng tối đa
  const hoursToExpireInput = args[1]; // Đối số 2: Hạn sử dụng (giờ)

  let maxUses = 1; // Mặc định là dùng 1 lần
  if (maxUsesInput !== undefined) {
    const parsed = parseInt(maxUsesInput, 10);
    maxUses = Number.isNaN(parsed) ? 1 : parsed;
  }

  let expiresAt: Date | null = null;
  if (hoursToExpireInput !== undefined) {
    const parsed = parseInt(hoursToExpireInput, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      expiresAt = new Date(Date.now() + parsed * 60 * 60 * 1000);
    }
  }

  const client = await db.pool.connect();
  try {
    // 1. Tìm Admin đầu tiên trong database để gán làm người tạo
    const adminRes = await client.query("SELECT id FROM users WHERE role = 'admin' AND is_active = true LIMIT 1");
    if (adminRes.rows.length === 0) {
      console.error('[Error] No active Admin account found in the system.');
      console.error('Please run seed script first to create Admin: npm run seed:admin (or node src/scripts/seed-admin.js)');
      return;
    }
    const adminId = adminRes.rows[0].id;

    // 2. Sinh mã mời 6 ký tự độc nhất
    let token = generateInviteCode();
    let isUnique = false;
    let retries = 0;

    while (!isUnique && retries < 10) {
      const checkRes = await client.query('SELECT 1 FROM user_invitations WHERE token = $1', [token]);
      if (checkRes.rows.length === 0) {
        isUnique = true;
      } else {
        token = generateInviteCode();
        retries++;
      }
    }

    if (!isUnique) {
      throw new Error('Cannot generate unique invitation token after multiple attempts.');
    }

    // 3. Lưu vào cơ sở dữ liệu
    const invitationId = crypto.randomUUID();
    await client.query(`
      INSERT INTO user_invitations (id, token, created_by, max_uses, uses_count, is_active, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [invitationId, token, adminId, maxUses === 0 ? null : maxUses, 0, true, expiresAt]);

    console.log(`\n=== REGISTRATION INVITATION CODE CREATED SUCCESSFULLY ===`);
    console.log(`INVITATION CODE: ${token}`);
    console.log(`Max Uses: ${maxUses === 0 ? 'Unlimited' : maxUses}`);
    console.log(`Expires At: ${expiresAt ? expiresAt.toLocaleString() : 'Never expires'}`);
    console.log(`=========================================================\n`);

  } catch (err: any) {
    console.error('[Error] Error creating invitation code:', err.message);
  } finally {
    client.release();
    db.pool.end();
  }
}

createInvite();
