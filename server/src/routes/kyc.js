const express = require('express');
const { getDb } = require('../db');
const { authenticateJWT } = require('../auth');
const { saveBase64File } = require('../storage');

const router = express.Router();

function saveBase64Image(dataString, prefix, userId) {
  if (!dataString) return '';
  try {
    return saveBase64File({
      base64Data: dataString,
      subfolder: 'kyc',
      prefix,
      userId,
      maxBytes: 5 * 1024 * 1024
    });
  } catch (e) {
    console.error('Image save error:', e.message);
    return '';
  }
}

// GET /api/kyc/ — fetch current user's KYC status
router.get('/kyc/', authenticateJWT, async (req, res) => {
  try {
    const db = getDb();
    const kyc = await db.collection('kyc').findOne({ user_id: req.user.id });
    if (!kyc) return res.status(200).json({ status: 'pending' });
    return res.status(200).json({
      status: kyc.status,
      full_name: kyc.full_name || '',
      id_type: kyc.id_type || 'Aadhaar Card',
      id_proof_preview: kyc.id_proof_preview || '',
      address_proof_preview: kyc.address_proof_preview || '',
      kyc_mode: kyc.kyc_mode || 'manual_review',
      verification_type: kyc.verification_type || 'MANUAL_ADMIN_REVIEW',
      submitted_at: kyc.submitted_at,
      reviewed_at: kyc.reviewed_at,
      rejection_reason: kyc.rejection_reason || null
    });
  } catch (err) {
    console.error('Fetch KYC error:', err);
    return res.status(500).json({ error: 'Server error fetching KYC status.' });
  }
});

// POST /api/kyc/manual-upload — Upload Government ID + Selfie for Manual Admin Review
router.post('/kyc/manual-upload', authenticateJWT, async (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { full_name, id_type, id_proof_base64, selfie_base64 } = req.body;

    const cleanName = String(full_name || '').trim();
    const allowedTypes = ['Aadhaar Card', 'Driving License', 'Passport'];
    const cleanType = allowedTypes.includes(id_type) ? id_type : 'Driving License';

    if (cleanName.length < 2) {
      return res.status(400).json({ error: 'Please enter your full name as shown on your ID.' });
    }
    if (!id_proof_base64 || !selfie_base64) {
      return res.status(400).json({ error: 'Please upload both your Government ID photo and a Selfie.' });
    }

    const idPreviewUrl = saveBase64Image(id_proof_base64, 'manual_id', userId) || id_proof_base64;
    const selfiePreviewUrl = saveBase64Image(selfie_base64, 'selfie', userId) || selfie_base64;
    const now = new Date();

    await db.collection('kyc').updateOne(
      { user_id: userId },
      {
        $set: {
          user_id: userId,
          full_name: cleanName,
          id_type: cleanType,
          id_proof_name: `${cleanType.replace(/\s+/g, '_')}.jpg`,
          id_proof_preview: idPreviewUrl,
          address_proof_name: 'Selfie_With_ID.jpg',
          address_proof_preview: selfiePreviewUrl,
          kyc_mode: 'manual_review',
          verification_type: 'MANUAL_ADMIN_REVIEW',
          status: 'in_review',
          submitted_at: now,
          rejection_reason: null
        }
      },
      { upsert: true }
    );

    await db.collection('users').updateOne(
      { _id: userId },
      { $set: { kyc_status: 'in_review', kyc_verified: false, updated_at: now } }
    );

    return res.status(200).json({
      success: 'ID uploaded successfully! An administrator will review and approve your verification shortly.',
      status: 'in_review',
      id_type: cleanType,
      full_name: cleanName,
      submitted_at: now.toISOString()
    });
  } catch (err) {
    console.error('Manual KYC upload error:', err);
    return res.status(500).json({ error: 'Failed to upload Government ID for review' });
  }
});

module.exports = router;
