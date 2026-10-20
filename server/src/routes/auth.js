const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');
const { makePassword, checkPassword, generateTokens, setAuthCookies, clearAuthCookies, SECRET_KEY, authenticateJWT } = require('../auth');
const { sendOtpEmail } = require('../mailer');
const { authLimiter, adminAuthLimiter, otpLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// POST /api/auth/send-signup-otp/ (Real-Time Gmail OTP Request for Registration)
router.post('/auth/send-signup-otp/', otpLimiter, async (req, res) => {
  try {
    const { username, email, password, phone_num } = req.body;
    const db = getDb();

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = username.trim();
    const escapedUsername = cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Check if username already exists
    const existingUser = await db.collection('users').findOne({ 
      username: { $regex: new RegExp(`^${escapedUsername}$`, 'i') } 
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken. Please choose another.' });
    }

    // Check if email already registered
    const existingEmail = await db.collection('users').findOne({ 
      email: cleanEmail 
    });
    if (existingEmail) {
      return res.status(400).json({ error: 'An account with this email already exists. Please log in.' });
    }

    // Generate secure 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes expiry

    // Save pending registration payload with OTP
    await db.collection('signup_otps').updateOne(
      { email: cleanEmail },
      {
        $set: {
          username: cleanUsername,
          email: cleanEmail,
          password: makePassword(password),
          phone_num: phone_num ? phone_num.trim() : '',
          role: 'customer',
          otp,
          created_at: now,
          expires_at: expiresAt
        }
      },
      { upsert: true }
    );

    // Send real-time OTP to the user's Gmail
    const mailResult = await sendOtpEmail(cleanEmail, otp, 'signup');

    // Security Gate: NEVER expose OTP in production environment
    const isProduction = process.env.NODE_ENV === 'production';
    const allowDevMockOtp = !isProduction && (process.env.ALLOW_DEV_MOCK_OTP !== 'false');

    return res.status(200).json({
      success: 'Real-time 6-digit verification code sent to your Gmail',
      email: cleanEmail,
      simulated: mailResult.simulated,
      mock_otp: (allowDevMockOtp && mailResult.simulated) ? otp : undefined
    });
  } catch (err) {
    console.error('Send signup OTP error:', err);
    return res.status(500).json({ error: 'Failed to dispatch Gmail verification code' });
  }
});

// POST /api/auth/verify-signup-otp/ (Verify OTP and Create Account)
router.post('/auth/verify-signup-otp/', otpLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and 6-digit verification code are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();
    const db = getDb();

    const record = await db.collection('signup_otps').findOne({
      email: cleanEmail,
      otp: cleanOtp
    });

    if (!record) {
      return res.status(400).json({ error: 'Invalid verification code. Please check your Gmail and try again.' });
    }

    if (new Date() > new Date(record.expires_at)) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    // Check if account was created concurrently
    const existing = await db.collection('users').findOne({
      $or: [{ username: record.username }, { email: record.email }]
    });
    if (existing) {
      return res.status(400).json({ error: 'Account already registered. Please log in.' });
    }

    const userId = crypto.randomUUID();
    const userDoc = {
      _id: userId,
      username: record.username,
      email: record.email,
      password: record.password,
      phone_num: record.phone_num,
      role: 'customer',
      email_verified: true,
      email_verified_at: new Date(),
      kyc_verified: false,
      kyc_status: 'pending',
      created_at: new Date()
    };

    await db.collection('users').insertOne(userDoc);
    await db.collection('signup_otps').deleteOne({ email: cleanEmail });

    const tokens = generateTokens(userId);

    return res.status(201).json({
      success: 'Gmail verified successfully! Account created.',
      ...tokens,
      user: {
        id: userId,
        username: userDoc.username,
        email: userDoc.email,
        role: userDoc.role,
        email_verified: true,
        kyc_verified: false
      }
    });
  } catch (err) {
    console.error('Verify signup OTP error:', err);
    return res.status(500).json({ error: 'Verification failed due to a server error' });
  }
});

// POST /api/users/ (Legacy direct registration fallback)
router.post('/users/', async (req, res) => {
  try {
    const { username, email, password, phone_num } = req.body;
    const db = getDb();

    if (!username || !email || !password) {
      return res.status(400).json({ error: ['Username, email, and password are required'] });
    }

    const existingUser = await db.collection('users').findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: ['Username already exists'] });
    }

    const existingEmail = await db.collection('users').findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: ['Email already exists'] });
    }

    const userId = crypto.randomUUID();
    const userDoc = {
      _id: userId,
      username,
      email,
      password: makePassword(password),
      phone_num: phone_num || '',
      role: 'customer',
      created_at: new Date()
    };

    await db.collection('users').insertOne(userDoc);
    return res.status(201).json({ success: 'Account created' });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: ['Internal server error during registration'] });
  }
});

// POST /api/token/ (Login)
router.post('/token/', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ detail: 'Username and password are required' });
    }

    const db = getDb();
    const cleanInput = (username || '').trim();
    const user = await db.collection('users').findOne({
      $or: [
        { username: cleanInput },
        { email: cleanInput.toLowerCase() }
      ]
    });

    if (user && checkPassword(password, user.password)) {
      // Auto-migrate legacy non-PBKDF2 passwords transparently to secure PBKDF2
      if (!String(user.password || '').startsWith('pbkdf2_sha256$')) {
        db.collection('users').updateOne(
          { _id: user._id },
          { $set: { password: makePassword(password), password_upgraded_at: new Date() } }
        ).catch(e => console.warn('Password re-hash migration note:', e.message));
      }

      const tokens = generateTokens(user._id);
      setAuthCookies(res, tokens);
      return res.status(200).json({
        ...tokens,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role || 'customer'
        }
      });
    }

    return res.status(401).json({ detail: 'No active account found with the given credentials' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ detail: 'Internal server error during login' });
  }
});

// POST /api/auth/admin-login/ (Internal Operations & Administrative Portal Login with Strict Rate Limiting)
router.post('/auth/admin-login/', adminAuthLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username or email, and password are required' });
    }

    const db = getDb();
    const cleanInput = (username || '').trim();
    const user = await db.collection('users').findOne({
      $or: [
        { username: cleanInput },
        { email: cleanInput.toLowerCase() }
      ]
    });

    if (!user || !checkPassword(password, user.password)) {
      return res.status(401).json({ error: 'Invalid administrator credentials' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access Denied: This account is registered as a customer/vendor and does not have administrator privileges.'
      });
    }

    // Auto-migrate legacy non-PBKDF2 passwords transparently to secure PBKDF2
    if (!String(user.password || '').startsWith('pbkdf2_sha256$')) {
      db.collection('users').updateOne(
        { _id: user._id },
        { $set: { password: makePassword(password), password_upgraded_at: new Date() } }
      ).catch(e => console.warn('Admin password re-hash migration note:', e.message));
    }

    const tokens = generateTokens(user._id);
    setAuthCookies(res, tokens);
    return res.status(200).json({
      ...tokens,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: 'admin'
      }
    });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ error: 'Internal server error during admin authentication' });
  }
});

// POST /api/token/refresh/ (Token Refresh)
router.post('/token/refresh/', async (req, res) => {
  try {
    const refresh = req.body?.refresh || req.headers?.cookie?.match(/refresh_token=([^;]+)/)?.[1];
    if (!refresh) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    try {
      const payload = jwt.verify(refresh, SECRET_KEY, { algorithms: ['HS256'] });
      const tokens = generateTokens(payload.user_id);
      setAuthCookies(res, tokens);
      return res.status(200).json(tokens);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Refresh token expired' });
      }
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(500).json({ error: 'Internal server error during token refresh' });
  }
});

// POST /api/auth/logout/ (Clear HttpOnly Auth Cookies)
router.post('/auth/logout/', (req, res) => {
  clearAuthCookies(res);
  return res.status(200).json({ success: 'Logged out successfully' });
});

// POST /api/auth/password-reset-request/ (Module 1: Password Reset Request)
router.post('/auth/password-reset-request/', otpLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = getDb();
    const user = await db.collection('users').findOne({ email: cleanEmail });
    if (!user) {
      return res.status(200).json({
        success: 'If an account with this email exists, a verification code has been dispatched.',
        email: cleanEmail
      });
    }

    // Rate limiting: allow at most 1 request per 60 seconds
    const existingReset = await db.collection('password_resets').findOne({ email: cleanEmail });
    const now = new Date();
    if (existingReset && existingReset.created_at && (now - new Date(existingReset.created_at)) < 60000) {
      return res.status(429).json({
        error: 'Please wait at least 60 seconds before requesting another verification code.'
      });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins

    await db.collection('password_resets').updateOne(
      { email: cleanEmail },
      {
        $set: {
          otp,
          attempts: 0,
          created_at: now,
          expires_at: expiresAt
        }
      },
      { upsert: true }
    );

    const mailResult = await sendOtpEmail(cleanEmail, otp, 'reset');

    // Security Gate: NEVER expose OTP in production environment
    const isProduction = process.env.NODE_ENV === 'production';
    const allowDevMockOtp = !isProduction && (process.env.ALLOW_DEV_MOCK_OTP !== 'false');

    return res.status(200).json({
      success: 'Verification code has been sent to your registered email',
      email: cleanEmail,
      simulated: mailResult.simulated,
      mock_otp: (allowDevMockOtp && mailResult.simulated) ? otp : undefined
    });
  } catch (err) {
    console.error('Password reset request error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/password-reset-confirm/ (Module 1: Password Reset Confirm)
router.post('/auth/password-reset-confirm/', async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;
    if (!email || !otp || !new_password) {
      return res.status(400).json({ error: 'Email, verification OTP code, and new password are required' });
    }

    if (typeof new_password !== 'string' || new_password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = getDb();
    const record = await db.collection('password_resets').findOne({ email: cleanEmail });
    if (!record) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Bug 13: Brute force lockout after 5 failed attempts
    if ((record.attempts || 0) >= 5) {
      await db.collection('password_resets').deleteOne({ email: cleanEmail });
      return res.status(429).json({ error: 'Too many failed verification attempts. Please request a new code.' });
    }

    if (new Date() > new Date(record.expires_at)) {
      await db.collection('password_resets').deleteOne({ email: cleanEmail });
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one' });
    }

    // Timing-safe comparison of OTP
    const userOtpBuf = Buffer.from(String(otp).trim());
    const storedOtpBuf = Buffer.from(String(record.otp).trim());
    const match = userOtpBuf.length === storedOtpBuf.length && crypto.timingSafeEqual(userOtpBuf, storedOtpBuf);

    if (!match) {
      await db.collection('password_resets').updateOne({ email: cleanEmail }, { $inc: { attempts: 1 } });
      const remaining = Math.max(0, 5 - ((record.attempts || 0) + 1));
      return res.status(400).json({ error: `Invalid verification code. (${remaining} attempts remaining)` });
    }

    await db.collection('users').updateOne(
      { email: cleanEmail },
      { $set: { password: makePassword(new_password) } }
    );

    await db.collection('password_resets').deleteOne({ email: cleanEmail });

    return res.status(200).json({
      success: 'Password reset successfully! You can now log in with your new credentials.'
    });
  } catch (err) {
    console.error('Password reset confirm error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me/ (Get current authenticated user profile & active role)
router.get('/auth/me/', authenticateJWT, async (req, res) => {
  try {
    const db = getDb();
    const user = await db.collection('users').findOne(
      { _id: req.user.id },
      { projection: { password: 0 } }
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json(user);
  } catch (err) {
    console.error('Fetch me error:', err);
    return res.status(500).json({ error: 'Internal server error fetching user profile' });
  }
});

// PATCH /api/auth/switch-role/ (Switch active role between customer and owner)
router.patch('/auth/switch-role/', authenticateJWT, async (req, res) => {
  try {
    const { role } = req.body;
    const allowedRoles = ['customer', 'owner'];
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ 
        error: 'Forbidden: Only marketplace roles (customer, owner) can be switched. Administrator privileges cannot be self-assigned.' 
      });
    }

    const db = getDb();
    await db.collection('users').updateOne(
      { _id: req.user.id },
      { $set: { role, updated_at: new Date() } }
    );

    const updated = await db.collection('users').findOne(
      { _id: req.user.id },
      { projection: { password: 0 } }
    );

    return res.status(200).json({
      success: `Switched active role to ${role}`,
      user: updated
    });
  } catch (err) {
    console.error('Switch role error:', err);
    return res.status(500).json({ error: 'Internal server error switching role' });
  }
});

module.exports = router;
