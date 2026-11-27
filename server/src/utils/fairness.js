/**
 * Depreciation-Aware Fairness Calculator (Initiative 10)
 * Adjusts monthly rent and security deposit for appliance condition grade & age
 * while tracking owner ROI parity.
 */

const GRADE_FACTORS = {
  GRADE_A_PLUS: 1.0,
  GRADE_A: 0.9,
  GRADE_B: 0.78
};

function computeDepreciationFairSchedule({
  baseMonthlyPrice,
  conditionGrade = 'GRADE_A',
  manufactureYear = new Date().getFullYear(),
  procurementCost = 0,
  rentalRevenueGenerated = 0,
  currentYear = new Date().getFullYear()
}) {
  const baseRent = Math.max(0, Number(baseMonthlyPrice) || 0);
  const gradeFactor = GRADE_FACTORS[conditionGrade] || 0.9;
  const ageYears = Math.max(0, currentYear - (Number(manufactureYear) || currentYear));
  const ageFactor = Math.max(0.65, Math.round((1 - 0.08 * ageYears) * 1000) / 1000);
  const combinedFactor = Math.round(Math.min(gradeFactor, ageFactor) * 1000) / 1000;

  const fairMonthlyRent = Math.round(baseRent * combinedFactor);
  const fairSecurityDeposit = Math.round(fairMonthlyRent * 1.5);
  const cost = Math.max(0, Number(procurementCost) || 0);
  const rev = Math.max(0, Number(rentalRevenueGenerated) || 0);
  const roiPct = cost > 0 ? Math.round((rev / cost) * 100) : 0;

  return {
    base_monthly_price: baseRent,
    condition_grade: conditionGrade,
    age_years: ageYears,
    grade_factor: gradeFactor,
    age_factor: ageFactor,
    combined_factor: combinedFactor,
    fair_monthly_rent: fairMonthlyRent,
    fair_security_deposit: fairSecurityDeposit,
    owner_roi_pct: roiPct
  };
}

module.exports = {
  GRADE_FACTORS,
  computeDepreciationFairSchedule
};
