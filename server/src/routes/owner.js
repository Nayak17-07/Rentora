const express = require('express');
const crypto = require('crypto');
const { getDb } = require('../db');
const { authenticateJWT, requireRole } = require('../auth');

const router = express.Router();

// Enforce authentication & owner RBAC across all owner dashboard and fleet operations
router.use(authenticateJWT, requireRole('owner', 'admin'));

// GET /api/owner/dashboard/ - Overview metrics and active bookings for the logged-in owner
router.get('/dashboard/', async (req, res) => {
  try {
    const db = getDb();
    const ownerId = req.user.id;

    // Fetch appliances listed by this owner
    const myAppliances = await db.collection('appliances')
      .find({ owner_id: ownerId })
      .sort({ created_at: -1 })
      .toArray();

    const applianceIds = myAppliances.map(a => a.appliance_id || a._id);

    // Fetch rentals for these appliances
    let activeBookings = [];
    if (applianceIds.length > 0) {
      activeBookings = await db.collection('rentals')
        .find({ appliance_id: { $in: applianceIds } })
        .sort({ rented_at: -1 })
        .toArray();
    }

    // Compute metrics
    const totalListings = myAppliances.length;
    const activeRentals = activeBookings.filter(b => b.status === 'active');
    const activeRentedUnits = activeRentals.length;

    // Total earnings from completed and active rentals (85% payout to owner, 15% platform fee)
    const grossRent = activeBookings.reduce((sum, b) => sum + (parseFloat(b.monthly_rent) || 0), 0);
    const totalEarnings = Math.round(grossRent * 0.85);

    // Projected monthly recurring payout from currently active rentals
    const monthlyGross = activeRentals.reduce((sum, b) => sum + (parseFloat(b.monthly_rent) || 0), 0);
    const monthlyProjectedPayout = Math.round(monthlyGross * 0.85);

    // Format active bookings with customer info
    const formattedBookings = [];
    for (const b of activeBookings) {
      const user = await db.collection('users').findOne({ _id: b.user_id }, { projection: { password: 0 } });
      const app = myAppliances.find(a => (a.appliance_id || a._id) === b.appliance_id);

      formattedBookings.push({
        _id: String(b._id),
        rental_id: String(b._id),
        customer_name: user ? user.username || 'Customer' : 'Customer',
        customer_email: user ? user.email || '' : '',
        appliance_name: app ? app.rental_name : 'Appliance',
        monthly_rent: b.monthly_rent,
        owner_share: Math.round((parseFloat(b.monthly_rent) || 0) * 0.85),
        tenure: b.tenure,
        status: b.status,
        rented_at: b.rented_at instanceof Date ? b.rented_at.toISOString() : b.rented_at
      });
    }

    return res.status(200).json({
      owner: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role
      },
      metrics: {
        total_listings: totalListings,
        active_rented_units: activeRentedUnits,
        total_earnings: totalEarnings,
        monthly_projected_payout: monthlyProjectedPayout,
        platform_commission_pct: 15
      },
      my_appliances: myAppliances.map(a => ({ ...a, _id: String(a._id) })),
      active_bookings: formattedBookings
    });
  } catch (err) {
    console.error('Owner dashboard error:', err);
    return res.status(500).json({ error: 'Internal server error fetching owner dashboard' });
  }
});

// POST /api/owner/appliances/ - Owner adds a new appliance listing to catalog
router.post('/appliances/', authenticateJWT, async (req, res) => {
  try {
    const db = getDb();
    const ownerId = req.user.id;
    const ownerName = req.user.username;
    const data = req.body;

    const rentalName = data.rental_name;
    if (!rentalName) {
      return res.status(400).json({ error: 'rental_name is required' });
    }

    const appId = crypto.randomUUID();
    const monthlyPrice = parseFloat(data.monthly_price);
    if (!Number.isFinite(monthlyPrice) || monthlyPrice < 50 || monthlyPrice > 100000) {
      return res.status(400).json({ error: 'Monthly price must be a valid number between ₹50 and ₹1,00,000' });
    }

    const deposit = parseFloat(data.security_deposit !== undefined ? data.security_deposit : Math.round(monthlyPrice * 1.5));
    if (!Number.isFinite(deposit) || deposit < 0 || deposit > 200000) {
      return res.status(400).json({ error: 'Security deposit must be a valid number between ₹0 and ₹2,00,000' });
    }

    const stock = parseInt(data.stock_quantity !== undefined ? data.stock_quantity : 1, 10);
    if (!Number.isInteger(stock) || stock <= 0 || stock > 500) {
      return res.status(400).json({ error: 'Stock quantity must be an integer between 1 and 500' });
    }

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
      brand: data.brand || `${ownerName}'s Collection`,
      monthly_price: monthlyPrice,
      daily_price: parseFloat(data.daily_price || Math.round((monthlyPrice / 30) * 100) / 100),
      pricing,
      security_deposit: deposit,
      stock_quantity: stock,
      available_cities: cities,
      description: data.description || 'Verified peer-listed appliance available for flexible lease.',
      image_url: data.image_url || 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&q=80&w=600',
      tag: 'Owner Listed',
      owner_id: ownerId,
      owner_name: ownerName,
      owner_role: 'owner',
      created_at: new Date()
    };

    await db.collection('appliances').insertOne(doc);
    doc._id = String(doc._id);

    return res.status(201).json({
      success: 'Appliance listed successfully',
      appliance: doc
    });
  } catch (err) {
    console.error('Owner add appliance error:', err);
    return res.status(500).json({ error: 'Internal server error adding appliance' });
  }
});

// PUT /api/owner/appliances/:id - Owner updates their own listing
router.put('/appliances/:id', authenticateJWT, async (req, res) => {
  try {
    const db = getDb();
    const ownerId = req.user.id;
    const appId = req.params.id;

    const existing = await db.collection('appliances').findOne({
      $or: [{ appliance_id: appId }, { _id: appId }],
      owner_id: ownerId
    });

    if (!existing) {
      return res.status(404).json({ error: 'Appliance not found or you do not have permission to edit it' });
    }

    const data = req.body;
    const updates = {};
    ['rental_name', 'category_id', 'sub_category', 'brand', 'description', 'image_url'].forEach(f => {
      if (data[f] !== undefined) updates[f] = data[f];
    });

    if (data.monthly_price !== undefined) updates.monthly_price = parseFloat(data.monthly_price);
    if (data.security_deposit !== undefined) updates.security_deposit = parseFloat(data.security_deposit);
    if (data.stock_quantity !== undefined) updates.stock_quantity = parseInt(data.stock_quantity, 10);
    if (data.pricing && typeof data.pricing === 'object') updates.pricing = data.pricing;

    updates.updated_at = new Date();

    await db.collection('appliances').updateOne({ _id: existing._id }, { $set: updates });
    const updated = await db.collection('appliances').findOne({ _id: existing._id });
    updated._id = String(updated._id);

    return res.status(200).json({
      success: 'Listing updated successfully',
      appliance: updated
    });
  } catch (err) {
    console.error('Owner update error:', err);
    return res.status(500).json({ error: 'Internal server error updating listing' });
  }
});

// DELETE /api/owner/appliances/:id - Owner deletes their own listing (blocked if active rentals exist)
router.delete('/appliances/:id', async (req, res) => {
  try {
    const db = getDb();
    const ownerId = req.user.id;
    const appId = req.params.id;

    const app = await db.collection('appliances').findOne({
      $or: [{ appliance_id: appId }, { _id: appId }],
      owner_id: ownerId
    });

    if (!app) {
      return res.status(404).json({ error: 'Listing not found or you do not have permission to delete it' });
    }

    // Bug 19: Check for active rentals before deleting
    const targetAppId = app.appliance_id || String(app._id);
    const activeRental = await db.collection('rentals').findOne({
      $or: [{ appliance_id: targetAppId }, { appliance_id: String(app._id) }],
      status: 'active'
    });

    if (activeRental) {
      return res.status(400).json({
        error: 'Cannot delete listing: An active customer lease is currently ongoing for this appliance. Please conclude the rental before removing.'
      });
    }

    await db.collection('appliances').deleteOne({ _id: app._id });

    return res.status(200).json({ success: 'Listing removed successfully' });
  } catch (err) {
    console.error('Owner delete error:', err);
    return res.status(500).json({ error: 'Internal server error deleting listing' });
  }
});

// POST /api/owner/withdraw/ - Request payout verified against genuine available ledger balance
router.post('/withdraw/', async (req, res) => {
  try {
    const db = getDb();
    const ownerId = req.user.id;
    const { amount, method = 'upi', upi_id, bank_account, ifsc } = req.body || {};

    const withdrawAmt = parseFloat(amount);
    if (!Number.isFinite(withdrawAmt) || withdrawAmt <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount. Must be a positive number.' });
    }

    // Bug 5 & 20: Compute true available ledger balance
    const myApps = await db.collection('appliances').find({ owner_id: ownerId }).toArray();
    const appIds = myApps.map(a => a.appliance_id || a._id);

    let totalEarned = 0;
    if (appIds.length > 0) {
      const bookings = await db.collection('rentals').find({
        appliance_id: { $in: appIds },
        status: { $in: ['active', 'inactive', 'delivered'] }
      }).toArray();
      totalEarned = bookings.reduce((sum, b) => sum + Math.round((parseFloat(b.monthly_rent) || 0) * 0.85), 0);
    }

    const previousPayouts = await db.collection('owner_payouts').find({
      owner_id: ownerId,
      status: { $in: ['COMPLETED', 'PENDING_SETTLEMENT', 'PROCESSED'] }
    }).toArray();

    const totalWithdrawn = previousPayouts.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const availableBalance = Math.max(0, totalEarned - totalWithdrawn);

    if (withdrawAmt > availableBalance) {
      return res.status(400).json({
        error: `Insufficient earnings balance. Requested: ₹${withdrawAmt.toLocaleString('en-IN')}, Available: ₹${availableBalance.toLocaleString('en-IN')}. Please wait for rental subscriptions to settle.`
      });
    }

    const payoutId = `PAY-${crypto.randomInt(1000, 10000)}`;
    const utr = `UTR-${method.toUpperCase()}-${crypto.randomInt(10000000, 100000000)}`;
    const now = new Date();

    const payoutRecord = {
      _id: crypto.randomUUID(),
      payout_id: payoutId,
      owner_id: ownerId,
      amount: withdrawAmt,
      method: method === 'upi' ? `UPI (${upi_id || 'partner@bank'})` : `Bank (${bank_account || 'Verified Account'})`,
      ifsc: ifsc || null,
      utr,
      status: 'PENDING_SETTLEMENT',
      simulation_note: 'Simulation Workflow: Payout request submitted for automated banking clearance.',
      created_at: now
    };

    await db.collection('owner_payouts').insertOne(payoutRecord);

    try {
      const { notifyAdmin } = require('../socket');
      notifyAdmin('payout:requested', {
        payout_id: payoutId,
        owner_id: ownerId,
        amount: withdrawAmt,
        utr,
        status: 'COMPLETED'
      });
    } catch (e) {
      console.warn('Socket notification error on payout:', e.message);
    }

    return res.status(200).json({
      success: 'Withdrawal processed successfully',
      payout: payoutRecord
    });
  } catch (err) {
    console.error('Owner withdrawal error:', err);
    return res.status(500).json({ error: 'Internal server error processing withdrawal' });
  }
});

// GET /api/owner/export/ - Export owner inventory & earnings ledger to CSV
router.get('/export/', authenticateJWT, async (req, res) => {
  try {
    const db = getDb();
    const ownerId = req.user.id;

    const myAppliances = await db.collection('appliances').find({ owner_id: ownerId }).toArray();
    const applianceIds = myAppliances.map(a => a.appliance_id || a._id);

    let bookings = [];
    if (applianceIds.length > 0) {
      bookings = await db.collection('rentals').find({ appliance_id: { $in: applianceIds } }).toArray();
    }

    const headers = [
      'rental_id', 'appliance_name', 'monthly_rent', 'owner_net_share_85pct',
      'platform_fee_15pct', 'tenure_months', 'status', 'rented_at'
    ];

    const data = bookings.map(b => {
      const app = myAppliances.find(a => (a.appliance_id || a._id) === b.appliance_id);
      const rent = parseFloat(b.monthly_rent) || 0;
      return {
        rental_id: String(b._id),
        appliance_name: app ? app.rental_name : 'Appliance',
        monthly_rent: rent,
        owner_net_share_85pct: Math.round(rent * 0.85),
        platform_fee_15pct: Math.round(rent * 0.15),
        tenure_months: b.tenure,
        status: b.status,
        rented_at: b.rented_at ? new Date(b.rented_at).toISOString().slice(0, 10) : ''
      };
    });

    const { buildCsvString } = require('../utils/csv');
    const csvString = buildCsvString(headers, data);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=rentora_owner_earnings.csv');
    return res.status(200).send(csvString);
  } catch (err) {
    console.error('Owner export error:', err);
    return res.status(500).json({ error: 'Internal server error exporting ledger' });
  }
});

module.exports = router;
