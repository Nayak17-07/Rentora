const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const appliancesRoutes = require('./routes/appliances');
const recommendationsRoutes = require('./routes/recommendations');
const cartRoutes = require('./routes/cart');
const checkoutRoutes = require('./routes/checkout');
const rentalsRoutes = require('./routes/rentals');
const paymentsRoutes = require('./routes/payments');
const kycRoutes = require('./routes/kyc');
const adminRoutes = require('./routes/admin');
const ownerRoutes = require('./routes/owner');
const feedbackRoutes = require('./routes/feedback');
const addressesRoutes = require('./routes/addresses');
const inventoryRoutes = require('./routes/inventory');
const browsingHistoryRoutes = require('./routes/browsingHistory');
const trustRoutes = require('./routes/trust');

const app = express();
app.set('trust proxy', 1);

// Security Headers: XSS, Clickjacking, MIME-sniffing, and MitM (HSTS in prod)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: https:; script-src 'self' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-ancestors 'none'"
  );
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  res.removeHeader('X-Powered-By');
  next();
});

// Bounded In-Memory Rate Limiter for /api (DoS protection in production)
const rateBuckets = new Map();
app.use('/api', (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxReqs = req.path.startsWith('/auth') ? 40 : 240;

  if (rateBuckets.size > 5000) {
    for (const [k, b] of rateBuckets.entries()) {
      if (now - b.start > windowMs) rateBuckets.delete(k);
    }
  }

  let bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.start > windowMs) {
    bucket = { start: now, count: 0 };
  }
  bucket.count += 1;
  rateBuckets.set(ip, bucket);
  if (bucket.count > maxReqs) {
    return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
  }
  next();
});

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8000', 'http://127.0.0.1:8000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*') || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error('Cross-Origin Request Blocked by Rentora Security Policy'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'idempotency-key']
}));

const { sanitizeNoSql } = require('./utils/sanitize');

// Request payload limit (calibrated for KYC document previews while preventing memory flooding)
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true, limit: '6mb' }));
app.use((req, res, next) => {
  req.body = req.body ? sanitizeNoSql(req.body) : {};
  if (req.query) req.query = sanitizeNoSql(req.query);
  if (req.params) req.params = sanitizeNoSql(req.params);
  next();
});

// Static file serving for uploaded documents and images
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Health Check
app.get(['/', '/api/health', '/api/health/'], (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Rentora Node.js & Express Backend Engine',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes under /api
app.use('/api', authRoutes);
app.use('/api', appliancesRoutes);
app.use('/api', recommendationsRoutes);
app.use('/api', cartRoutes);
app.use('/api', checkoutRoutes);
app.use('/api', rentalsRoutes);
app.use('/api', paymentsRoutes);
app.use('/api', kycRoutes);
app.use('/api', addressesRoutes);
app.use('/api', adminRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api', feedbackRoutes);
app.use('/api', inventoryRoutes);
app.use('/api', browsingHistoryRoutes);
app.use('/api', trustRoutes);

// Global Error Handler
app.use((err, req, res, _next) => {
  console.error('Unhandled Server Error:', err);
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(err.status || 500).json({ 
    error: 'Internal Server Error', 
    ...(isDev ? { message: err.message } : {}) 
  });
});

module.exports = app;
