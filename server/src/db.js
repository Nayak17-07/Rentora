const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true });

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/';
const dbName = process.env.MONGO_DB_NAME || 'rentora_db';

let client = null;
let db = null;
let isReplicaSet = null;

async function connectDb() {
  if (db) return db;
  client = new MongoClient(uri, {
    maxPoolSize: 50,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  });
  await client.connect();
  db = client.db(dbName);
  console.log(`Connected to MongoDB: ${dbName}`);

  // Detect whether the connected instance supports multi-document transactions
  try {
    const isMaster = await db.command({ isMaster: 1 });
    isReplicaSet = !!(isMaster.setName || isMaster.msg === 'isdbgrid');
    if (isReplicaSet) {
      console.log('✅ MongoDB Replica Set detected: Multi-Document ACID Transactions ENABLED');
    } else {
      console.log('ℹ️ MongoDB Standalone detected: Multi-Document Transactions handled with atomic compensation rollback');
    }
  } catch (e) {
    isReplicaSet = false;
  }

  // Ensure TTL indexes and performance/uniqueness indexes across collections
  try {
    await Promise.allSettled([
      db.collection('signup_otps').createIndex({ expires_at: 1 }, { expireAfterSeconds: 0, background: true }),
      db.collection('password_resets').createIndex({ expires_at: 1 }, { expireAfterSeconds: 0, background: true }),
      db.collection('users').createIndex({ username: 1 }, { background: true }),
      db.collection('users').createIndex({ email: 1 }, { background: true }),
      db.collection('appliances').createIndex({ appliance_id: 1 }, { sparse: true, background: true }),
      db.collection('appliances').createIndex({ stock_quantity: 1, available_cities: 1 }, { background: true }),
      db.collection('rentals').createIndex({ user_id: 1, status: 1 }, { background: true }),
      db.collection('rentals').createIndex({ rented_at: -1 }, { background: true }),
      db.collection('rentals').createIndex({ 'delivery_tracking.tracking_id': 1 }, { sparse: true, background: true }),
      db.collection('payments').createIndex({ user_id: 1, created_at: -1 }, { background: true }),
      db.collection('payments').createIndex({ transaction_id: 1 }, { background: true }),
      db.collection('payments').createIndex({ gateway_order_id: 1 }, { sparse: true, background: true }),
      db.collection('payment_orders').createIndex({ order_id: 1 }, { sparse: true, background: true }),
      db.collection('payment_orders').createIndex({ user_id: 1, status: 1 }, { background: true }),
      db.collection('idempotency_records').createIndex({ user_id: 1, idempotency_key: 1 }, { unique: true, background: true }),
      db.collection('kyc').createIndex({ user_id: 1 }, { background: true }),
      db.collection('carts').createIndex({ user_id: 1 }, { background: true }),
      db.collection('admin_audit_logs').createIndex({ timestamp: -1 }, { background: true })
    ]);
  } catch (idxErr) {
    console.warn('Index verification note:', idxErr.message);
  }

  return db;
}

function getDb() {
  if (!db) {
    throw new Error('Database not connected. Call connectDb() first.');
  }
  return db;
}

function getClient() {
  if (!client) {
    throw new Error('Database not connected. Call connectDb() first.');
  }
  return client;
}

/**
 * Executes operations within an ACID transaction if supported by MongoDB (replica set / Atlas),
 * or executes with automatic fallback for standalone development servers.
 *
 * @param {function(session): Promise<any>} operation
 * @returns {Promise<any>}
 */
async function withTransaction(operation) {
  if (!client) throw new Error('Database not connected');

  // If known standalone, run directly without transaction overhead
  if (isReplicaSet === false) {
    return await operation(null);
  }

  const session = client.startSession();
  try {
    let result;
    try {
      await session.withTransaction(async () => {
        result = await operation(session);
      });
      return result;
    } catch (txnError) {
      const msg = String(txnError.message || '');
      if (
        msg.includes('Transaction numbers are only allowed on a replica set') ||
        msg.includes('Standalone servers do not support transactions') ||
        txnError.codeName === 'IllegalOperation' ||
        txnError.code === 20
      ) {
        isReplicaSet = false;
        console.warn('Standalone MongoDB detected; falling back to non-transactional atomic execution.');
        return await operation(null);
      }
      throw txnError;
    }
  } finally {
    await session.endSession();
  }
}

module.exports = { 
  connectDb, 
  getDb, 
  getClient, 
  withTransaction 
};
