const express = require('express');
const { getDb } = require('../db');
const { optionalAuth } = require('../auth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// KNOWLEDGE BASE — Verified Rentora Policies & Guarantees
// ─────────────────────────────────────────────────────────────────────────────
const KNOWLEDGE_BASE = {
  damage_waiver: {
    title: "🛡️ Rentora Damage Waiver Policy",
    summary: "Accidental spills, minor fabric tears, surface scuffs, and electronic voltage surges are covered up to ₹10,000 at ₹0 deduction from your security deposit. For severe motor or structural defects, our certified technician arrives within 24 hours for free doorstep repair or zero-cost replacement.",
    action: { type: 'OPEN_MAINTENANCE', label: '🛠️ Book Free Inspection / Repair' },
    followUps: ["🛠️ Book Free Repair", "💰 Deposit Refund Rules", "💎 Buyout This Item"]
  },
  relocation: {
    title: "🚚 Free Inter-City Shifting",
    summary: "Relocating to another city? Rentora provides 100% FREE doorstep packing, transit insurance, and re-installation across 8 metro hubs (Hyderabad, Bangalore, Mumbai, Pune, Delhi-NCR, Chennai, Kolkata, Ahmedabad) after 6 months of active tenure.",
    action: { type: 'OPEN_RELOCATION', label: '🚚 Book Free Relocation Shifting' },
    followUps: ["🚚 Start Relocation Request", "🛡️ Damage Waiver Policy", "⚡ Extend Tenure (Save 20%)"]
  },
  buyout: {
    title: "💎 Rent-to-Own Equity Buyout Engine",
    summary: "You can own your rented appliance anytime! 70% of every rupee you have paid in monthly rent is credited directly as equity toward the buyout value. Your original security deposit is also offset against the balance, and an official Certificate of Permanent Ownership & title deed is generated immediately.",
    action: { type: 'NAVIGATE_RENTALS', label: '💎 Open Buyout & Tenure Engine' },
    followUps: ["💎 Calculate My Equity", "⚡ Tenure Extension (Save 20%)", "📦 View Active Rentals"]
  },
  tenure_extension: {
    title: "⚡ Tenure Extension & Long-Term Savings",
    summary: "Extend your rental plan anytime to unlock lower monthly rentals: Enjoy 10% OFF for 6-month extensions and 20% OFF for 12-month extensions. Plus, long-term subscribers receive complimentary annual deep cleaning.",
    action: { type: 'NAVIGATE_RENTALS', label: '⚡ View Tenure Extension Discounts' },
    followUps: ["⚡ Extend 6 Months (10% Off)", "⚡ Extend 12 Months (20% Off)", "💎 Permanent Buyout"]
  },
  deposit_refund: {
    title: "💰 Security Deposit Refund Policy",
    summary: "Your refundable security deposit is recorded on your lease. Once your rental concludes and our QA team completes the doorstep pickup inspection, 100% of the deposit balance is credited back to your bank account or UPI within 5 to 7 business days.",
    action: { type: 'NAVIGATE_RENTALS', label: '📦 View Active Rentals & Deposit' },
    followUps: ["📦 View Active Orders", "🛡️ Damage Waiver Policy", "🚚 Free Shifting"]
  },
  delivery: {
    title: "📍 48-Hour Delivery & White-Glove Setup",
    summary: "All Rentora orders include free doorstep delivery, hydraulic elevator handling, plumbing connections, and electric demos within 24 to 48 hours. You can track your delivery stage and provide your secure 4-digit OTP to the technician.",
    action: { type: 'NAVIGATE_RENTALS', label: '📍 Track Active Delivery & OTP' },
    followUps: ["📍 Track Live Van & OTP", "🛠️ Book Installation Help", "💡 Recommend Combos"]
  },
  pincode: {
    title: "🌍 Serviceable Cities & Delivery Pincodes",
    summary: "We deliver to over 4,500 pincodes across 5 primary metro zones: Bangalore, Mumbai, Hyderabad, Delhi-NCR, and Pune. Same-day delivery slots are available in select metro sectors.",
    action: { type: 'CHECK_PINCODE', label: '📍 Check My Pincode' },
    followUps: ["📍 Check Pincode", "💡 1 BHK Setup under ₹1,500", "🚚 Free Relocation"]
  },
  kyc: {
    title: "🔐 Mandatory Tenant KYC Compliance",
    summary: "Tenant verification is fast, digital, and 100% paperless! Every customer completes UIDAI Aadhaar verification in under 60 seconds to satisfy mandatory compliance for order approval, doorstep appliance delivery, and 100% refundable escrow deposit protection.",
    action: { type: 'NAVIGATE_KYC', label: '🔐 Complete Mandatory KYC' },
    followUps: ["🔐 Go to KYC Page", "💰 Deposit Refund Rules", "💡 Explore Catalog"]
  },
  late_fee: {
    title: "⏱️ Automated Late Fee and Overdue Rental Policy",
    summary: "Rentora provides a 2-day grace period after your scheduled rental contract expiry or billing date. If the appliance is not renewed or returned after the grace period, our automated scheduler assesses a standard overdue fee of Rs. 50 per calendar day. Overdue late fees are transparently offset against your refundable security deposit upon asset return.",
    action: { type: 'NAVIGATE_RENTALS', label: '📦 View Active Leases and Due Dates' },
    followUps: ["⚡ Extend Tenure (Save 20%)", "📦 View Active Rentals", "💰 Deposit Refund Rules"]
  },
  digital_agreement: {
    title: "📄 Digital Rental Agreement and Legal e-Sign (Module 4)",
    summary: "Every booking on Rentora is legally secured under the Information Technology Act, 2000 and the Indian Stamp Act, 1899. Your digital lease agreement includes an official e-Stamp reference, deposit reference ID, Rs. 10,000 damage waiver covenant, and cryptographic SHA-256 signature verification. You can view, verify, and print your signed agreement anytime under My Rentals.",
    action: { type: 'NAVIGATE_RENTALS', label: '📄 View Signed Digital Agreement' },
    followUps: ["📦 View My Rentals", "🛡️ Damage Waiver Policy", "💎 Rent-to-Own Equity"]
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FUZZY / INTENT TOKEN MATCHER
// ─────────────────────────────────────────────────────────────────────────────
function calculateIntentScore(tokens, keywords) {
  let score = 0;
  for (const token of tokens) {
    for (const kw of keywords) {
      if (token === kw) {
        score += 3;
      } else if (token.length >= 4 && kw.length >= 4) {
        if (token.includes(kw) || kw.includes(token)) {
          score += 1.5;
        }
      }
    }
  }
  return score;
}

const INTENT_KEYWORDS = {
  damage_waiver: ['damage', 'waiver', 'scratch', 'broken', 'break', 'leak', 'spill', 'defect', 'repair', 'technician', 'fix', 'wear', 'tear', 'burn', 'surge'],
  relocation: ['relocate', 'relocation', 'shift', 'shifting', 'move', 'moving', 'transfer', 'city', 'intercity', 'bangalore', 'mumbai', 'hyderabad', 'pune', 'delhi'],
  buyout: ['buyout', 'buy', 'own', 'purchase', 'equity', 'permanent', 'certificate', 'keep', 'renttoown', 'title'],
  tenure_extension: ['extend', 'tenure', 'extension', 'renew', 'renewal', 'longer', 'duration', 'discount', 'months', 'save'],
  deposit_refund: ['deposit', 'refund', 'return', 'money', 'back', 'escrow', 'deduction', 'guarantee'],
  delivery: ['delivery', 'deliver', 'track', 'tracking', 'status', 'van', 'vehicle', 'otp', 'installation', 'eta', 'when', 'arrives', 'courier'],
  pincode: ['pincode', 'area', 'locality', 'location', 'serviceable', 'service', 'deliverable', 'cities'],
    kyc: ['kyc', 'aadhaar', 'verification', 'verify', 'identity', 'document', 'proof', 'ekyc', 'approved'],
  late_fee: ['late', 'fee', 'penalty', 'delay', 'overdue', 'expire', 'expiry', 'grace', 'fine', 'extra', 'charges'],
  digital_agreement: ['agreement', 'contract', 'esign', 'e-sign', 'signature', 'stamp', 'legal', 'document', 'terms', 'lease']
};

// POST /api/concierge/chat
router.post('/concierge/chat', optionalAuth, async (req, res) => {
  try {
    const { message = '', context = {} } = req.body;
    const db = getDb();
    const cleanMsg = String(message || '').trim().toLowerCase();

    if (!cleanMsg) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    // Tokenize
    const tokens = cleanMsg
      .replace(/[^a-z0-9\s₹]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);

    // 1. Evaluate Policy Intents
    let bestIntent = null;
    let highestScore = 0;

    for (const [intentKey, keywords] of Object.entries(INTENT_KEYWORDS)) {
      const score = calculateIntentScore(tokens, keywords);
      if (score > highestScore && score >= 2.5) {
        highestScore = score;
        bestIntent = intentKey;
      }
    }

    let reply = "";
    let recommendations = [];
    let action = null;
    let suggestedChips = [
      "💡 1 BHK Setup under ₹1,500",
      "🛡️ Damage Waiver Policy",
      "🚚 Free City Shifting",
      "💎 How Rent-to-Own Works",
      "📦 Track My Delivery"
    ];

    // If a policy intent was identified with good confidence
    if (bestIntent && KNOWLEDGE_BASE[bestIntent]) {
      const kb = KNOWLEDGE_BASE[bestIntent];
      reply = `${kb.title}\n\n${kb.summary}`;
      action = kb.action;
      suggestedChips = kb.followUps;
    }

    // 2. Product & Room Package Recommendations
    // Detect whether user wants recommendations, or mentioned a product / budget
    const categoryPatterns = [
      { key: 'fridge', regex: /fridge|refrigerator|freezer/i, cat: 'Appliances', sub: 'Refrigerators' },
      { key: 'washing', regex: /washing|washer|dryer|laundry/i, cat: 'Appliances', sub: 'Washing Machines' },
      { key: 'ac', regex: /air conditioner|ac\b|cooler/i, cat: 'Appliances', sub: 'Air Conditioners' },
      { key: 'purifier', regex: /purifier|ro|water/i, cat: 'Appliances', sub: 'Water Purifiers' },
      { key: 'tv', regex: /television|tv\b|oled|smart tv/i, cat: 'Appliances', sub: 'Televisions' },
      { key: 'microwave', regex: /microwave|oven|grill/i, cat: 'Appliances', sub: 'Microwaves' },
      { key: 'sofa', regex: /sofa|couch|recliner|seating/i, cat: 'Living Room', sub: 'Sofas' },
      { key: 'bed', regex: /bed|mattress|cot/i, cat: 'Bedroom', sub: 'Beds' },
      { key: 'table', regex: /table|desk|dining|study/i, cat: 'Living Room', sub: 'Tables' },
      { key: 'chair', regex: /chair|stool|ergonomic/i, cat: 'Living Room', sub: 'Chairs' },
      { key: 'combo', regex: /combo|package|bhk|setup|suite|bundle/i, cat: 'Packages', sub: 'Packages' }
    ];

    const matchedCat = categoryPatterns.find(p => p.regex.test(cleanMsg));
    const budgetMatch = cleanMsg.match(/(?:under|below|less than|within|budget)\s*(?:₹|rs\.?|inr)?\s*(\d{3,5})/i) ||
                        cleanMsg.match(/(?:₹|rs\.?|inr)\s*(\d{3,5})/i) ||
                        cleanMsg.match(/(\d{3,5})\s*(?:rs|inr|per month|\/mo)/i);
    const maxBudget = budgetMatch ? parseInt(budgetMatch[1], 10) : null;

    const isRecQuery = Boolean(
      matchedCat ||
      maxBudget ||
      /recommend|suggest|show me|find|look for|options|cheap|budget|cost/i.test(cleanMsg)
    );

    if (isRecQuery || !reply) {
      const query = { stock_quantity: { $gt: 0 } };

      if (maxBudget) {
        query.monthly_price = { $lte: maxBudget };
      }

      if (matchedCat) {
        if (matchedCat.key === 'combo') {
          query.$or = [
            { category_id: { $regex: /package|combo|living|bedroom/i } },
            { sub_category: { $regex: /package|combo/i } },
            { rental_name: { $regex: /combo|set|package|bhk/i } }
          ];
        } else {
          query.$or = [
            { rental_name: { $regex: matchedCat.regex } },
            { sub_category: { $regex: new RegExp(matchedCat.sub, 'i') } },
            { category_id: { $regex: new RegExp(matchedCat.cat, 'i') } }
          ];
        }
      }

      // Live MongoDB search
      let matchingApps = await db.collection('appliances')
        .find(query)
        .sort({ rating: -1, monthly_price: 1 })
        .limit(4)
        .toArray();

      // Fallback: If budget was too strict, loosen budget constraint
      if (matchingApps.length === 0 && maxBudget) {
        delete query.monthly_price;
        matchingApps = await db.collection('appliances')
          .find(query)
          .sort({ monthly_price: 1 })
          .limit(4)
          .toArray();
      }

      if (matchingApps.length > 0) {
        recommendations = matchingApps.map(app => ({
          appliance_id: app.appliance_id || String(app._id),
          rental_name: app.rental_name,
          monthly_price: app.monthly_price,
          security_deposit: app.security_deposit || Math.round(app.monthly_price * 1.5),
          category_id: app.category_id,
          sub_category: app.sub_category,
          image_url: app.image_url || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80',
          rating: app.rating || 4.8
        }));

        if (!reply) {
          const budgetText = maxBudget ? ` under ₹${maxBudget.toLocaleString('en-IN')}/mo` : '';
          const categoryName = matchedCat ? (matchedCat.sub || matchedCat.cat) : 'top-rated';
          reply = `Here are ${matchingApps.length} verified ${categoryName} selections${budgetText} ready for priority 24–48h dispatch. Each includes our ₹10,000 accidental damage waiver and free annual maintenance! ⚡`;
          action = { type: 'VIEW_CATALOG', label: '🔍 Explore All Catalog Items' };
          suggestedChips = [
            "💡 1 BHK Living Combo",
            "🛡️ What happens if it breaks?",
            "🚚 Is relocation free?",
            "💎 Can I own this later?"
          ];
        }
      } else if (!reply) {
        reply = "I'm your Rentora Intelligent Assistant! You can ask me anything about rental plans, our ₹10,000 Damage Waiver, free inter-city shifting, or ask me to recommend a tailored appliance setup for your budget.";
        suggestedChips = [
          "💡 1 BHK Setup under ₹1,500",
          "🛡️ Damage Waiver Policy",
          "🚚 Free Relocation Rules",
          "💎 Rent-to-Own Equity Buyout"
        ];
      }
    }

    return res.status(200).json({
      reply,
      recommendations,
      action,
      suggestedChips,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Concierge chat error:', err);
    return res.status(500).json({
      error: 'Concierge processing error',
      reply: "I'm having a brief connection hitch, but our standard policies include free inter-city shifting after 6 months and a ₹10,000 damage waiver on all active rentals!",
      suggestedChips: ["🛡️ Damage Waiver Policy", "🚚 Free City Relocation", "💎 How Rent-to-Own Works"]
    });
  }
});

module.exports = router;
