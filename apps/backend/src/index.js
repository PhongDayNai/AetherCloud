require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const storageRoutes = require('./routes/storage');
const assetsRoutes = require('./routes/assets');
const adminRoutes = require('./routes/admin');

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
].forEach((p) => fs.mkdirSync(p, { recursive: true }));

app.use(helmet({ crossOriginResourcePolicy: false }));
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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'aethercloud-be', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api', (_req, res) => {
  res.json({
    name: 'AetherCloud API',
    version: '0.1.0',
    endpoints: ['/api/health', '/api/auth/*', '/api/storage/usage'],
  });
});

app.listen(port, () => {
  console.log(`aethercloud-be listening on :${port}`);
});
