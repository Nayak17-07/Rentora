const assert = require('assert');
const { computeDepreciationFairSchedule } = require('../server/src/utils/fairness');
const { assignVariant } = require('../server/src/utils/experimentAssignment');
const { sanitizeNoSql } = require('../server/src/utils/sanitize');

// 1. Depreciation-Aware Fairness tests
const gradeAPlus = computeDepreciationFairSchedule({
  baseMonthlyPrice: 1000,
  conditionGrade: 'GRADE_A_PLUS',
  manufactureYear: 2026,
  currentYear: 2026,
  procurementCost: 20000,
  rentalRevenueGenerated: 10000
});
assert.strictEqual(gradeAPlus.fair_monthly_rent, 1000);
assert.strictEqual(gradeAPlus.fair_security_deposit, 1500);
assert.strictEqual(gradeAPlus.owner_roi_pct, 50);

const gradeBOld = computeDepreciationFairSchedule({
  baseMonthlyPrice: 1000,
  conditionGrade: 'GRADE_B',
  manufactureYear: 2022,
  currentYear: 2026,
  procurementCost: 20000,
  rentalRevenueGenerated: 24000
});
assert.ok(gradeBOld.fair_monthly_rent < gradeAPlus.fair_monthly_rent, 'Aged Grade-B unit should have lower fair rent');
assert.strictEqual(gradeBOld.combined_factor, 0.68);
assert.strictEqual(gradeBOld.fair_monthly_rent, 680);
assert.strictEqual(gradeBOld.owner_roi_pct, 120);

// 2. Experiment Assignment determinism tests
const v1 = assignVariant('exp_deposit_waiver', 'Bangalore');
const v2 = assignVariant('exp_deposit_waiver', 'Bangalore');
assert.strictEqual(v1, v2, 'City-cluster assignment must be deterministic');
assert.ok(['control', 'treatment'].includes(v1));

// 3. NoSQL injection sanitizer tests
const dirty = {
  city: { $ne: 'Bangalore' },
  nested: [{ $gt: 0, ok: 'yes' }, { 'a.b': 1, safe: 2 }],
  search: 'fridge'
};
const clean = sanitizeNoSql(dirty);
assert.deepStrictEqual(clean.city, {});
assert.deepStrictEqual(clean.nested, [{ ok: 'yes' }, { safe: 2 }]);
assert.strictEqual(clean.search, 'fridge');

console.log('test_server_research_endpoints.js: ALL PASSED');
