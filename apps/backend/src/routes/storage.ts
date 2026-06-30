import express, { Request, Response } from 'express';
import { getStorageUsage } from '../lib/storage';
import { requireAuth } from '../middleware/requireAuth';

const router = express.Router();

router.get('/usage', requireAuth, async (_req: Request, res: Response) => {
  try {
    const usage = await getStorageUsage();
    return res.json(usage);
  } catch (e: any) {
    return res.status(500).json({ message: e.message });
  }
});

export default router;
