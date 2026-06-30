import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { CookieOptions } from 'express';

export const ACCESS_COOKIE = 'aethercloud_access';
export const REFRESH_COOKIE = 'aethercloud_refresh';

export function signAccess(payload: any): string {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET || 'dev_access_secret', {
    expiresIn: process.env.ACCESS_TOKEN_TTL || '15m', // Mặc định Access Token 15 phút
  });
}

export function signRefresh(payload: any): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret', {
    expiresIn: process.env.REFRESH_TOKEN_TTL || '45d',
  });
}

export function verifyAccess(token: string): any {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'dev_access_secret');
}

export function verifyRefresh(token: string): any {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret');
}

export function cookieOpts(): CookieOptions {
  const secure = String(process.env.COOKIE_SECURE || 'false') === 'true';
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  };
}

// Băm mật khẩu bằng PBKDF2 với 100,000 iterations và sha512
export function hashPassword(password: string, salt: string): string {
  if (!password || !salt) throw new Error('Missing password or salt for hashing');
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

// Sinh salt ngẫu nhiên 16 bytes dưới dạng chuỗi hex (32 ký tự)
export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Băm Refresh Token bằng SHA-256 để lưu trữ an toàn trong DB
export function hashToken(token: string): string {
  if (!token) throw new Error('Token is required for hashing');
  return crypto.createHash('sha256').update(token).digest('hex');
}
