import * as db from '../../lib/db';
import { isValidUUID, getGroupMemberRole, isGroupMember } from '../../lib/utils';
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from '../../lib/errors';

export async function addGroupMember(groupId: string, email: string, role: string, actorUserId: string) {
  if (!isValidUUID(groupId)) {
    throw new ValidationError('groupId is not in valid UUID format');
  }

  if (!email || !email.trim()) {
    throw new ValidationError('Member email cannot be empty');
  }

  if (role === 'owner') {
    throw new ValidationError('Cannot add a member directly as owner');
  }
  if (role !== 'admin' && role !== 'member') {
    throw new ValidationError('Invalid role (admin or member)');
  }

  const actorRole = await getGroupMemberRole(groupId, actorUserId);
  if (actorRole !== 'owner' && actorRole !== 'admin') {
    throw new ForbiddenError('Only the owner or admins can add members');
  }

  if (role === 'admin' && actorRole !== 'owner') {
    throw new ForbiddenError('Only the group owner can assign new admins');
  }

  // Tìm user theo email
  const userRes = await db.query('SELECT id FROM users WHERE email = $1 AND is_active = true LIMIT 1', [email.trim().toLowerCase()]);
  if (userRes.rows.length === 0) {
    throw new NotFoundError('Active user not found with this email');
  }
  const targetUserId = userRes.rows[0].id;

  // Kiểm tra xem đã là thành viên chưa
  if (await isGroupMember(groupId, targetUserId)) {
    throw new ConflictError('This user is already a member of the group');
  }

  await db.query(
    'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)',
    [groupId, targetUserId, role]
  );
}
