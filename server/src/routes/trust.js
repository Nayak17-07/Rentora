const express = require('express');
const { getDb } = require('../db');
const { authenticateJWT } = require('../auth');
const { getUserTrustProfile } = require('../utils/trust');

const router = express.Router();

// GET /api/trust/profile/ — Current authenticated user's Trust Score & Verifications
router.get('/trust/profile/', authenticateJWT, async (req, res) => {
  try {
    const db = getDb();
    const profile = await getUserTrustProfile(db, req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json(profile);
  } catch (err) {
    console.error('Trust profile error:', err);
    return res.status(500).json({ error: 'Failed to load trust profile' });
  }
});

// GET /api/trust/profile/:user_id — Public/Owner view of a renter's Trust Profile & Rental History
router.get('/trust/profile/:user_id', authenticateJWT, async (req, res) => {
  try {
    const db = getDb();
    const profile = await getUserTrustProfile(db, req.params.user_id);
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json(profile);
  } catch (err) {
    console.error('Fetch user trust profile error:', err);
    return res.status(500).json({ error: 'Failed to load user trust profile' });
  }
});

// POST /api/trust/verify-phone/ — Verify user's 10-digit mobile number
router.post('/trust/verify-phone/', authenticateJWT, async (req, res) => {
  try {
    const { phone_num } = req.body;
    const digits = String(phone_num || '').replace(/\D/g, '');
    if (digits.length !== 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    }

    const db = getDb();
    await db.collection('users').updateOne(
      { _id: req.user.id },
      {
        $set: {
          phone_num: digits,
          phone_verified: true,
          phone_verified_at: new Date(),
          updated_at: new Date()
        }
      }
    );

    const profile = await getUserTrustProfile(db, req.user.id);
    return res.status(200).json({
      success: 'Phone number verified successfully!',
      profile
    });
  } catch (err) {
    console.error('Verify phone error:', err);
    return res.status(500).json({ error: 'Failed to verify phone number' });
  }
});

module.exports = router;
