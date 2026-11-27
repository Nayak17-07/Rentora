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
const conciergeRoutes = require('./routes/concierge');
const inventoryRoutes = require('./routes/inventory');
const browsingHistoryRoutes = require('./routes/browsingHistory');
const maintenanceRoutes = require('./routes/maintenance');

const app = express();

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

// Request payload limit (calibrated for KYC document previews while preventing memory flooding)
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true, limit: '6mb' }));
app.use((req, res, next) => {
  if (!req.body) req.body = {};
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
app.use('/api', conciergeRoutes);
app.use('/api', inventoryRoutes);
app.use('/api', browsingHistoryRoutes);
app.use('/api', maintenanceRoutes);

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
