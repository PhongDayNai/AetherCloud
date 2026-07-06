import express, { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { isValidUUID, getGroupMemberRole } from '../lib/utils';
import { DomainError } from '../lib/errors';
import * as groupUsecase from '../usecases/groups';
import jwt from 'jsonwebtoken';
import { ACCESS_COOKIE, verifyAccess } from '../lib/auth';
import * as db from '../lib/db';

const router = express.Router();

// Middleware kiểm tra quyền thành viên nhóm
export async function requireGroupMember(req: Request, res: Response, next: NextFunction) {
  const groupId = req.params.groupId || req.body.groupId || req.query.groupId;
  if (!groupId) {
    return res.status(400).json({ message: 'Missing group ID (groupId)' });
  }

  if (!isValidUUID(groupId)) {
    return res.status(400).json({ message: 'groupId is not in valid UUID format' });
  }

  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const role = await getGroupMemberRole(groupId, req.user.sub);
    if (!role) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }
    req.groupRole = role; // Lưu vai trò để dùng ở các handler sau
    next();
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}

/* =========================================================================
   A. CÁC ROUTE VỀ MÃ MỜI NHÓM TĨNH (Đặt lên trước để tránh xung đột route :groupId)
   ========================================================================= */

// 1. GET kiểm tra và lấy thông tin chi tiết lời mời gia nhập (Public hoặc Auth tùy ALLOW_PUBLIC_SIGNUP)
router.get('/invitations/:token', async (req: Request, res: Response) => {
  const { token } = req.params;
  let userId: string | undefined;
  
  // 1. Kiểm tra qua Cookie trước (Cơ chế chính của Web App)
  const tokenCookie = req.cookies?.[ACCESS_COOKIE];
  if (tokenCookie) {
    try {
      const payload = verifyAccess(tokenCookie);
      userId = payload.sub;
    } catch (e) {
      // Bỏ qua lỗi
    }
  }

  // 2. Kiểm tra qua Authorization Header (Dự phòng cho API client)
  if (!userId) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const jwtToken = authHeader.substring(7);
      try {
        const decoded: any = jwt.verify(jwtToken, process.env.JWT_ACCESS_SECRET || 'replace_with_long_random_access_secret');
        userId = decoded.sub;
      } catch (e) {
        // Bỏ qua lỗi token
      }
    }
  }

  try {
    const details = await groupUsecase.getGroupInvitationDetails(token, userId);
    return res.json({ ok: true, ...details });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 2. POST chấp nhận lời mời gia nhập nhóm
router.post('/invitations/:token/accept', requireAuth, async (req: Request, res: Response) => {
  const { token } = req.params;
  try {
    const result = await groupUsecase.acceptGroupInvitation(token, req.user!.sub);
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    if (err instanceof DomainError) {
      // Nếu mã mời hết hạn (400) hoặc không tồn tại/đã bị xóa (404), tự động đánh dấu đã đọc các thông báo mời liên quan
      if (err.statusCode === 400 || err.statusCode === 404) {
        try {
          const groupQuery = await db.query('SELECT group_id FROM group_invitations WHERE token = $1', [token]);
          if (groupQuery.rows.length > 0) {
            const groupId = groupQuery.rows[0].group_id;
            await db.query(
              `UPDATE notifications 
               SET is_read = true 
               WHERE user_id = $1 AND type = 'group_invite' AND is_read = false AND (metadata->>'groupId') = $2`,
              [req.user!.sub, groupId]
            );
          }
        } catch (e) {
          // Bỏ qua lỗi phụ
        }
      }
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 3. POST từ chối lời mời gia nhập nhóm
router.post('/invitations/:token/decline', requireAuth, async (req: Request, res: Response) => {
  const { token } = req.params;
  try {
    const result = await groupUsecase.declineGroupInvitation(token, req.user!.sub);
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    if (err instanceof DomainError) {
      // Tương tự, tự động đánh dấu đã đọc nếu lời mời hết hạn hoặc không tồn tại
      if (err.statusCode === 400 || err.statusCode === 404) {
        try {
          const groupQuery = await db.query('SELECT group_id FROM group_invitations WHERE token = $1', [token]);
          if (groupQuery.rows.length > 0) {
            const groupId = groupQuery.rows[0].group_id;
            await db.query(
              `UPDATE notifications 
               SET is_read = true 
               WHERE user_id = $1 AND type = 'group_invite' AND is_read = false AND (metadata->>'groupId') = $2`,
              [req.user!.sub, groupId]
            );
          }
        } catch (e) {
          // Bỏ qua lỗi phụ
        }
      }
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 4. PUT khóa thủ công mã mời
router.put('/invitations/:id/deactivate', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await groupUsecase.deactivateGroupInvitation(id, req.user!.sub);
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

/* =========================================================================
   B. CÁC ROUTE NHÓM (GROUPS & MEMBERS)
   ========================================================================= */

// 5. GET danh sách nhóm của user hiện tại
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const groups = await groupUsecase.getUserGroups(req.user!.sub);
    return res.json({ ok: true, groups });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 6. POST tạo nhóm mới
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const group = await groupUsecase.createGroup(req.body?.name, req.user!.sub);
    return res.json({ ok: true, group });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 7. GET chi tiết nhóm (yêu cầu là thành viên)
router.get('/:groupId', requireAuth, requireGroupMember, async (req: Request, res: Response) => {
  try {
    const group = await groupUsecase.getGroupDetails(req.params.groupId, req.user!.sub);
    return res.json({ ok: true, group });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 8. GET danh sách thành viên trong nhóm
router.get('/:groupId/members', requireAuth, requireGroupMember, async (req: Request, res: Response) => {
  try {
    const members = await groupUsecase.getGroupMembers(req.params.groupId, req.user!.sub);
    return res.json({ ok: true, members });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 9. POST thêm thành viên vào nhóm trực tiếp (không qua lời mời)
router.post('/:groupId/members', requireAuth, requireGroupMember, async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { email, role = 'member' } = req.body || {};
  try {
    await groupUsecase.addGroupMember(groupId, email, role, req.user!.sub);
    return res.json({ ok: true, message: 'Member added successfully' });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 10. PUT cập nhật vai trò thành viên
router.put('/:groupId/members/:userId', requireAuth, requireGroupMember, async (req: Request, res: Response) => {
  const { groupId, userId } = req.params;
  const { role } = req.body || {};
  try {
    await groupUsecase.updateGroupMemberRole(groupId, userId, role, req.user!.sub);
    return res.json({ ok: true, message: 'Role updated successfully' });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 11. POST nhượng quyền sở hữu nhóm (Transfer Group Ownership)
router.post('/:groupId/owner', requireAuth, requireGroupMember, async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { targetUserId } = req.body || {};
  try {
    await groupUsecase.transferGroupOwnership(groupId, targetUserId, req.user!.sub);
    return res.json({ ok: true, message: 'Group ownership transferred successfully. Your new role is Admin.' });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 12. DELETE xóa thành viên
router.delete('/:groupId/members/:userId', requireAuth, requireGroupMember, async (req: Request, res: Response) => {
  const { groupId, userId } = req.params;
  try {
    const message = await groupUsecase.removeGroupMember(groupId, userId, req.user!.sub);
    return res.json({ ok: true, message });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 13. POST tạo mã mời cho nhóm (chỉ cho phép owner/admin nhóm)
router.post('/:groupId/invitations', requireAuth, requireGroupMember, async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { maxUses = null, expiresInHours = null, expiresDate = null } = req.body || {};
  try {
    const invitation = await groupUsecase.createGroupInvitation(
      groupId,
      req.user!.sub,
      maxUses,
      expiresInHours,
      expiresDate
    );
    return res.json({ ok: true, invitation });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 14. GET danh sách mã mời đã tạo cho nhóm (chỉ cho phép owner/admin nhóm)
router.get('/:groupId/invitations', requireAuth, requireGroupMember, async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { limit, offset } = req.query;
  const parsedLimit = parseInt(limit as string) || 20;
  const parsedOffset = parseInt(offset as string) || 0;

  try {
    const invitations = await groupUsecase.getGroupInvitations(
      groupId, 
      req.user!.sub,
      parsedLimit,
      parsedOffset
    );
    return res.json({ ok: true, invitations });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 15. POST mời trực tiếp qua Email
router.post('/:groupId/invite-email', requireAuth, requireGroupMember, async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { email, role = 'member' } = req.body || {};
  try {
    const result = await groupUsecase.inviteMemberByEmail(groupId, email, role, req.user!.sub);
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 16. POST tự rời khỏi nhóm
router.post('/:groupId/leave', requireAuth, async (req: Request, res: Response) => {
  const { groupId } = req.params;
  try {
    const result = await groupUsecase.leaveGroup(groupId, req.user!.sub);
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 17. DELETE xóa nhóm (chỉ Owner nhóm mới được xóa)
router.delete('/:groupId', requireAuth, requireGroupMember, async (req: Request, res: Response) => {
  const { groupId } = req.params;
  try {
    await groupUsecase.deleteGroup(groupId, req.user!.sub);
    return res.json({ ok: true, message: 'Group deleted successfully' });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

export default router;
