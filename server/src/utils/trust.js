/**
 * Shared Trust Score & Rental History Profile Calculator
 *
 * Score breakdown (0-100):
 *  - Email Verified:         25 pts
 *  - Phone Verified:         25 pts
 *  - Government ID Verified: 20 pts
 *  - Completed Rentals:      up to 15 pts (3 pts per completed rental)
 *  - Peer Reviews / Rating:  up to 15 pts (scaled from avg rating 0-5)
 */

async function getUserTrustProfile(db, userId) {
  if (!userId) return null;

  const user = await db.collection('users').findOne(
    { _id: userId },
    { projection: { password: 0 } }
  );
  if (!user) return null;

  const kycRecord = await db.collection('kyc').findOne({ user_id: userId });

  const emailVerified = Boolean(user.email_verified);
  const phoneVerified = Boolean(user.phone_verified || (user.phone_num && String(user.phone_num).replace(/\D/g, '').length >= 10 && user.phone_verified !== false));
  const govIdVerified = Boolean(user.kyc_verified || kycRecord?.status === 'approved');

  // Rental history stats
  const userRentals = await db.collection('rentals').find({ user_id: userId }).toArray();
  const completedRentals = userRentals.filter(r => ['returned', 'completed', 'OWNED'].includes(r.status)).length;
  const activeRentals = userRentals.filter(r => r.status === 'active').length;

  // Reviews / ratings
  const feedbacks = await db.collection('feedback').find({ user_id: userId }).toArray();
  const reviewCount = feedbacks.length;
  const avgRating = reviewCount > 0
    ? Number((feedbacks.reduce((acc, f) => acc + (Number(f.rating) || 5), 0) / reviewCount).toFixed(1))
    : (completedRentals > 0 ? 4.8 : 0);

  let trustScore = 0;
  if (emailVerified) trustScore += 25;
  if (phoneVerified) trustScore += 25;
  if (govIdVerified) trustScore += 20;
  trustScore += Math.min(15, completedRentals * 3);
  if (reviewCount > 0) {
    trustScore += Math.round((avgRating / 5) * 15);
  } else if (completedRentals > 0) {
    trustScore += 12;
  }
  trustScore = Math.min(100, Math.max(0, trustScore));

  const verifiedCount = [emailVerified, phoneVerified, govIdVerified].filter(Boolean).length;
  const verificationStatus = govIdVerified && emailVerified && phoneVerified
    ? 'Verified'
    : (verifiedCount > 0 ? 'Partially Verified' : 'Unverified');

  const joinedDate = user.created_at ? new Date(user.created_at) : new Date();
  const joinedLabel = joinedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return {
    user_id: String(user._id),
    username: user.username,
    joined_at: joinedLabel,
    trust_score: trustScore,
    verification_status: verificationStatus,
    verifications: {
      email_verified: emailVerified,
      phone_verified: phoneVerified,
      gov_id_verified: govIdVerified
    },
    stats: {
      rentals_completed: completedRentals,
      active_rentals: activeRentals,
      total_rentals: userRentals.length,
      avg_rating: avgRating,
      review_count: reviewCount
    }
  };
}

module.exports = {
  getUserTrustProfile
};
