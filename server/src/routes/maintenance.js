const express = require('express');
const { getDb } = require('../db');
const { optionalAuth, authenticateJWT, requireRole } = require('../auth');

const router = express.Router();

/**
 * GET /api/maintenance/fleet-health
 * Overview summary of entire smart appliance fleet health
 */
router.get('/maintenance/fleet-health', optionalAuth, async (req, res) => {
  try {
    const db = getDb();
    const telemetry = await db.collection('iot_device_telemetry').find({}).toArray();

    if (telemetry.length === 0) {
      return res.status(200).json({
        total_devices: 0,
        average_health_score: 95,
        healthy_devices: 0,
        moderate_risk: 0,
        critical_risk: 0,
        alerts_count: 0
      });
    }

    const total = telemetry.length;
    const avgHealth = Math.round(telemetry.reduce((s, t) => s + (t.health_score || 95), 0) / total);
    const critical = telemetry.filter(t => t.risk_level === 'CRITICAL').length;
    const high = telemetry.filter(t => t.risk_level === 'HIGH').length;
    const moderate = telemetry.filter(t => t.risk_level === 'MODERATE').length;
    const healthy = total - critical - high - moderate;

    const alertsCount = await db.collection('predictive_maintenance_alerts').countDocuments({ status: 'PENDING_DISPATCH' });

    return res.status(200).json({
      total_devices: total,
      average_health_score: avgHealth,
      healthy_devices: healthy,
      moderate_risk: moderate,
      high_risk: high,
      critical_risk: critical,
      pending_alerts_count: alertsCount,
      last_updated: new Date().toISOString()
    });
  } catch (err) {
    console.error('Fleet health error:', err);
    return res.status(500).json({ error: 'Failed to retrieve fleet health' });
  }
});

/**
 * GET /api/maintenance/telemetry
 * Returns list of devices with telemetry diagnostics
 */
router.get('/maintenance/telemetry', optionalAuth, async (req, res) => {
  try {
    const db = getDb();
    const riskFilter = req.query.risk; // 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));

    const query = {};
    if (riskFilter) {
      query.risk_level = riskFilter.toUpperCase();
    }

    const records = await db.collection('iot_device_telemetry')
      .find(query)
      .sort({ failure_risk_score: -1 })
      .limit(limit)
      .toArray();

    return res.status(200).json({
      telemetry: records,
      count: records.length
    });
  } catch (err) {
    console.error('Fetch telemetry error:', err);
    return res.status(500).json({ error: 'Failed to fetch telemetry records' });
  }
});

/**
 * GET /api/maintenance/telemetry/:appliance_id
 * Returns diagnostics for a specific appliance
 */
router.get('/maintenance/telemetry/:appliance_id', optionalAuth, async (req, res) => {
  try {
    const db = getDb();
    const appId = req.params.appliance_id;

    const record = await db.collection('iot_device_telemetry').findOne({
      $or: [{ appliance_id: appId }, { device_id: appId }]
    });

    if (!record) {
      return res.status(404).json({ error: 'Telemetry for requested appliance not found' });
    }

    return res.status(200).json(record);
  } catch (err) {
    console.error('Appliance telemetry error:', err);
    return res.status(500).json({ error: 'Failed to fetch appliance telemetry' });
  }
});

/**
 * GET /api/maintenance/alerts
 * Active maintenance alerts requiring preventive technician dispatch
 */
router.get('/maintenance/alerts', optionalAuth, async (req, res) => {
  try {
    const db = getDb();
    const alerts = await db.collection('predictive_maintenance_alerts')
      .find({})
      .sort({ created_at: -1 })
      .toArray();

    return res.status(200).json({
      alerts,
      count: alerts.length
    });
  } catch (err) {
    console.error('Fetch alerts error:', err);
    return res.status(500).json({ error: 'Failed to fetch maintenance alerts' });
  }
});

/**
 * POST /api/maintenance/dispatch-service/:alert_id
 * Admin marks maintenance alert as dispatched
 */
router.post('/maintenance/dispatch-service/:alert_id', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    const db = getDb();
    const alertId = req.params.alert_id;

    const result = await db.collection('predictive_maintenance_alerts').updateOne(
      { alert_id: alertId },
      { 
        $set: { 
          status: 'DISPATCHED', 
          dispatched_at: new Date().toISOString(),
          assigned_engineer: req.body.assigned_engineer || 'Rajesh Patil (Senior Field Specialist)'
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Maintenance alert not found' });
    }

    return res.status(200).json({
      success: true,
      message: `Preventive service technician dispatched for alert ${alertId}`,
      alert_id: alertId
    });
  } catch (err) {
    console.error('Dispatch service error:', err);
    return res.status(500).json({ error: 'Failed to dispatch preventive service' });
  }
});

module.exports = router;
