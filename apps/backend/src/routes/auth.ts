import express, { Request, Response } from 'express';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  cookieOpts,
  hashToken,
} from '../lib/auth';
import { requireAuth } from '../middleware/requireAuth';
import { DomainError } from '../lib/errors';
import * as authUsecase from '../usecases/auth';

const router = express.Router();

// 1. Đăng nhập
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  try {
    const { access, refresh, user } = await authUsecase.login(email, password);

    res.cookie(ACCESS_COOKIE, access, cookieOpts());
    res.cookie(REFRESH_COOKIE, refresh, cookieOpts());

    return res.json({ ok: true, user });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error('[Auth Route] Login error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// 2. Đăng ký
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name, invite_code } = req.body || {};
  try {
    const { access, refresh, user } = await authUsecase.register(email, password, name, invite_code);

    res.cookie(ACCESS_COOKIE, access, cookieOpts());
    res.cookie(REFRESH_COOKIE, refresh, cookieOpts());

    return res.json({ ok: true, user });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error('[Auth Route] Register error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// 3. Làm mới Token (Refresh)
router.post('/refresh', async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) return res.status(401).json({ message: 'Missing token' });

  try {
    const { access } = await authUsecase.refresh(token);
    res.cookie(ACCESS_COOKIE, access, cookieOpts());
    return res.json({ ok: true });
  } catch (err: any) {
    // Xóa token lỗi
    try {
      const refreshHash = hashToken(token);
      await authUsecase.logout(token);
    } catch {}
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
});

// 4. Đăng xuất
router.post('/logout', async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  try {
    await authUsecase.logout(token);
  } catch (err) {
    console.error('[Auth Route] Logout token delete error:', err);
  }
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
  return res.json({ ok: true });
});

// 5. Lấy thông tin user hiện tại
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await authUsecase.getMe(req.user.sub);
    return res.json(result);
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Lấy raw Access Token cho WebSocket client (vì WebSocket không hỗ trợ credentials cross-origin)
router.get('/token', requireAuth, (req: Request, res: Response) => {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  return res.json({ ok: true, token });
});

// 6. Đổi mật khẩu
router.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const { old_password, new_password } = req.body || {};
  try {
    await authUsecase.changePassword(req.user.sub, old_password, new_password);
    return res.json({ ok: true, message: 'Password changed successfully' });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error('[Auth Route] Change password error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// 7. Đăng xuất các thiết bị khác (Logout Others)
router.post('/logout-others', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const token = req.cookies?.[REFRESH_COOKIE];
  try {
    await authUsecase.logoutOthers(req.user.sub, token);
    return res.json({ ok: true, message: 'Successfully logged out of other devices' });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error('[Auth Route] Logout others error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// 8. Cập nhật hồ sơ (Đổi tên)
router.post('/update-profile', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const { name } = req.body || {};
  try {
    const { newAccess, user } = await authUsecase.updateProfile(req.user.sub, name);
    res.cookie(ACCESS_COOKIE, newAccess, cookieOpts());
    return res.json({ ok: true, message: 'Profile updated successfully', user });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error('[Auth Route] Update profile error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
