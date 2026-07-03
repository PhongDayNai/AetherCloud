import express, { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { DomainError } from '../lib/errors';
import * as adminUsecase from '../usecases/admin';

const router = express.Router();

// Middleware kiểm tra vai trò admin
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Admin role required' });
  }
  next();
}

// Áp dụng middleware requireAuth và requireAdmin cho tất cả routes admin
router.use(requireAuth);
router.use(requireAdmin);

// 1. Sinh mã mời đăng ký mới
router.post('/invitations', async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const { max_uses, expires_in_hours, expires_at } = req.body || {};
  try {
    const invitation = await adminUsecase.createInvitation(max_uses, expires_at, expires_in_hours, req.user.sub);
    return res.json({ ok: true, invitation });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
});

// 1.5. Lấy danh sách toàn bộ mã mời
router.get('/invitations', async (req: Request, res: Response) => {
  try {
    const invitations = await adminUsecase.getAllInvitations();
    return res.json({ ok: true, invitations });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
});

// 2. Vô hiệu hóa mã mời chủ động
router.put('/invitations/:id/deactivate', async (req: Request, res: Response) => {
  try {
    await adminUsecase.deactivateInvitation(req.params.id);
    return res.json({ ok: true, message: 'Successfully deactivated invitation code' });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
});

// 3. Reset mật khẩu người dùng khác (cấp mật khẩu tạm thời)
router.post('/users/:id/reset-password', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { temp_password } = req.body || {};
  try {
    await adminUsecase.resetUserPassword(id, temp_password);
    return res.json({ ok: true, message: 'Successfully reset user password and revoked all active sessions' });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
});

export default router;
