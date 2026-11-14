// Rate Limiting & Anti-Brute-Force Middleware
// Protects authentication, admin portal, and OTP dispatch against credential stuffing and DoS.

const requestLog = new Map();

/**
 * Creates an in-memory sliding window rate limiter.
 * Automatically cleans up expired windows to prevent memory leaks.
 *
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Max requests allowed in window
 * @param {string} options.message - Error message when rate limit exceeded
 * @param {function} [options.keyGenerator] - Custom key extraction (defaults to IP)
 */
function createRateLimiter({
  windowMs = 15 * 60 * 1000,
  maxRequests = 10,
  message = 'Too many requests. Please try again later.',
  keyGenerator = (req) => req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown-client'
}) {
  return function rateLimiter(req, res, next) {
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }

    const now = Date.now();
    const clientKey = String(keyGenerator(req));

    let record = requestLog.get(clientKey);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      requestLog.set(clientKey, record);
      return next();
    }

    record.count += 1;

    // Set standard rate limit headers
    const remaining = Math.max(0, maxRequests - record.count);
    const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > maxRequests) {
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        error: message,
        retry_after_seconds: retryAfterSec
      });
    }

    next();
  };
}

// Specialized rate limiters
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 15,          // 15 login attempts per 15 min per IP
  message: 'Too many authentication attempts from this IP. Please wait 15 minutes before trying again.'
});

const adminAuthLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,           // Strict: max 5 admin login attempts per 15 min
  message: 'Security Alert: Maximum administrator login attempts exceeded. Access locked for 15 minutes.'
});

const otpLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 5,           // Max 5 OTP dispatches per 10 min
  message: 'Too many verification code requests. Please wait 10 minutes before requesting another code.',
  keyGenerator: (req) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : '';
    return `otp_${ip}_${email}`;
  }
});

// Periodic memory garbage collection every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestLog.entries()) {
    if (now > record.resetTime) {
      requestLog.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

module.exports = {
  createRateLimiter,
  authLimiter,
  adminAuthLimiter,
  otpLimiter
};
