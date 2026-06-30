const jwt = require('jsonwebtoken');

const ACCESS_COOKIE = 'aethercloud_access';
const REFRESH_COOKIE = 'aethercloud_refresh';

function signAccess(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET || 'dev_access_secret', {
    expiresIn: process.env.ACCESS_TOKEN_TTL || '1d',
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

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  signAccess,
  signRefresh,
  verifyAccess,
  verifyRefresh,
  cookieOpts,
};
