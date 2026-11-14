const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const http = require('http');
const app = require('./src/app');
const { connectDb } = require('./src/db');
const { initSocket } = require('./src/socket');
const { initLateFeeScheduler } = require('./src/utils/lateFeeScheduler');

const PORT = process.env.PORT || 8000;

async function startServer() {
  try {
    const db = await connectDb();
    const server = http.createServer(app);
    initSocket(server);
    initLateFeeScheduler(db);

    server.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`  🚀 Rentora Node.js, Express & WebSocket API Server Running!`);
      console.log(`  📡 URL: http://127.0.0.1:${PORT} (Dual-Stack IPv4/IPv6)`);
      console.log(`  ⚡ Socket.io: ws://127.0.0.1:${PORT}`);
      console.log(`  🔗 Health: http://127.0.0.1:${PORT}/api/health`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
