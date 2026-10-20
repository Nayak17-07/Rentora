const express = require('express');
const crypto = require('crypto');
const { getDb } = require('../db');
const { authenticateJWT } = require('../auth');

const router = express.Router();

// GET /api/cart/
router.get('/cart/', authenticateJWT, async (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;

    const cartItems = await db.collection('carts').find({ user_id: userId }).toArray();
    const result = [];

    for (const item of cartItems) {
      const app = await db.collection('appliances').findOne({
        $or: [{ appliance_id: item.appliance_id }, { _id: item.appliance_id }]
      });
      if (app) {
        app._id = String(app._id);
        result.push({
          cart_item_id: String(item._id),
          appliance: app,
          tenure: item.tenure || '3',
          added_at: item.added_at
        });
      }
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('Fetch cart error:', err);
    return res.status(500).json({ error: 'Internal server error fetching cart' });
  }
});

// POST /api/cart/
router.post('/cart/', authenticateJWT, async (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { appliance_id, tenure = '3', bundle_data } = req.body;

    if (!appliance_id) {
      return res.status(400).json({ error: 'appliance_id is required' });
    }

    // Bug 28: Validate tenure commitment duration
    const validTenures = ['3', '6', '12'];
    const tenureStr = String(tenure || '3');
    if (!validTenures.includes(tenureStr)) {
      return res.status(400).json({ error: 'Invalid tenure duration. Supported lease commitments: 3, 6, or 12 months.' });
    }

    const appToRent = await db.collection('appliances').findOne({
      $or: [{ appliance_id }, { _id: appliance_id }]
    });

    if (appToRent) {
      const curStock = parseInt(appToRent.stock_quantity !== undefined ? appToRent.stock_quantity : 1, 10);
      if (curStock <= 0) {
        return res.status(400).json({ error: `"${appToRent.rental_name || 'Item'}" is currently out of stock.` });
      }
    }

    // Bug 26: Sanitize bundle definitions and restrict client override
    if (bundle_data && typeof bundle_data === 'object') {
      const existingApp = await db.collection('appliances').findOne({
        $or: [{ appliance_id }, { _id: appliance_id }]
      });
      if (!existingApp) {
        const m_price = Math.max(500, Math.min(50000, parseFloat(bundle_data.monthly_price) || 1499));
        const bundleDoc = {
          _id: crypto.randomUUID(),
          appliance_id,
          rental_name: String(bundle_data.rental_name || 'Curated Room Combo').slice(0, 100),
          category_id: String(bundle_data.category_id || 'Packages').slice(0, 50),
          sub_category: 'Curated Room Package',
          monthly_price: m_price,
          pricing: {
            '3': m_price,
            '6': Math.round(m_price * 0.9),
            '12': Math.round(m_price * 0.8)
          },
          security_deposit: Math.max(0, Math.min(50000, parseFloat(bundle_data.security_deposit) || 0)),
          stock_quantity: 50,
          available_cities: ['Hyderabad', 'Bangalore', 'Mumbai', 'Delhi', 'Pune'],
          image_url: String(bundle_data.image_url || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc'),
          tag: 'Curated Package',
          created_at: new Date()
        };
        await db.collection('appliances').insertOne(bundleDoc);
      }
    }

    const existing = await db.collection('carts').findOne({ user_id: userId, appliance_id });
    if (existing) {
      await db.collection('carts').updateOne(
        { _id: existing._id },
        { $set: { tenure } }
      );
      return res.status(200).json({ message: 'Cart item updated' });
    }

    await db.collection('carts').insertOne({
      _id: crypto.randomUUID(),
      user_id: userId,
      appliance_id,
      tenure,
      added_at: new Date()
    });

    return res.status(201).json({ success: 'Added to cart' });
  } catch (err) {
    console.error('Add to cart error:', err);
    return res.status(500).json({ error: 'Internal server error adding to cart' });
  }
});

// DELETE /api/cart/
router.delete('/cart/', authenticateJWT, async (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { appliance_id } = req.body;

    if (appliance_id) {
      await db.collection('carts').deleteOne({ user_id: userId, appliance_id });
    } else {
      await db.collection('carts').deleteMany({ user_id: userId });
    }

    return res.status(200).json({ success: 'Removed from cart' });
  } catch (err) {
    console.error('Delete from cart error:', err);
    return res.status(500).json({ error: 'Internal server error deleting from cart' });
  }
});

module.exports = router;
