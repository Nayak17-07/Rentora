const crypto = require('crypto');

/**
 * Rentora Automated Late Fee & Overdue Rental Calculation Engine
 * Module 12: Evaluates active contracts, calculates daily overdue penalties,
 * updates rental billing status, and records immutable audit logs.
 */

const DEFAULT_LATE_FEE_PER_DAY = 50.0; // Rs. 50/day standard overdue penalty
const DEFAULT_GRACE_PERIOD_DAYS = 2;   // 2-day grace period before penalties accrue

/**
 * Scans active leases and calculates accumulated late fees
 * @param {import('mongodb').Db} db 
 * @param {Object} options
 * @param {Date|string} [options.asOfDate] - Simulated or target evaluation date (defaults to now)
 * @param {number} [options.graceDays] - Grace period in days (default: 2)
 * @param {number} [options.ratePerDay] - Late fee rate per day in INR (default: 50.0)
 */
async function calculateAndApplyLateFees(db, options = {}) {
  const asOf = options.asOfDate ? new Date(options.asOfDate) : new Date();
  const graceDays = options.graceDays !== undefined ? options.graceDays : DEFAULT_GRACE_PERIOD_DAYS;
  const ratePerDay = options.ratePerDay !== undefined ? options.ratePerDay : DEFAULT_LATE_FEE_PER_DAY;

  const activeRentals = await db.collection('rentals')
    .find({ status: 'active' })
    .toArray();

  let overdueCount = 0;
  let totalAssessedFees = 0;
  const auditEntries = [];
  const updatedRentals = [];

  for (const rental of activeRentals) {
    // Determine the due date: use next_billing_date, or fall back to rented_at + 30 days
    let dueDate = null;
    if (rental.next_billing_date) {
      dueDate = new Date(rental.next_billing_date);
    } else if (rental.rented_at) {
      dueDate = new Date(new Date(rental.rented_at).getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    if (!dueDate || isNaN(dueDate.getTime())) {
      continue;
    }

    const diffMs = asOf.getTime() - dueDate.getTime();
    if (diffMs > 0) {
      const rawDaysLate = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const chargeableDaysLate = Math.max(0, rawDaysLate - graceDays);

      if (chargeableDaysLate > 0) {
        const lateFee = Math.round(chargeableDaysLate * ratePerDay * 100) / 100;
        overdueCount++;
        totalAssessedFees += lateFee;

        // Update rental document in MongoDB
        await db.collection('rentals').updateOne(
          { _id: rental._id },
          {
            $set: {
              billing_status: 'OVERDUE',
              late_days: rawDaysLate,
              chargeable_late_days: chargeableDaysLate,
              accumulated_late_fee: lateFee,
              late_fee_rate_per_day: ratePerDay,
              last_late_fee_evaluated_at: asOf,
              grace_period_days: graceDays
            }
          }
        );

        const auditId = `LFA_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
        const auditLog = {
          _id: auditId,
          rental_id: rental._id,
          user_id: rental.user_id,
          rental_name: rental.rental_name,
          due_date: dueDate.toISOString(),
          evaluation_date: asOf.toISOString(),
          raw_days_late: rawDaysLate,
          chargeable_days_late: chargeableDaysLate,
          rate_per_day: ratePerDay,
          assessed_late_fee: lateFee,
          created_at: new Date()
        };

        auditEntries.push(auditLog);
        updatedRentals.push({
          rental_id: rental._id,
          user_id: rental.user_id,
          rental_name: rental.rental_name,
          due_date: dueDate.toISOString(),
          raw_days_late: rawDaysLate,
          chargeable_days_late: chargeableDaysLate,
          accumulated_late_fee: lateFee
        });
      }
    } else {
      // Contract is current (not overdue)
      if (rental.billing_status === 'OVERDUE') {
        await db.collection('rentals').updateOne(
          { _id: rental._id },
          {
            $set: {
              billing_status: 'CURRENT',
              late_days: 0,
              chargeable_late_days: 0,
              accumulated_late_fee: 0,
              last_late_fee_evaluated_at: asOf
            }
          }
        );
      }
    }
  }

  // Insert audit records if any overdue fees were assessed
  if (auditEntries.length > 0) {
    try {
      await db.collection('late_fee_audit_logs').insertMany(auditEntries);
    } catch (e) {
      console.warn('Late fee audit insert note:', e.message);
    }
  }

  return {
    scanned_rentals: activeRentals.length,
    overdue_rentals_count: overdueCount,
    total_late_fees_assessed: Math.round(totalAssessedFees * 100) / 100,
    evaluated_at: asOf.toISOString(),
    grace_period_days: graceDays,
    rate_per_day: ratePerDay,
    updated_rentals: updatedRentals
  };
}

let schedulerInterval = null;

/**
 * Initializes the automated 24-hour background cron scheduler
 * @param {import('mongodb').Db} db 
 */
function initLateFeeScheduler(db) {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  console.log('[LateFeeEngine] Initializing Automated Late Fee Background Worker (24h cadence)...');

  // Run initial pass after server startup (5s delay)
  setTimeout(async () => {
    try {
      const summary = await calculateAndApplyLateFees(db);
      console.log(`[LateFeeEngine] Startup scan complete: ${summary.overdue_rentals_count} overdue of ${summary.scanned_rentals} active leases (Total fees: Rs. ${summary.total_late_fees_assessed})`);
    } catch (err) {
      console.warn('[LateFeeEngine] Startup scan note:', err.message);
    }
  }, 5000);

  // Recurrent schedule: every 24 hours (86,400,000 ms)
  schedulerInterval = setInterval(async () => {
    try {
      const summary = await calculateAndApplyLateFees(db);
      console.log(`[LateFeeEngine] Scheduled 24h scan executed: ${summary.overdue_rentals_count} overdue leases found.`);
    } catch (err) {
      console.error('[LateFeeEngine] Scheduled run error:', err);
    }
  }, 24 * 60 * 60 * 1000);
}

module.exports = {
  calculateAndApplyLateFees,
  initLateFeeScheduler,
  DEFAULT_LATE_FEE_PER_DAY,
  DEFAULT_GRACE_PERIOD_DAYS
};

