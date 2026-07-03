import express, { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { isValidUUID, getGroupMemberRole } from '../lib/utils';
import { DomainError } from '../lib/errors';
import * as groupUsecase from '../usecases/groups';

const router = express.Router();

// Middleware kiểm tra quyền thành viên nhóm
export async function requireGroupMember(req: Request, res: Response, next: NextFunction) {
  const groupId = req.params.groupId || req.body.groupId || req.query.groupId;
  if (!groupId) {
    return res.status(400).json({ message: 'Thiếu ID nhóm (groupId)' });
  }

  if (!isValidUUID(groupId)) {
    return res.status(400).json({ message: 'groupId không đúng định dạng UUID' });
  }

  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const role = await getGroupMemberRole(groupId, req.user.sub);
    if (!role) {
      return res.status(403).json({ message: 'Bạn không phải là thành viên của nhóm này' });
    }
    req.groupRole = role; // Lưu vai trò để dùng ở các handler sau
    next();
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}

// 1. GET danh sách nhóm của user hiện tại
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const groups = await groupUsecase.getUserGroups(req.user?.sub);
    return res.json({ ok: true, groups });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 1b. GET chi tiết nhóm (yêu cầu là thành viên)
router.get('/:groupId', requireAuth, requireGroupMember, async (req: Request, res: Response) => {
  try {
    const group = await groupUsecase.getGroupDetails(req.params.groupId, req.user?.sub);
    return res.json({ ok: true, group });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 2. POST tạo nhóm mới
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const group = await groupUsecase.createGroup(req.body?.name, req.user?.sub);
    return res.json({ ok: true, group });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 3. GET danh sách thành viên trong nhóm
router.get('/:groupId/members', requireAuth, requireGroupMember, async (req: Request, res: Response) => {
  try {
    const members = await groupUsecase.getGroupMembers(req.params.groupId, req.user?.sub);
    return res.json({ ok: true, members });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 4. POST thêm thành viên vào nhóm qua email
router.post('/:groupId/members', requireAuth, requireGroupMember, async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { email, role = 'member' } = req.body || {};
  try {
    await groupUsecase.addGroupMember(groupId, email, role, req.user?.sub);
    return res.json({ ok: true, message: 'Thêm thành viên thành công' });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 5. PUT cập nhật vai trò thành viên
router.put('/:groupId/members/:userId', requireAuth, requireGroupMember, async (req: Request, res: Response) => {
  const { groupId, userId } = req.params;
  const { role } = req.body || {};
  try {
    await groupUsecase.updateGroupMemberRole(groupId, userId, role, req.user?.sub);
    return res.json({ ok: true, message: 'Cập nhật vai trò thành công' });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 5b. POST nhượng quyền sở hữu nhóm (Transfer Group Ownership)
router.post('/:groupId/owner', requireAuth, requireGroupMember, async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { targetUserId } = req.body || {};
  try {
    await groupUsecase.transferGroupOwnership(groupId, targetUserId, req.user?.sub);
    return res.json({ ok: true, message: 'Chuyển nhượng quyền sở hữu nhóm thành công. Vai trò mới của bạn là Quản trị viên.' });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 6. DELETE xóa thành viên hoặc tự rời nhóm
router.delete('/:groupId/members/:userId', requireAuth, requireGroupMember, async (req: Request, res: Response) => {
  const { groupId, userId } = req.params;
  try {
    const message = await groupUsecase.removeGroupMember(groupId, userId, req.user?.sub);
    return res.json({ ok: true, message });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 7. DELETE xóa nhóm (chỉ Owner nhóm mới được xóa)
router.delete('/:groupId', requireAuth, requireGroupMember, async (req: Request, res: Response) => {
  const { groupId } = req.params;
  try {
    await groupUsecase.deleteGroup(groupId, req.user?.sub);
    return res.json({ ok: true, message: 'Đã xóa nhóm thành công' });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

export default router;
