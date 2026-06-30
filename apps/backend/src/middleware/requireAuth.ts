import { Request, Response, NextFunction } from 'express';
import { ACCESS_COOKIE, verifyAccess } from '../lib/auth';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const payload = verifyAccess(token);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}
