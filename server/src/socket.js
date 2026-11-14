const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('./auth');
const { getDb } = require('./db');

let io = null;

function initSocket(httpServer) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8000', 'http://127.0.0.1:8000'];

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*') || process.env.NODE_ENV !== 'production') {
          return callback(null, true);
        }
        return callback(new Error('Socket CORS blocked'));
      },
      methods: ['GET', 'POST']
    }
  });

  // Authenticate socket handshakes if token provided
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
      if (token) {
        const decoded = jwt.verify(token, SECRET_KEY, { algorithms: ['HS256'] });
        const db = getDb();
        if (db) {
          const user = await db.collection('users').findOne({ _id: decoded.user_id });
          if (user) {
            socket.user = { id: user._id, username: user.username, role: user.role || 'customer' };
          }
        }
      }
    } catch (e) {
      // Allow unauthenticated connection for public stock events, but gate admin rooms
    }
    next();
  });

  io.on('connection', (socket) => {
    // Rooms for targeted real-time push: require admin role
    socket.on('join:admin', () => {
      if (socket.user && socket.user.role === 'admin') {
        socket.join('room:admin');
      } else if (process.env.NODE_ENV !== 'production' && !socket.user) {
        // Fallback for non-authenticated test environments
        socket.join('room:admin');
      } else {
        socket.emit('error:unauthorized', { message: 'Admin authentication required.' });
      }
    });

    socket.on('join:user', (userId) => {
      if (userId) socket.join(`room:user_${userId}`);
    });

    socket.on('join:owner', (ownerId) => {
      if (ownerId) socket.join(`room:owner_${ownerId}`);
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
}

function getIO() {
  return io;
}

function sanitizeLogData(data) {
  if (!data || typeof data !== 'object') return data;
  const sanitized = { ...data };
  const sensitiveKeys = ['password', 'secret', 'token', 'key', 'phone', 'email', 'card', 'cvv'];
  for (const k of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sk => k.toLowerCase().includes(sk))) {
      sanitized[k] = '[REDACTED]';
    }
  }
  return sanitized;
}

function notifyAdmin(event, data) {
  if (!io) {
    console.warn(`[Socket Warning] Cannot emit '${event}' to admin room: Socket.IO server is not initialized.`);
    return { sent: false, reason: 'uninitialized' };
  }
  try {
    io.to('room:admin').emit(event, { ...data, timestamp: new Date().toISOString() });
    return { sent: true };
  } catch (err) {
    console.error(`[Socket Error] Failed to emit '${event}' to admin room:`, err.message, sanitizeLogData(data));
    return { sent: false, error: err.message };
  }
}

function notifyUser(userId, event, data) {
  if (!io || !userId) {
    if (!io) console.warn(`[Socket Warning] Cannot emit '${event}' to user: Socket.IO server is not initialized.`);
    return { sent: false, reason: !io ? 'uninitialized' : 'missing_user_id' };
  }
  try {
    io.to(`room:user_${userId}`).emit(event, { ...data, timestamp: new Date().toISOString() });
    return { sent: true };
  } catch (err) {
    console.error(`[Socket Error] Failed to emit '${event}' to user room:`, err.message);
    return { sent: false, error: err.message };
  }
}

function notifyOwner(ownerId, event, data) {
  if (!io || !ownerId) {
    if (!io) console.warn(`[Socket Warning] Cannot emit '${event}' to owner: Socket.IO server is not initialized.`);
    return { sent: false, reason: !io ? 'uninitialized' : 'missing_owner_id' };
  }
  try {
    io.to(`room:owner_${ownerId}`).emit(event, { ...data, timestamp: new Date().toISOString() });
    return { sent: true };
  } catch (err) {
    console.error(`[Socket Error] Failed to emit '${event}' to owner room:`, err.message);
    return { sent: false, error: err.message };
  }
}

function broadcastEvent(event, data) {
  if (!io) {
    console.warn(`[Socket Warning] Cannot broadcast '${event}': Socket.IO server is not initialized.`);
    return { sent: false, reason: 'uninitialized' };
  }
  try {
    io.emit(event, { ...data, timestamp: new Date().toISOString() });
    return { sent: true };
  } catch (err) {
    console.error(`[Socket Error] Failed to broadcast '${event}':`, err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = {
  initSocket,
  getIO,
  notifyAdmin,
  notifyUser,
  notifyOwner,
  broadcastEvent
};
