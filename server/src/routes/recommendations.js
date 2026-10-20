const express = require('express');
const crypto = require('crypto');
const { getDb } = require('../db');
const { optionalAuth, authenticateJWT, requireRole } = require('../auth');

const router = express.Router();

// Cross-Category Room Pairing Association Matrix
const COMPLEMENTARY_PAIRS = {
  'refrigerators': ['Microwaves', 'Water Purifiers', 'Induction Cooktops', 'Dining Tables'],
  'washing machines': ['Water Purifiers', 'Cloth Dryers', 'Microwaves', 'Air Conditioners'],
  'air conditioners': ['Air Purifiers', 'Beds', 'Wardrobes', 'Study Desks'],
  'microwaves': ['Refrigerators', 'Water Purifiers', 'Induction Cooktops', 'Dining Tables'],
  'water purifiers': ['Refrigerators', 'Microwaves', 'Induction Cooktops'],
  'televisions': ['Sofas', 'Coffee Tables', 'Living Room', 'TV Units', 'Recliners'],
  'sofas': ['Coffee Tables', 'Televisions', 'Living Room', 'Study Desks', 'Recliners'],
  'beds': ['Wardrobes', 'Bedside Tables', 'Mattresses', 'Air Conditioners', 'Dressing Tables'],
  'wardrobes': ['Beds', 'Bedside Tables', 'Dressing Tables', 'Air Conditioners'],
  'study desks': ['Ergonomic Chairs', 'Bookshelves', 'Air Conditioners', 'Living Room'],
  'dining tables': ['Refrigerators', 'Microwaves', 'Water Purifiers', 'Living Room'],
  'appliances': ['Furniture', 'Water Purifiers', 'Microwaves'],
  'furniture': ['Appliances', 'Televisions', 'Lighting']
};

function normalizeCategory(str) {
  if (!str) return '';
  return str.toLowerCase().trim();
}

function findComplementaryCategories(subCategory, categoryId) {
  const normSub = normalizeCategory(subCategory);
  const normCat = normalizeCategory(categoryId);

  let matches = [];
  for (const [key, targets] of Object.entries(COMPLEMENTARY_PAIRS)) {
    if (normSub.includes(key) || normCat.includes(key) || key.includes(normSub)) {
      matches.push(...targets);
    }
  }
  return [...new Set(matches)];
}

function extractEcoEnergyInfo(item) {
  const text = `${item.rental_name || ''} ${item.description || ''} ${item.specifications || ''}`.toLowerCase();
  if (text.includes('5 star') || text.includes('5-star') || text.includes('inverter')) {
    return { star: 5, savings: 380, label: '5★ Inverter Eco Champion' };
  }
  if (text.includes('4 star') || text.includes('4-star')) {
    return { star: 4, savings: 240, label: '4★ Energy Saver' };
  }
  if (text.includes('3 star') || text.includes('3-star')) {
    return { star: 3, savings: 120, label: '3★ Efficient' };
  }
  return { star: 3, savings: 80, label: 'Standard Efficiency' };
}

// GET /api/recommendations/
// Supports query parameters:
// - city: e.g. "Bangalore", "Hyderabad", "Mumbai"
// - filter: 'for_you' | 'room_bundles' | 'trending' | 'eco_saver'
// - appliance_id: optional target item to find complementary accessories for
// - limit: max items to return (default 8)
router.get('/recommendations/', optionalAuth, async (req, res) => {
  try {
    const db = getDb();
    const userId = req.user ? req.user.id : null;
    const requestedCity = req.query.city || 'Bangalore';
    const filter = req.query.filter || 'for_you';
    const targetApplianceId = req.query.appliance_id || null;
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 8));

    // 1. Gather context: User Cart, User Active Rentals, and Target Appliance
    let userCartItems = [];
    let userActiveRentals = [];
    let targetAppliance = null;

    if (userId) {
      userCartItems = await db.collection('carts').find({ user_id: userId }).toArray();
      userActiveRentals = await db.collection('rentals').find({ user_id: userId }).toArray();
    }

    if (targetApplianceId) {
      targetAppliance = await db.collection('appliances').findOne({
        $or: [{ _id: targetApplianceId }, { appliance_id: targetApplianceId }]
      });
    }

    // Identify user's interacted categories and existing appliance IDs
    const existingApplianceIds = new Set();
    const interactedSubCategories = [];
    let totalRentSum = 0;
    let rentCount = 0;

    for (const c of userCartItems) {
      const aid = String(c.appliance_id || c._id);
      existingApplianceIds.add(aid);
      if (c.appliance) {
        interactedSubCategories.push({
          id: aid,
          name: c.appliance.rental_name,
          category: c.appliance.category_id,
          subCategory: c.appliance.sub_category
        });
        const p = parseFloat(c.appliance.monthly_price) || 0;
        if (p > 0) { totalRentSum += p; rentCount++; }
      }
    }

    for (const r of userActiveRentals) {
      const aid = String(r.appliance_id || r._id);
      existingApplianceIds.add(aid);
      if (r.appliance) {
        interactedSubCategories.push({
          id: aid,
          name: r.appliance.rental_name,
          category: r.appliance.category_id,
          subCategory: r.appliance.sub_category
        });
        const p = parseFloat(r.monthly_rent || r.appliance.monthly_price) || 0;
        if (p > 0) { totalRentSum += p; rentCount++; }
      }
    }

    if (targetAppliance) {
      const aid = String(targetAppliance.appliance_id || targetAppliance._id);
      interactedSubCategories.push({
        id: aid,
        name: targetAppliance.rental_name,
        category: targetAppliance.category_id,
        subCategory: targetAppliance.sub_category
      });
    }

    const avgBudget = rentCount > 0 ? (totalRentSum / rentCount) : 1200;

    // 2. Memory-Safe & Indexed Database Candidate Retrieval
    // Rather than pulling the entire catalog into Node heap, filter directly in MongoDB with a bounded candidate pool (max 40)
    let candidatePool = [];

    if (filter === 'eco_saver') {
      const ecoRegex = /inverter|5[- ]star|4[- ]star/i;
      candidatePool = await db.collection('appliances')
        .find({
          stock_quantity: { $gt: 0 },
          $or: [
            { rental_name: { $regex: ecoRegex } },
            { description: { $regex: ecoRegex } },
            { specifications: { $regex: ecoRegex } }
          ]
        })
        .limit(40)
        .toArray();
    } else if (filter === 'room_bundles') {
      const bundleRegex = /sofa|table|bed|refrigerator|microwave|washing|conditioner|purifier|tv|chair|package/i;
      candidatePool = await db.collection('appliances')
        .find({
          stock_quantity: { $gt: 0 },
          $or: [
            { category_id: { $regex: bundleRegex } },
            { sub_category: { $regex: bundleRegex } },
            { rental_name: { $regex: bundleRegex } }
          ]
        })
        .limit(40)
        .toArray();
    } else if (filter === 'trending') {
      candidatePool = await db.collection('appliances')
        .find({
          stock_quantity: { $gt: 0 },
          available_cities: { $regex: String(requestedCity).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
        })
        .sort({ rating: -1, stock_quantity: -1 })
        .limit(40)
        .toArray();
    } else {
      // 'for_you' hybrid personalized pool
      const complementaryTargets = [];
      for (const interacted of interactedSubCategories) {
        const comps = findComplementaryCategories(interacted.subCategory, interacted.category);
        complementaryTargets.push(...comps);
      }

      const orConditions = [{ rating: { $gte: 4.5 } }];
      if (complementaryTargets.length > 0) {
        const uniqueComps = [...new Set(complementaryTargets)].slice(0, 10);
        orConditions.unshift(
          { category_id: { $in: uniqueComps.map(c => new RegExp(c, 'i')) } },
          { sub_category: { $in: uniqueComps.map(c => new RegExp(c, 'i')) } }
        );
      }

      candidatePool = await db.collection('appliances')
        .find({
          stock_quantity: { $gt: 0 },
          $or: orConditions
        })
        .limit(40)
        .toArray();
    }

    // Safety fallback: if specific filter returned fewer than 4 items, top-up with general active inventory
    if (candidatePool.length < 4) {
      const fallbackItems = await db.collection('appliances')
        .find({ stock_quantity: { $gt: 0 } })
        .sort({ rating: -1 })
        .limit(20)
        .toArray();

      const existingIds = new Set(candidatePool.map(c => String(c._id)));
      for (const fb of fallbackItems) {
        if (!existingIds.has(String(fb._id))) {
          candidatePool.push(fb);
          existingIds.add(String(fb._id));
        }
      }
    }

    if (candidatePool.length === 0) {
      return res.status(200).json([]);
    }

    const scoredList = candidatePool.map((item, itemIdx) => {
      const itemIdStr = String(item._id);
      const applianceCodeStr = String(item.appliance_id || '');
      const isAlreadyInCartOrRental = existingApplianceIds.has(itemIdStr) || existingApplianceIds.has(applianceCodeStr);

      const itemPrice = parseFloat(item.monthly_price) || 800;
      const itemCityStr = String(item.available_cities || '').toLowerCase();
      const cityMatches = requestedCity ? itemCityStr.includes(requestedCity.toLowerCase()) : true;

      const ecoInfo = extractEcoEnergyInfo(item);

      let affinityScore = 0.20;
      let reason = `Top trending selection in ${requestedCity} with verified 5-star reliability`;
      let recType = 'CITY_TRENDING';
      let bundleBadge = 'Top Pick';

      // 1. Dynamic Mode Specialization
      if (filter === 'room_bundles') {
        recType = 'ROOM_BUNDLE';
        bundleBadge = 'Room Combo';
        affinityScore = 0.90;

        // Custom room pairing explanations
        const normName = normalizeCategory(item.rental_name);
        const normCat = normalizeCategory(item.category_id);
        if (normName.includes('sofa') || normCat.includes('living') || normName.includes('tv') || normName.includes('oled') || normName.includes('table')) {
          reason = `🛋️ Living Room Combo: Frequently paired with Coffee Tables & Sofas (15% Combo Savings)`;
        } else if (normName.includes('refrigerator') || normName.includes('microwave') || normName.includes('purifier')) {
          reason = `🍳 Smart Kitchen Duo: Rented together with Microwave & Purifier (15% Combo Savings)`;
        } else if (normName.includes('bed') || normName.includes('wardrobe') || normName.includes('conditioner')) {
          reason = `🛏️ Bedroom Suite: Commonly paired with Inverter AC & Wardrobe (15% Combo Savings)`;
        } else {
          reason = `🧺 Laundry Station: Pairs with Inverter Washer for 15% Combo Discount`;
        }
      } else if (filter === 'eco_saver') {
        recType = 'ECO_SAVER';
        bundleBadge = ecoInfo.star >= 5 ? '5★ Eco Champion' : 'Energy Saver';
        affinityScore = 0.85;
        reason = `⚡ ${ecoInfo.label}: Consumes up to 40% less power — saves ~₹${ecoInfo.savings}/mo`;
      } else if (filter === 'trending') {
        recType = 'CITY_TRENDING';
        bundleBadge = `Popular in ${requestedCity}`;
        affinityScore = 0.70;
        reason = `📍 Top rented appliance in ${requestedCity} with 4.8★ user rating`;
      } else {
        // 'for_you'
        if (interactedSubCategories.length > 0) {
          for (const interacted of interactedSubCategories) {
            const complementaries = findComplementaryCategories(interacted.subCategory, interacted.category);
            const itemCatNorm = normalizeCategory(item.category_id);
            const itemSubNorm = normalizeCategory(item.sub_category);
            const itemNameNorm = normalizeCategory(item.rental_name);

            const isComplementary = complementaries.some(comp => {
              const compNorm = normalizeCategory(comp);
              return itemCatNorm.includes(compNorm) || itemSubNorm.includes(compNorm) || itemNameNorm.includes(compNorm);
            });

            if (isComplementary) {
              affinityScore = Math.max(affinityScore, 0.88);
              reason = `Frequently rented together with your ${interacted.name} (15% Combo Savings)`;
              recType = 'ROOM_BUNDLE';
              bundleBadge = 'Room Combo';
              break;
            }
          }
        } else {
          recType = 'HYBRID_AFFINITY';
          bundleBadge = 'Personalized Pick';
          reason = `AI Personalized match based on customer satisfaction and budget efficiency`;
        }
      }

      // Geo-popularity boost
      let geoScore = cityMatches ? 0.30 : 0.05;

      // Rating & stock popularity boost
      const rating = parseFloat(item.rating) || 4.6;
      let popularityScore = Math.min(0.25, (rating / 5.0) * 0.25);

      // Eco energy boost
      let ecoScore = (ecoInfo.star / 5.0) * 0.25;

      // Budget fit score
      let budgetScore = 0.10;
      const budgetDiffPct = Math.abs(itemPrice - avgBudget) / avgBudget;
      if (budgetDiffPct <= 0.35) {
        budgetScore = 0.20;
      }

      // Calculate composite score (0 to 1) with category diversification factor
      let composite = (
        affinityScore * 0.40 + 
        geoScore * 0.20 + 
        popularityScore * 0.20 + 
        ecoScore * 0.10 + 
        budgetScore * 0.10
      );

      // Rail-specific fine-tuning
      if (filter === 'eco_saver') {
        composite += (ecoInfo.savings / 400.0) * 0.35;
      } else if (filter === 'room_bundles') {
        // Give slight variety offset so adjacent items are from different categories
        composite += ((itemIdx % 4) * 0.03);
      }

      // Penalize items already in cart or rental so user sees fresh discovery items
      if (isAlreadyInCartOrRental) {
        composite *= 0.15;
      }

      // Scale to match percentage (84% to 98%)
      const matchPercentage = Math.min(98, Math.max(84, Math.round(80 + (composite * 18))));

      // Combo discount calculation
      const comboDiscountPct = recType === 'ROOM_BUNDLE' ? 15 : 10;
      const bundlePrice = Math.round(itemPrice * (1 - comboDiscountPct / 100));
      const discountAmount = itemPrice - bundlePrice;

      return {
        item,
        composite,
        matchPercentage,
        reason,
        recType,
        bundleBadge,
        ecoInfo,
        comboDiscountPct,
        bundlePrice,
        discountAmount,
        isAlreadyInCartOrRental
      };
    });

    // 4. Sort by composite score descending
    scoredList.sort((a, b) => b.composite - a.composite);

    // 5. Take top distinct recommendations
    const topScored = scoredList.slice(0, limit);

    // Format response matching schema
    const result = topScored.map((entry, idx) => {
      const app = { ...entry.item, _id: String(entry.item._id) };
      return {
        recommendation_id: `REC-${String(app._id).slice(-6)}-${idx}`,
        recommended_appliance_id: app._id,
        recommended_appliance_details: app,
        similarity_score: (entry.matchPercentage / 100),
        match_percentage: entry.matchPercentage,
        recommendation_reason: entry.reason,
        recommendation_type: entry.recType,
        bundle_badge: entry.bundleBadge,
        combo_discount_pct: entry.comboDiscountPct,
        bundle_price: entry.bundlePrice,
        discount_amount: entry.discountAmount,
        energy_savings_est: entry.ecoInfo.savings,
        energy_star_rating: entry.ecoInfo.star,
        city: requestedCity,
        last_updated: new Date()
      };
    });

    // Synchronize to MongoDB appliance_recommendations if user is logged in
    if (userId && result.length > 0) {
      try {
        const mongoDocs = result.map(r => ({
          _id: crypto.randomUUID(),
          user_id: userId,
          recommended_appliance_id: r.recommended_appliance_details._id,
          match_percentage: r.match_percentage,
          recommendation_reason: r.recommendation_reason,
          recommendation_type: r.recommendation_type,
          bundle_badge: r.bundle_badge,
          energy_savings_est: r.energy_savings_est,
          combo_discount_pct: r.combo_discount_pct,
          last_updated: new Date()
        }));
        await db.collection('appliance_recommendations').deleteMany({ user_id: userId });
        await db.collection('appliance_recommendations').insertMany(mongoDocs);
      } catch (saveErr) {
        console.warn('Sync to appliance_recommendations skipped:', saveErr.message);
      }
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('Fetch recommendations error:', err);
    return res.status(500).json({ error: 'Internal server error fetching recommendations' });
  }
});

// POST /api/recommendations/recompute (Admin trigger to rerun batch recommendation pipeline)
router.post('/recommendations/recompute', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    const { runPythonScript } = require('../utils/pythonRunner');
    const result = await runPythonScript('ml_pipeline/train_model.py', [], 45000);
    return res.status(200).json({ 
      message: 'Batch recommendation engine completed successfully', 
      output: result.stdout 
    });
  } catch (err) {
    console.error('Recompute batch recommendations error:', err.message);
    return res.status(500).json({ 
      error: 'Failed to execute recommendation training pipeline', 
      details: err.message 
    });
  }
});

module.exports = router;

