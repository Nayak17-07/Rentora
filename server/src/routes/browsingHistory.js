const express = require('express');
const crypto = require('crypto');
const { getDb } = require('../db');
const { optionalAuth } = require('../auth');

const router = express.Router();

/**
 * Format relative time (e.g., "Just now", "5m ago", "2h ago", "Yesterday")
 */
function getRelativeTimeString(date) {
  if (!date) return 'Recently';
  const now = new Date();
  const past = new Date(date);
  const diffMs = Math.max(0, now - past);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

/**
 * Helper to resolve user/session identifier
 */
function resolveUserId(req) {
  if (req.user && req.user.id) {
    return String(req.user.id);
  }
  const sessionHeader = req.headers['x-session-id'] || req.headers['x-guest-id'];
  const sessionBody = req.body && (req.body.session_id || req.body.guest_id);
  const sessionQuery = req.query && (req.query.session_id || req.query.guest_id);
  return sessionHeader || sessionBody || sessionQuery || null;
}

/**
 * POST /api/browsing-history/track
 * Also aliased as POST /api/browsing-history/
 * Records or updates a product view in the user's browsing history
 */
router.post(['/browsing-history/track', '/browsing-history/', '/browsing-history'], optionalAuth, async (req, res) => {
  try {
    const db = getDb();
    const userId = resolveUserId(req);
    const { appliance_id, source = 'catalog', duration_seconds = 0 } = req.body;

    if (!appliance_id) {
      return res.status(400).json({ error: 'appliance_id is required' });
    }

    if (!userId) {
      return res.status(200).json({ 
        success: true, 
        tracked: false, 
        message: 'Guest session without identifier; cached in client localStorage.' 
      });
    }

    // Lookup appliance details to verify existence
    const cleanAppId = String(appliance_id);
    const appliance = await db.collection('appliances').findOne({
      $or: [{ appliance_id: cleanAppId }, { _id: cleanAppId }]
    });

    if (!appliance) {
      return res.status(404).json({ error: 'Appliance not found in catalog' });
    }

    const now = new Date();
    const resolvedApplianceId = appliance.appliance_id || cleanAppId;

    // Upsert browsing record: increment view_count, update last_viewed_at
    const filter = { user_id: userId, appliance_id: resolvedApplianceId };
    const update = {
      $set: {
        user_id: userId,
        appliance_id: resolvedApplianceId,
        category_id: appliance.category_id || 'Appliances',
        sub_category: appliance.sub_category || '',
        rental_name: appliance.rental_name || '',
        monthly_price: parseFloat(appliance.monthly_price) || 0,
        image_url: appliance.image_url || '',
        last_viewed_at: now,
        last_source: source,
        duration_seconds: Math.max(0, parseInt(duration_seconds, 10) || 0)
      },
      $inc: { view_count: 1 },
      $setOnInsert: {
        _id: crypto.randomUUID(),
        first_viewed_at: now
      }
    };

    const result = await db.collection('browsing_history').updateOne(filter, update, { upsert: true });

    // Enforce history size cap per user (keep top 50 most recent views)
    const totalCount = await db.collection('browsing_history').countDocuments({ user_id: userId });
    if (totalCount > 50) {
      const oldestDocs = await db.collection('browsing_history')
        .find({ user_id: userId })
        .sort({ last_viewed_at: -1 })
        .skip(50)
        .toArray();
      
      if (oldestDocs.length > 0) {
        const idsToRemove = oldestDocs.map(d => d._id);
        await db.collection('browsing_history').deleteMany({ _id: { $in: idsToRemove } });
      }
    }

    return res.status(200).json({
      success: true,
      tracked: true,
      appliance_id: resolvedApplianceId,
      rental_name: appliance.rental_name,
      last_viewed_at: now.toISOString(),
      upserted: !!result.upsertedCount
    });
  } catch (err) {
    console.error('Track browsing history error:', err);
    return res.status(500).json({ error: 'Internal server error tracking browsing event' });
  }
});

/**
 * GET /api/browsing-history/
 * Fetches user's recently viewed appliances sorted by last_viewed_at DESC
 */
router.get(['/browsing-history/', '/browsing-history'], optionalAuth, async (req, res) => {
  try {
    const db = getDb();
    const userId = resolveUserId(req);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const city = req.query.city || null;

    if (!userId) {
      return res.status(200).json({
        history: [],
        total_count: 0,
        message: 'No active session or user identifier provided.'
      });
    }

    // Fetch user's browsing history from MongoDB
    const records = await db.collection('browsing_history')
      .find({ user_id: userId })
      .sort({ last_viewed_at: -1 })
      .limit(limit)
      .toArray();

    if (records.length === 0) {
      return res.status(200).json({
        history: [],
        total_count: 0
      });
    }

    // Enrich with current live appliance details from master catalog
    const applianceIds = records.map(r => r.appliance_id);
    const appliances = await db.collection('appliances')
      .find({
        $or: [
          { appliance_id: { $in: applianceIds } },
          { _id: { $in: applianceIds } }
        ]
      })
      .toArray();

    const appMap = new Map();
    for (const app of appliances) {
      if (app.appliance_id) appMap.set(app.appliance_id, app);
      if (app._id) appMap.set(String(app._id), app);
    }

    // Build hydrated response
    const hydratedHistory = [];
    for (const rec of records) {
      const app = appMap.get(rec.appliance_id);
      if (!app) continue; // Skip archived/deleted items

      // If city filter specified, check city availability
      const cities = app.available_cities || app.cities_available;
      if (city && cities && Array.isArray(cities)) {
        if (!cities.some(c => String(c).toLowerCase() === city.toLowerCase())) {
          continue;
        }
      }

      hydratedHistory.push({
        history_id: String(rec._id),
        appliance_id: rec.appliance_id,
        rental_name: app.rental_name || rec.rental_name,
        category_id: app.category_id || rec.category_id,
        sub_category: app.sub_category || rec.sub_category,
        monthly_price: parseFloat(app.monthly_price || rec.monthly_price),
        security_deposit: parseFloat(app.security_deposit || (app.monthly_price * 1.5)),
        pricing: app.pricing || {
          "3": app.monthly_price,
          "6": Math.round(app.monthly_price * 0.9),
          "12": Math.round(app.monthly_price * 0.8)
        },
        image_url: app.image_url || rec.image_url,
        stock_quantity: typeof app.stock_quantity === 'number' ? app.stock_quantity : (parseInt(app.stock_quantity, 10) || 0),
        in_stock: (app.stock_quantity || 0) > 0,
        rating: app.rating || 4.8,
        reviews_count: app.reviews_count || 12,
        first_viewed_at: rec.first_viewed_at ? rec.first_viewed_at.toISOString() : null,
        last_viewed_at: rec.last_viewed_at ? rec.last_viewed_at.toISOString() : null,
        relative_time: getRelativeTimeString(rec.last_viewed_at),
        view_count: rec.view_count || 1,
        source: rec.last_source || 'catalog'
      });
    }

    return res.status(200).json({
      history: hydratedHistory,
      total_count: hydratedHistory.length,
      user_id: userId
    });
  } catch (err) {
    console.error('Fetch browsing history error:', err);
    return res.status(500).json({ error: 'Internal server error fetching browsing history' });
  }
});

/**
 * DELETE /api/browsing-history/:appliance_id
 * Removes a specific appliance from the customer's browsing history
 */
router.delete('/browsing-history/:appliance_id', optionalAuth, async (req, res) => {
  try {
    const db = getDb();
    const userId = resolveUserId(req);
    const applianceId = req.params.appliance_id;

    if (!userId) {
      return res.status(400).json({ error: 'User or session identification required to delete history item' });
    }

    const deleteResult = await db.collection('browsing_history').deleteOne({
      user_id: userId,
      appliance_id: applianceId
    });

    return res.status(200).json({
      success: true,
      message: 'Item removed from browsing history',
      appliance_id: applianceId,
      deleted_count: deleteResult.deletedCount
    });
  } catch (err) {
    console.error('Delete browsing history item error:', err);
    return res.status(500).json({ error: 'Internal server error deleting browsing history item' });
  }
});

/**
 * DELETE /api/browsing-history/
 * Clears the customer's entire browsing history
 */
router.delete(['/browsing-history/', '/browsing-history'], optionalAuth, async (req, res) => {
  try {
    const db = getDb();
    const userId = resolveUserId(req);

    if (!userId) {
      return res.status(400).json({ error: 'User or session identification required to clear browsing history' });
    }

    const deleteResult = await db.collection('browsing_history').deleteMany({
      user_id: userId
    });

    return res.status(200).json({
      success: true,
      message: 'Entire browsing history cleared successfully',
      cleared_count: deleteResult.deletedCount,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Clear browsing history error:', err);
    return res.status(500).json({ error: 'Internal server error clearing browsing history' });
  }
});

/**
 * GET /api/browsing-history/stats
 * Customer browsing insights (Top category, viewed count, avg price bracket)
 */
router.get('/browsing-history-stats', optionalAuth, async (req, res) => {
  try {
    const db = getDb();
    const userId = resolveUserId(req);

    if (!userId) {
      return res.status(200).json({
        total_viewed: 0,
        top_category: null,
        avg_price: 0
      });
    }

    const stats = await db.collection('browsing_history').aggregate([
      { $match: { user_id: userId } },
      {
        $group: {
          _id: '$category_id',
          count: { $sum: 1 },
          avg_price: { $avg: '$monthly_price' }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    const totalViewed = stats.reduce((acc, curr) => acc + curr.count, 0);
    const topCategory = stats.length > 0 ? stats[0]._id : null;
    const avgPrice = stats.length > 0 ? Math.round(stats[0].avg_price || 0) : 0;

    return res.status(200).json({
      total_viewed: totalViewed,
      top_category: topCategory,
      avg_price: avgPrice,
      categories_explored: stats.map(s => ({ category: s._id, count: s.count }))
    });
  } catch (err) {
    console.error('Browsing history stats error:', err);
    return res.status(500).json({ error: 'Failed to compute browsing stats' });
  }
});

module.exports = router;
