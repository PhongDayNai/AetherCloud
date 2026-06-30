const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_COOKIE = 'aethercloud_access';
const REFRESH_COOKIE = 'aethercloud_refresh';

function signAccess(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET || 'dev_access_secret', {
    expiresIn: process.env.ACCESS_TOKEN_TTL || '15m', // Mặc định Access Token 15 phút
  });
}

function signRefresh(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret', {
    expiresIn: process.env.REFRESH_TOKEN_TTL || '45d',
  });
}

function verifyAccess(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'dev_access_secret');
}

function verifyRefresh(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret');
}

function cookieOpts() {
  const secure = String(process.env.COOKIE_SECURE || 'false') === 'true';
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  };
}

// Băm mật khẩu bằng PBKDF2 với 100,000 iterations và sha512
function hashPassword(password, salt) {
  if (!password || !salt) throw new Error('Missing password or salt for hashing');
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

// Sinh salt ngẫu nhiên 16 bytes dưới dạng chuỗi hex (32 ký tự)
function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

// Băm Refresh Token bằng SHA-256 để lưu trữ an toàn trong DB
function hashToken(token) {
  if (!token) throw new Error('Token is required for hashing');
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  signAccess,
  signRefresh,
  verifyAccess,
  verifyRefresh,
  cookieOpts,
  hashPassword,
  generateSalt,
  hashToken,
};
