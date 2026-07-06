import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { DomainError } from '../lib/errors';
import * as notificationUsecase from '../usecases/notifications';

const router = express.Router();

// 1. GET danh sách thông báo của user hiện tại
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { isRead } = req.query;
  let filterIsRead: boolean | undefined = undefined;
  
  if (isRead === 'true') filterIsRead = true;
  if (isRead === 'false') filterIsRead = false;

  try {
    const notifications = await notificationUsecase.getUserNotifications(req.user!.sub, filterIsRead);
    return res.json({ ok: true, notifications });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 2. PUT đánh dấu thông báo đã đọc
router.put('/:id/read', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await notificationUsecase.markNotificationAsRead(id, req.user!.sub);
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// 3. DELETE xóa thông báo
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await notificationUsecase.deleteNotification(id, req.user!.sub);
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    if (err instanceof DomainError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

export default router;
