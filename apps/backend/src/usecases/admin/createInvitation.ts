import crypto from 'crypto';
import * as db from '../../lib/db';
import { ValidationError, DomainError } from '../../lib/errors';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createInvitation(maxUsesInput: any, expiresAtInput: any, expiresInHours: any, creatorUserId: string) {
  let maxUses = 1;
  if (maxUsesInput !== undefined) {
    const parsed = parseInt(maxUsesInput, 10);
    maxUses = Number.isNaN(parsed) ? 1 : parsed;
  }

  let expiresAt: Date | null = null;
  if (expiresAtInput !== undefined && expiresAtInput !== null) {
    expiresAt = new Date(expiresAtInput);
  } else if (expiresInHours !== undefined) {
    const parsed = parseInt(expiresInHours, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      expiresAt = new Date(Date.now() + parsed * 60 * 60 * 1000);
    }
  }

  let token = generateInviteCode();
  let isUnique = false;
  let retries = 0;

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
    throw new DomainError('Không thể sinh mã mời độc nhất', 500);
  }

  const invitationId = crypto.randomUUID();
  await db.query(`
    INSERT INTO user_invitations (id, token, created_by, max_uses, uses_count, is_active, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [invitationId, token, creatorUserId, maxUses === 0 ? null : maxUses, 0, true, expiresAt]);

  return {
    id: invitationId,
    token,
    maxUses: maxUses === 0 ? null : maxUses,
    is_active: true,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
  };
}
