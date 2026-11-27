const express = require('express');
const crypto = require('crypto');
const { getDb } = require('../db');
const { authenticateJWT, requireRole } = require('../auth');
const { assignVariant } = require('../utils/experimentAssignment');

const router = express.Router();

// GET /api/experiments/assign - Deterministic user or city-cluster assignment
router.get('/experiments/assign', authenticateJWT, async (req, res) => {
  try {
    const experimentId = String(req.query.experiment_id || 'default_exp');
    const unit = String(req.query.unit || 'city').toLowerCase() === 'user' ? 'user' : 'city';
    const city = String(req.query.city || 'Bangalore');
    const key = unit === 'city' ? city : String(req.user.user_id);
    const variant = assignVariant(experimentId, key);

    return res.status(200).json({
      experiment_id: experimentId,
      randomization_unit: unit,
      assignment_key: key,
      variant
    });
  } catch (err) {
    console.error('Experiment assign error:', err);
    return res.status(500).json({ error: 'Failed to assign experiment variant' });
  }
});

// POST /api/experiments/exposure - Log experiment assignment & inventory-at-exposure
router.post('/experiments/exposure', authenticateJWT, async (req, res) => {
  try {
    const db = getDb();
    const {
      experiment_id = 'default_exp',
      variant = 'control',
      city = 'unknown',
      appliance_id = null,
      stock_at_exposure = null,
      event_type = 'IMPRESSION'
    } = req.body;

    const doc = {
      _id: crypto.randomUUID(),
      user_id: req.user.user_id,
      experiment_id: String(experiment_id),
      variant: String(variant),
      city: String(city),
      appliance_id: appliance_id ? String(appliance_id) : null,
      stock_at_exposure: stock_at_exposure !== null ? Number(stock_at_exposure) : null,
      event_type: String(event_type).toUpperCase(),
      created_at: new Date().toISOString()
    };

    await db.collection('experiment_exposure_logs').insertOne(doc);
    return res.status(201).json({ success: true, exposure_id: doc._id });
  } catch (err) {
    console.error('Experiment exposure log error:', err);
    return res.status(500).json({ error: 'Failed to log experiment exposure' });
  }
});

// GET /api/experiments/summary - Aggregate exposure logs by variant and city (Admin)
router.get('/experiments/summary', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    const db = getDb();
    const experimentId = req.query.experiment_id ? String(req.query.experiment_id) : null;
    const query = experimentId ? { experiment_id: experimentId } : {};
    const logs = await db.collection('experiment_exposure_logs').find(query).toArray();

    const byVariant = {};
    const byCity = {};
    for (const log of logs) {
      const v = log.variant || 'unknown';
      const c = log.city || 'unknown';
      byVariant[v] = (byVariant[v] || 0) + 1;
      byCity[c] = (byCity[c] || 0) + 1;
    }

    return res.status(200).json({
      experiment_id: experimentId || 'all',
      total_exposures: logs.length,
      by_variant: byVariant,
      by_city: byCity
    });
  } catch (err) {
    console.error('Experiment summary error:', err);
    return res.status(500).json({ error: 'Failed to summarize experiment exposures' });
  }
});

module.exports = router;
module.exports.assignVariant = assignVariant;
