import * as db from '../../lib/db';
import { ValidationError, NotFoundError, DomainError } from '../../lib/errors';

export async function getGroupInvitationDetails(token: string, userId?: string) {
  const allowPublicSignup = process.env.ALLOW_PUBLIC_SIGNUP !== 'false';
  
  if (!allowPublicSignup && !userId) {
    throw new DomainError('Authentication required to view this invitation', 401);
  }

  // Lấy chi tiết mã mời và nhóm
  const inviteQuery = await db.query(
    `SELECT gi.id as invite_id, gi.group_id, gi.is_active, gi.expires_at, gi.max_uses, gi.uses_count,
            g.name as group_name, u.name as owner_name
     FROM group_invitations gi
     JOIN groups g ON gi.group_id = g.id
     JOIN users u ON g.owner_id = u.id
     WHERE gi.token = $1`,
    [token]
  );

  if (inviteQuery.rows.length === 0) {
    throw new NotFoundError('Invitation link is invalid or has been deleted');
  }

  const invite = inviteQuery.rows[0];

  // Kiểm tra tính hợp lệ của mã mời (hết hạn hoặc bị khóa)
  const now = new Date();
  const isExpired = invite.expires_at ? new Date(invite.expires_at) < now : false;
  const isLimitReached = invite.max_uses ? invite.uses_count >= invite.max_uses : false;

  if (!invite.is_active || isExpired || isLimitReached) {
    throw new ValidationError('This invitation link has expired or been deactivated');
  }

  // Đếm số thành viên nhóm
  const memberCountQuery = await db.query(
    'SELECT COUNT(*)::int as count FROM group_members WHERE group_id = $1',
    [invite.group_id]
  );
  const memberCount = memberCountQuery.rows[0].count;

  // Kiểm tra trạng thái của user hiện tại trong nhóm (nếu đã đăng nhập)
  let userStatus = 'none'; // 'none' | 'joined'
  if (userId) {
    const memberCheck = await db.query(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [invite.group_id, userId]
    );
    if (memberCheck.rows.length > 0) {
      userStatus = 'joined';
    }
  }

  return {
    group: {
      id: invite.group_id,
      name: invite.group_name,
      owner_name: invite.owner_name,
      member_count: memberCount
    },
    userStatus,
    invite_id: invite.invite_id
  };
}
