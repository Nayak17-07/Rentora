const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true });
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getDb } = require('./db');

let secretKey = process.env.JWT_SECRET || process.env.SECRET_KEY;

if (!secretKey || secretKey.includes('django-insecure') || secretKey.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL SECURITY ERROR: A secure, high-entropy JWT_SECRET (min 32 characters) must be configured in production environment.');
  } else {
    // In development: initialize a stable in-memory 256-bit cryptographically secure secret
    if (!global.__rentora_dev_secret) {
      global.__rentora_dev_secret = crypto.randomBytes(32).toString('hex');
    }
    secretKey = global.__rentora_dev_secret;
  }
}

const SECRET_KEY = secretKey;

function getCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  const match = header.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function setAuthCookies(res, tokens) {
  const isProd = process.env.NODE_ENV === 'production';
  const sameSite = isProd ? 'Strict' : 'Lax';
  const secureFlag = isProd ? '; Secure' : '';

  res.setHeader('Set-Cookie', [
    `access_token=${tokens.access}; HttpOnly; Path=/; Max-Age=3600; SameSite=${sameSite}${secureFlag}`,
    `refresh_token=${tokens.refresh}; HttpOnly; Path=/; Max-Age=86400; SameSite=${sameSite}${secureFlag}`
  ]);
}

function clearAuthCookies(res) {
  res.setHeader('Set-Cookie', [
    'access_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax',
    'refresh_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax'
  ]);
}

function makePassword(password) {
  const salt = crypto.randomBytes(16).toString('base64').replace(/=/g, '');
  const iterations = 100000; // Calibrated for secure, responsive hashing
  const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  return `pbkdf2_sha256$${iterations}$${salt}$${derivedKey.toString('base64')}`;
}

function checkPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false;
  if (storedHash.startsWith('pbkdf2_sha256$')) {
    const parts = storedHash.split('$');
    if (parts.length === 4) {
      const iterations = parseInt(parts[1], 10);
      const salt = parts[2];
      const hash = parts[3];
      if (!iterations || !salt || !hash) return false;
      const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
      try {
        const hashBuf = Buffer.from(hash, 'base64');
        if (derivedKey.length !== hashBuf.length) return false;
        return crypto.timingSafeEqual(derivedKey, hashBuf);
      } catch (e) {
        return false;
      }
    }
  }
  // Non-PBKDF2 legacy check: strictly forbidden in production
  if (process.env.NODE_ENV === 'production') {
    console.warn('[SECURITY ALERT] Legacy non-PBKDF2 password encountered in production. Access rejected.');
    return false;
  }
  try {
    const pBuf = Buffer.from(String(password));
    const sBuf = Buffer.from(String(storedHash));
    return pBuf.length === sBuf.length && crypto.timingSafeEqual(pBuf, sBuf);
  } catch (e) {
    return false;
  }
}

function generateTokens(userId) {
  const now = Math.floor(Date.now() / 1000);
  const accessPayload = {
    user_id: String(userId),
    exp: now + 60 * 60, // 60 mins
    iat: now
  };
  const refreshPayload = {
    user_id: String(userId),
    exp: now + 24 * 60 * 60, // 1 day
    iat: now
  };

  const access = jwt.sign(accessPayload, SECRET_KEY, { algorithm: 'HS256' });
  const refresh = jwt.sign(refreshPayload, SECRET_KEY, { algorithm: 'HS256' });

  return { access, refresh };
}

const { ObjectId } = require('mongodb');

async function authenticateJWT(req, res, next) {
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      token = parts[1];
    }
  }

  // Fallback: check HttpOnly cookie
  if (!token) {
    token = getCookie(req, 'access_token');
  }

  if (!token) {
    return res.status(401).json({ detail: 'Authentication credentials were not provided.' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY, { algorithms: ['HS256'] });
    const db = getDb();
    let user = await db.collection('users').findOne({ _id: decoded.user_id });
    if (!user && ObjectId.isValid(decoded.user_id)) {
      try {
        user = await db.collection('users').findOne({ _id: new ObjectId(decoded.user_id) });
      } catch (e) {}
    }
    if (!user) {
      return res.status(401).json({ detail: 'User not found' });
    }

    req.user = {
      id: String(user._id),
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role || 'customer',
      roles: user.roles || [user.role || 'customer'],
      is_owner: Boolean(user.is_owner || user.role === 'owner'),
      is_admin: Boolean(user.role === 'admin')
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ detail: 'Token expired' });
    }
    return res.status(401).json({ detail: 'Invalid token' });
  }
}

async function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return next();
  }
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    try {
      const decoded = jwt.verify(parts[1], SECRET_KEY, { algorithms: ['HS256'] });
      const db = getDb();
      let user = await db.collection('users').findOne({ _id: decoded.user_id });
      if (!user && ObjectId.isValid(decoded.user_id)) {
        try {
          user = await db.collection('users').findOne({ _id: new ObjectId(decoded.user_id) });
        } catch (e) {}
      }
      if (user) {
        req.user = {
          id: String(user._id),
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role || 'customer'
        };
      }
    } catch (e) {
      // Ignore invalid token for optional auth
    }
  }
  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ detail: 'Authentication credentials were not provided.' });
    }
    const userRole = req.user.role || 'customer';
    const userRoles = req.user.roles || [userRole];
    const isOwner = req.user.is_owner || userRoles.includes('owner') || userRole === 'owner';
    const isAdmin = req.user.is_admin || userRole === 'admin';

    const hasPermission =
      isAdmin ||
      allowedRoles.includes(userRole) ||
      (allowedRoles.includes('owner') && isOwner) ||
      userRoles.some(r => allowedRoles.includes(r));

    if (!hasPermission) {
      return res.status(403).json({
        error: `Forbidden: Access requires one of [${allowedRoles.join(', ')}]. Current role: '${userRole}'`
      });
    }
    next();
  };
}

module.exports = {
  SECRET_KEY,
  makePassword,
  checkPassword,
  generateTokens,
  setAuthCookies,
  clearAuthCookies,
  authenticateJWT,
  optionalAuth,
  requireRole
};
