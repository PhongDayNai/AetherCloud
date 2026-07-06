import crypto from 'crypto';
import * as db from '../../lib/db';
import { ValidationError, ForbiddenError } from '../../lib/errors';
import { getGroupMemberRole } from '../../lib/utils';

export async function createGroupInvitation(
  groupId: string,
  createdBy: string,
  maxUses: number | null,
  expiresInHours: number | null,
  expiresDate: string | null
) {
  // Kiểm tra quyền: Chỉ Owner hoặc Admin của nhóm mới được tạo mã mời
  const userRole = await getGroupMemberRole(groupId, createdBy);
  if (userRole !== 'owner' && userRole !== 'admin') {
    throw new ForbiddenError('Only group owners or admins can create invitations');
  }

  // Ép kiểu dữ liệu đầu vào để phòng ngừa dữ liệu string từ HTTP client
  const parsedMaxUses = maxUses !== null && maxUses !== undefined ? parseInt(String(maxUses), 10) : null;
  const hours = expiresInHours !== null && expiresInHours !== undefined ? parseInt(String(expiresInHours), 10) : null;

  const invitationId = crypto.randomUUID();
  const token = crypto.randomBytes(6).toString('hex').toUpperCase(); // 12 ký tự ngẫu nhiên
  
  let expiresAt: Date | null = null;
  if (hours !== null && !isNaN(hours) && hours > 0) {
    expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + hours);
  } else if (expiresDate) {
    const dateParts = expiresDate.split('-');
    if (dateParts.length === 3) {
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10);
      const day = parseInt(dateParts[2], 10);
      
      if (!isNaN(year) && !isNaN(month) && !isNaN(day) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        expiresAt = new Date(year, month - 1, day, 23, 59, 59, 999);
      } else {
        throw new ValidationError('Invalid expiresDate format. Must be YYYY-MM-DD');
      }
    } else {
      throw new ValidationError('Invalid expiresDate format. Must be YYYY-MM-DD');
    }
  }

  const queryText = `
    INSERT INTO group_invitations (id, group_id, created_by, token, max_uses, uses_count, is_active, expires_at, created_at)
    VALUES ($1, $2, $3, $4, $5, 0, true, $6, NOW())
    RETURNING id, token, max_uses, uses_count, is_active, expires_at, created_at
  `;
  const params = [
    invitationId,
    groupId,
    createdBy,
    token,
    parsedMaxUses === null || isNaN(parsedMaxUses) || parsedMaxUses <= 0 ? null : parsedMaxUses,
    expiresAt
  ];

  const res = await db.query(queryText, params);
  return res.rows[0];
}
