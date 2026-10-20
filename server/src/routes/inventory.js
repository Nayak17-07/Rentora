const express = require('express');
const { getDb } = require('../db');
const { authenticateJWT, requireRole } = require('../auth');
const { notifyAdmin, broadcastEvent } = require('../socket');

const router = express.Router();

// Enforce Admin RBAC for warehouse and physical asset inventory management
router.use('/inventory', authenticateJWT, requireRole('admin'));

const DEPOTS = [
  'Bangalore Central Hub (Whitefield)',
  'Mumbai West Depot (Bhiwandi)',
  'Delhi-NCR Logistics Hub (Okhla)',
  'Hyderabad Tech-City Hub (Gachibowli)',
  'Pune Industrial Depot (Hinjawadi)'
];

const REFURBISH_STAGES = [
  { key: 'RETURN_INSPECTION', label: '1. Diagnostic Return Intake & Damage Audit', days: 1 },
  { key: 'SANITIZATION_PART_REPLACE', label: '2. High-Temp Steam Sanitization & Filter/Gasket Refresh', days: 2 },
  { key: 'QUALITY_AUDIT_28PT', label: '3. 28-Point Electrical & Safety Certification', days: 1 },
  { key: 'RESTOCKED_AVAILABLE', label: '4. Certified Grade-A Restocked to Active Fleet', days: 0 }
];

// Helper to seed sample serialized units if empty
async function ensureSerializedUnits(db) {
  const count = await db.collection('serialized_inventory_units').countDocuments({});
  if (count > 0) return;

  const appliances = await db.collection('appliances').find({}).limit(15).toArray();
  const sampleUnits = [];

  const statuses = ['ACTIVE_LEASE', 'ACTIVE_LEASE', 'IN_WAREHOUSE', 'UNDER_REFURBISHMENT', 'IN_WAREHOUSE'];
  const grades = ['GRADE_A_PLUS', 'GRADE_A', 'GRADE_A', 'GRADE_B'];

  let idx = 100;
  for (const app of appliances) {
    const appId = app.appliance_id || String(app._id);
    const catCode = (app.category_id || 'APP').slice(0, 3).toUpperCase();
    const cost = Math.round((app.monthly_price || 700) * 28); // e.g. ~20,000 INR

    for (let u = 1; u <= 3; u++) {
      idx++;
      const status = statuses[(idx + u) % statuses.length];
      const grade = grades[(idx + u) % grades.length];
      const depot = DEPOTS[(idx + u) % DEPOTS.length];
      const rev = Math.round(cost * (0.4 + (idx % 80) / 100));
      const bookVal = Math.max(Math.round(cost * 0.3), cost - Math.round(rev * 0.7));

      sampleUnits.push({
        unit_id: `UNT-${idx}`,
        serial_number: `RENT-${catCode}-${idx}-${String(u).padStart(2, '0')}`,
        rfid_tag: `RFID-99${idx}B`,
        appliance_id: appId,
        rental_name: app.rental_name || 'Smart Appliance',
        category_id: app.category_id || 'Appliances',
        depot_location: depot,
        condition_grade: grade,
        lifecycle_status: status, // 'IN_WAREHOUSE', 'ACTIVE_LEASE', 'RETURN_INSPECTION', 'UNDER_REFURBISHMENT', 'DECOMMISSIONED'
        refurbish_stage: status === 'UNDER_REFURBISHMENT' ? 'SANITIZATION_PART_REPLACE' : null,
        refurbish_notes: status === 'UNDER_REFURBISHMENT' ? 'Standard 28-point filter refresh & high-temp steam cleaning' : '',
        procurement_cost: cost,
        depreciation_book_value: bookVal,
        rental_revenue_generated: rev,
        roi_percentage: Math.round((rev / cost) * 100),
        manufacture_year: 2024,
        warranty_status: 'ACTIVE_MANUFACTURER_WARRANTY',
        last_inspected_at: new Date(Date.now() - (idx % 30) * 86400000).toISOString()
      });
    }
  }

  if (sampleUnits.length > 0) {
    await db.collection('serialized_inventory_units').insertMany(sampleUnits);
  }
}

// GET /api/inventory/units - List physical serialized units
router.get('/inventory/units', async (req, res) => {
  try {
    const db = getDb();
    await ensureSerializedUnits(db);

    const { status, depot, grade, search } = req.query;
    const query = {};

    if (status && status !== 'all') query.lifecycle_status = status;
    if (depot && depot !== 'all') query.depot_location = depot;
    if (grade && grade !== 'all') query.condition_grade = grade;
    if (search) {
      const escapedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { serial_number: { $regex: escapedSearch, $options: 'i' } },
        { rental_name: { $regex: escapedSearch, $options: 'i' } },
        { rfid_tag: { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    const units = await db.collection('serialized_inventory_units').find(query).toArray();
    return res.status(200).json(units);
  } catch (err) {
    console.error('Inventory units error:', err);
    return res.status(500).json({ error: 'Failed to fetch inventory units' });
  }
});

// POST /api/inventory/units - Register a new serialized physical unit
router.post('/inventory/units', async (req, res) => {
  try {
    const db = getDb();
    const { appliance_id, rental_name, serial_number, rfid_tag, depot_location, procurement_cost, condition_grade } = req.body;

    if (!serial_number || !appliance_id) {
      return res.status(400).json({ error: 'serial_number and appliance_id are required' });
    }

    const cost = parseFloat(procurement_cost) || 20000;
    const unitDoc = {
      unit_id: `UNT-${Date.now().toString().slice(-6)}`,
      serial_number: serial_number.trim(),
      rfid_tag: rfid_tag ? rfid_tag.trim() : `RFID-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      appliance_id,
      rental_name: rental_name || 'Smart Appliance Unit',
      depot_location: depot_location || DEPOTS[0],
      condition_grade: condition_grade || 'GRADE_A_PLUS',
      lifecycle_status: 'IN_WAREHOUSE',
      procurement_cost: cost,
      depreciation_book_value: cost,
      rental_revenue_generated: 0,
      roi_percentage: 0,
      manufacture_year: new Date().getFullYear(),
      warranty_status: 'ACTIVE_MANUFACTURER_WARRANTY',
      last_inspected_at: new Date().toISOString()
    };

    await db.collection('serialized_inventory_units').insertOne(unitDoc);

    // Increment catalog stock
    await db.collection('appliances').updateOne(
      { appliance_id },
      { $inc: { stock_quantity: 1 } }
    );

    notifyAdmin('inventory:unit_added', { unit_id: unitDoc.unit_id, serial: unitDoc.serial_number });

    return res.status(201).json({
      success: true,
      message: `Asset unit ${unitDoc.serial_number} inducted into warehouse!`,
      unit: unitDoc
    });
  } catch (err) {
    console.error('Create unit error:', err);
    return res.status(500).json({ error: 'Failed to induct unit' });
  }
});

// POST /api/inventory/refurbish-step/:unit_id - Advance unit in the 4-stage refurbishment workflow
router.post('/inventory/refurbish-step/:unit_id', async (req, res) => {
  try {
    const db = getDb();
    const unitId = req.params.unit_id;
    const { next_stage, notes, assigned_technician } = req.body;

    const unit = await db.collection('serialized_inventory_units').findOne({
      $or: [{ unit_id: unitId }, { serial_number: unitId }]
    });

    if (!unit) {
      return res.status(404).json({ error: 'Inventory unit not found' });
    }

    const updates = {
      last_inspected_at: new Date().toISOString()
    };

    let responseMsg = '';

    if (next_stage === 'RESTOCKED_AVAILABLE') {
      // Complete refurbishment -> Certified Grade-A Restocked
      updates.lifecycle_status = 'IN_WAREHOUSE';
      updates.refurbish_stage = null;
      updates.condition_grade = 'GRADE_A';
      updates.refurbish_completed_at = new Date().toISOString();
      updates.refurbish_notes = notes || 'All 28 points passed. Unit certified and restored to available inventory.';

      // Increment live catalog stock
      await db.collection('appliances').updateOne(
        { appliance_id: unit.appliance_id },
        { $inc: { stock_quantity: 1 } }
      );
      responseMsg = `Unit ${unit.serial_number} certified Grade-A and restored to warehouse active stock!`;
    } else {
      updates.lifecycle_status = 'UNDER_REFURBISHMENT';
      updates.refurbish_stage = next_stage;
      updates.refurbish_technician = assigned_technician || 'Senior Refurbishment Specialist';
      if (notes) updates.refurbish_notes = notes;
      responseMsg = `Unit ${unit.serial_number} moved to stage: ${next_stage}.`;
    }

    await db.collection('serialized_inventory_units').updateOne(
      { _id: unit._id },
      { $set: updates }
    );

    notifyAdmin('inventory:refurbish_updated', {
      unit_id: unit.unit_id,
      serial: unit.serial_number,
      next_stage
    });

    return res.status(200).json({
      success: true,
      message: responseMsg,
      updates
    });
  } catch (err) {
    console.error('Refurbish step error:', err);
    return res.status(500).json({ error: 'Failed to update refurbishment stage' });
  }
});

// GET /api/inventory/kpis - Inventory Operations & Valuation KPIs
router.get('/inventory/kpis', async (req, res) => {
  try {
    const db = getDb();
    await ensureSerializedUnits(db);

    const units = await db.collection('serialized_inventory_units').find({}).toArray();

    const totalUnits = units.length;
    const activeLeaseCount = units.filter(u => u.lifecycle_status === 'ACTIVE_LEASE').length;
    const inWarehouseCount = units.filter(u => u.lifecycle_status === 'IN_WAREHOUSE').length;
    const inRefurbCount = units.filter(u => u.lifecycle_status === 'UNDER_REFURBISHMENT' || u.lifecycle_status === 'RETURN_INSPECTION').length;

    const totalProcurement = units.reduce((acc, u) => acc + (u.procurement_cost || 0), 0);
    const totalBookValue = units.reduce((acc, u) => acc + (u.depreciation_book_value || 0), 0);
    const totalRentalRev = units.reduce((acc, u) => acc + (u.rental_revenue_generated || 0), 0);

    const fleetUtilizationPct = totalUnits > 0 ? Math.round((activeLeaseCount / totalUnits) * 100) : 0;
    const fleetAvgRoiPct = totalProcurement > 0 ? Math.round((totalRentalRev / totalProcurement) * 100) : 0;

    return res.status(200).json({
      total_units: totalUnits,
      active_leased: activeLeaseCount,
      in_warehouse: inWarehouseCount,
      under_refurbishment: inRefurbCount,
      fleet_utilization_pct: fleetUtilizationPct,
      total_fleet_procurement_cost: totalProcurement,
      depreciated_book_value: totalBookValue,
      total_rental_revenue_recovered: totalRentalRev,
      fleet_avg_roi_pct: fleetAvgRoiPct,
      depots: DEPOTS,
      stages: REFURBISH_STAGES
    });
  } catch (err) {
    console.error('Inventory KPIs error:', err);
    return res.status(500).json({ error: 'Failed to calculate inventory KPIs' });
  }
});

module.exports = router;
