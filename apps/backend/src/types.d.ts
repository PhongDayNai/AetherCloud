import * as express from 'express';
import { Asset } from './lib/assets';

declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string;
        email: string;
        role: string;
        name: string;
        mustChangePassword: boolean;
      };
      asset?: Asset;
    }
  }
}
