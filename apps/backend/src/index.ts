import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import fs from 'fs';

import authRoutes from './routes/auth';
import storageRoutes from './routes/storage';
import assetsRoutes from './routes/assets';
import adminRoutes from './routes/admin';
import spacesRoutes from './routes/spaces';
import groupsRoutes from './routes/groups';
import notificationRoutes from './routes/notifications';

import { resolveStoragePath } from './lib/assets';
import { runOrphanedCleanup } from './lib/cleaner';
import { initWebSocket } from './lib/websocket';

const app = express();
const port = Number(process.env.BE_PORT || 45174);
const configuredOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:45173';
const allowedOrigins = new Set([
  configuredOrigin,
  'http://127.0.0.1:45173',
  'http://localhost:45173',
]);

[
  process.env.MEDIA_LIBRARY_PATH || '/data/library',
  process.env.MEDIA_DERIVED_PATH || '/data/library/derived',
  process.env.MEDIA_TRASH_PATH || '/data/library/trash',
].forEach((p) => fs.mkdirSync(resolveStoragePath(p), { recursive: true }));

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    frameguard: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        frameAncestors: ["'self'", ...Array.from(allowedOrigins)],
      },
    },
  })
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(morgan('combined'));
app.use(express.json({ limit: '25mb' }));
app.use(cookieParser());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'aethercloud-be', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/spaces', spacesRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api', (_req: Request, res: Response) => {
  res.json({
    name: 'AetherCloud API',
    version: '0.1.0',
    endpoints: ['/api/health', '/api/auth/*', '/api/storage/usage'],
  });
});

const server = app.listen(port, () => {
  console.log(`aethercloud-be listening on :${port}`);
  
  // Chạy tự động dọn dẹp file mồ côi (thực hiện xóa thật) khi khởi động server
  runOrphanedCleanup(false).catch((err) => {
    console.error('[Startup] Error running automatic orphaned files cleanup:', err.message);
  });
});

// Khởi chạy máy chủ WebSocket realtime
initWebSocket(server);

