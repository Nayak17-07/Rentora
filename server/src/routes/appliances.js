const express = require('express');
const crypto = require('crypto');
const { getDb } = require('../db');
const { authenticateJWT, requireRole } = require('../auth');

const router = express.Router();

// GET /api/appliances/ or /api/appliances/:appliance_id/
router.get(['/appliances/', '/appliances/:appliance_id/'], async (req, res) => {
  try {
    const db = getDb();
    const applianceId = req.params.appliance_id;

    if (applianceId) {
      const app = await db.collection('appliances').findOne({
        $or: [{ appliance_id: applianceId }, { _id: applianceId }]
      });
      if (!app) {
        return res.status(404).json({ error: 'Appliance not found' });
      }
      app._id = String(app._id);
      return res.status(200).json(app);
    }

    const { city, search, all_stock, in_stock_only } = req.query;
    const includeAllStock = String(all_stock).toLowerCase() === 'true';

    const query = {};
    if (!includeAllStock || String(in_stock_only).toLowerCase() === 'true') {
      query.stock_quantity = { $gt: 0 };
    }

    if (city && city !== 'All Cities') {
      query.available_cities = city;
    }

    if (search) {
      const escapedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { rental_name: { $regex: escapedSearch, $options: 'i' } },
        { category_id: { $regex: escapedSearch, $options: 'i' } },
        { sub_category: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    const appliances = await db.collection('appliances')
      .find(query)
      .sort({ created_at: -1 })
      .toArray();

    const formatted = appliances.map(app => ({
      ...app,
      _id: String(app._id)
    }));

    return res.status(200).json(formatted);
  } catch (err) {
    console.error('Fetch appliances error:', err);
    return res.status(500).json({ error: 'Internal server error fetching appliances' });
  }
});

// POST /api/appliances/ (Create appliance)
router.post('/appliances/', authenticateJWT, requireRole('admin', 'owner'), async (req, res) => {
  try {
    const db = getDb();
    const data = req.body;

    const rentalName = data.rental_name;
    if (!rentalName) {
      return res.status(400).json({ error: 'rental_name is required' });
    }

    const appId = crypto.randomUUID();
    const monthlyPrice = parseFloat(data.monthly_price || 500);
    const deposit = parseFloat(data.security_deposit || Math.round(monthlyPrice * 1.5));
    const stock = parseInt(data.stock_quantity || 10, 10);

    let pricing = data.pricing;
    if (!pricing || typeof pricing !== 'object') {
      pricing = {
        '3': parseFloat(data.pricing_3 || monthlyPrice),
        '6': parseFloat(data.pricing_6 || Math.round(monthlyPrice * 0.9 * 100) / 100),
        '12': parseFloat(data.pricing_12 || Math.round(monthlyPrice * 0.8 * 100) / 100)
      };
    }

    let cities = data.available_cities || ['Hyderabad', 'Bangalore', 'Mumbai', 'Delhi', 'Pune'];
    if (typeof cities === 'string') {
      cities = cities.split(',').map(c => c.trim()).filter(Boolean);
    }

    const doc = {
      _id: appId,
      appliance_id: appId,
      rental_name: rentalName,
      category_id: data.category_id || 'Appliances',
      sub_category: data.sub_category || data.category_id || 'General',
      brand: data.brand || 'Rentora Select',
      monthly_price: monthlyPrice,
      daily_price: parseFloat(data.daily_price || Math.round((monthlyPrice / 30) * 100) / 100),
      pricing,
      security_deposit: deposit,
      stock_quantity: stock,
      available_cities: cities,
      description: data.description || 'Premium home appliance rented with doorstep delivery & service.',
      image_url: data.image_url || 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&q=80&w=600',
      tag: data.tag || 'New Arrival',
      created_at: new Date()
    };

    await db.collection('appliances').insertOne(doc);
    doc._id = String(doc._id);

    return res.status(201).json({
      success: 'Appliance added successfully',
      appliance: doc
    });
  } catch (err) {
    console.error('Add appliance error:', err);
    return res.status(500).json({ error: 'Internal server error adding appliance' });
  }
});

// PUT /api/appliances/ or /api/appliances/:appliance_id/ (Update appliance)
router.put(['/appliances/', '/appliances/:appliance_id/'], authenticateJWT, requireRole('admin', 'owner'), async (req, res) => {
  try {
    const db = getDb();
    const appId = req.params.appliance_id || req.body.appliance_id;
    if (!appId) {
      return res.status(400).json({ error: 'appliance_id is required' });
    }

    const existing = await db.collection('appliances').findOne({
      $or: [{ appliance_id: appId }, { _id: appId }]
    });
    if (!existing) {
      return res.status(404).json({ error: 'Appliance not found' });
    }

    const data = req.body;
    const updates = {};
    const textFields = ['rental_name', 'category_id', 'sub_category', 'brand', 'description', 'image_url', 'tag'];
    textFields.forEach(field => {
      if (data[field] !== undefined) updates[field] = data[field];
    });

    if (data.monthly_price !== undefined) updates.monthly_price = parseFloat(data.monthly_price);
    if (data.security_deposit !== undefined) updates.security_deposit = parseFloat(data.security_deposit);
    if (data.stock_quantity !== undefined) updates.stock_quantity = parseInt(data.stock_quantity, 10);
    if (data.daily_price !== undefined) updates.daily_price = parseFloat(data.daily_price);
    if (data.pricing && typeof data.pricing === 'object') updates.pricing = data.pricing;

    if (data.available_cities !== undefined) {
      let cities = data.available_cities;
      if (typeof cities === 'string') {
        cities = cities.split(',').map(c => c.trim()).filter(Boolean);
      }
      updates.available_cities = cities;
    }

    updates.updated_at = new Date();

    await db.collection('appliances').updateOne(
      { _id: existing._id },
      { $set: updates }
    );

    const updated = await db.collection('appliances').findOne({ _id: existing._id });
    updated._id = String(updated._id);

    return res.status(200).json({
      success: 'Appliance updated successfully',
      appliance: updated
    });
  } catch (err) {
    console.error('Update appliance error:', err);
    return res.status(500).json({ error: 'Internal server error updating appliance' });
  }
});

// PATCH /api/appliances/:appliance_id/stock-adjust (Quick Admin Stock Stepper)
router.patch('/appliances/:appliance_id/stock-adjust', authenticateJWT, requireRole('admin', 'owner'), async (req, res) => {
  try {
    const db = getDb();
    const appId = req.params.appliance_id;
    const delta = parseInt(req.body.delta, 10);
    if (isNaN(delta)) {
      return res.status(400).json({ error: 'delta integer is required' });
    }

    const existing = await db.collection('appliances').findOne({
      $or: [{ appliance_id: appId }, { _id: appId }]
    });
    if (!existing) {
      return res.status(404).json({ error: 'Appliance not found' });
    }

    const currentStock = parseInt(existing.stock_quantity || 0, 10);
    const newStock = Math.max(0, currentStock + delta);

    await db.collection('appliances').updateOne(
      { _id: existing._id },
      { $set: { stock_quantity: newStock, updated_at: new Date() } }
    );

    return res.status(200).json({
      success: 'Stock adjusted successfully',
      appliance_id: existing.appliance_id,
      stock_quantity: newStock
    });
  } catch (err) {
    console.error('Adjust stock error:', err);
    return res.status(500).json({ error: 'Internal server error adjusting stock' });
  }
});

// DELETE /api/appliances/ or /api/appliances/:appliance_id/ (Delete appliance)
router.delete(['/appliances/', '/appliances/:appliance_id/'], authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    const db = getDb();
    const appId = req.params.appliance_id || req.body.appliance_id;
    if (!appId) {
      return res.status(400).json({ error: 'appliance_id is required' });
    }

    const result = await db.collection('appliances').deleteOne({
      $or: [{ appliance_id: appId }, { _id: appId }]
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Appliance not found or already deleted' });
    }

    return res.status(200).json({ success: 'Appliance deleted successfully' });
  } catch (err) {
    console.error('Delete appliance error:', err);
    return res.status(500).json({ error: 'Internal server error deleting appliance' });
  }
});

module.exports = router;
