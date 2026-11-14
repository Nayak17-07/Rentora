# Feature Engineering Verification & Empirical Bounds Report

**Target Dataset:** `ml_pipeline/rental_churn_dataset.csv` (10,000 instances, 17 columns)  
**Source Dataset:** Bank Customer Churn Modelling Benchmark (10,000 customers)  
**Script Location:** `ml_pipeline/evaluate_models.py` (lines 40–80)  
**Date of Audit:** November 14, 2026  
**Auditor:** Antigravity Research Engineering Suite  

---

## 1. Executive Summary

This audit conducted an exhaustive mathematical and empirical inspection of every feature transformation rule mapping the 10,000-record Bank Customer Churn dataset into the 15 rental-domain operational features.

### Critical Audit Findings
1. **Mathematical Impossibilities in Initial Draft Bounds:**
   - `early_returns` was previously documented as range `0–3`. In reality, the formula sums two binary indicators $\in \{0, 1\}$. The maximum possible value is strictly **2**. The empirical range is $[0, 2]$.
   - `cart_abandonment` was documented as range `0–8`. The formula sums two scaled binary indicators taking values in $\{0, 2\}$. The empirical values are strictly $\{0, 2, 4\}$. It can **never** reach 8.
   - `days_inactive` was documented as range `0–90`. The formula is $(1 - \text{IsActiveMember}) \times 35 + (10 - \text{Tenure}) \times 2$. Because $\text{Tenure} \ge 0$, the maximum possible value is $35 + 20 = \mathbf{55.0}$. It never reaches 90.
   - `avg_rating` was documented as range `1–5`. The lowest credit score (350) yields $(350/250) + 1.2 = \mathbf{2.60}$. The empirical range is $[2.60, 5.00]$.
   - `active_rentals` was documented as range `1–5` (due to `.clip(1, 5)`), but the source dataset `NumOfProducts` only contains values in $\{1, 2, 3, 4\}$. The empirical range is $[1, 4]$.
2. **Missing-Value Handling & Data Types:**
   - Zero missing values exist across all 10,000 instances.
   - All 15 features have verified types (`int64` or `float64`).
3. **Proxy Status:**
   - All 15 features are deterministic mathematical projections from banking fields. None represent observed appliance rental telemetry.

---

## 2. Complete Field-by-Field Verification Registry

| Feature Name | Storage Dtype | Derivation Code Formula in `evaluate_models.py` | Stated Stated Range | True Empirical Min | True Empirical Max | Empirical Mean | Empirical Std Dev | Unique Values | Operational Reality & Proxy Nature |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **tenure_months** | `int64` | `(raw['Tenure'] * 12 + (raw['Age'] % 12)).clip(1, 120)` | 1–120 | 1 | 120 | 65.370 | 34.451 | 120 | Synthetic duration derived from bank tenure and age modulo. |
| **monthly_spend** | `float64` | `((raw['Estimated Salary'] / 40.0) + (raw['Balance'] > 0).astype(int) * 350.0).round(2)` | Unbounded | ₹2.25 | ₹5,349.27 | ₹2,725.66 | ₹1,449.98 | 9,895 | Scaled bank salary plus positive balance stipend; not actual billing ledger. |
| **active_rentals** | `int64` | `raw['Num Of Products'].clip(1, 5)` | 1–5 | 1 | 4 | 1.530 | 0.582 | 4 | Copied from bank product count. Max is 4 in source corpus. |
| **credit_score** | `int64` | `raw['CreditScore']` | 350–850 | 350 | 850 | 650.529 | 96.653 | 460 | Copied directly from bank credit score. |
| **customer_age** | `int64` | `raw['Age']` | 18–92 | 18 | 92 | 38.922 | 10.488 | 70 | Copied directly from bank customer age. |
| **is_active_member** | `int64` | `raw['Is Active Member']` | 0–1 | 0 | 1 | 0.515 | 0.500 | 2 | Copied directly from bank active member status flag. |
| **late_payments** | `int64` | `(((850 - raw['CreditScore']) / 85.0) + (1 - raw['Is Active Member']) * 1.5 + (raw['Balance'] == 0).astype(int) * 0.5).clip(0, 5).round().astype(int)` | 0–5 | 0 | 5 | 3.192 | 1.310 | 6 | Heuristic delinquency index inverted from credit score and inactivity. |
| **early_returns** | `int64` | `((1 - raw['Is Active Member']) * (raw['Tenure'] <= 2).astype(int) + (raw['CreditScore'] < 520).astype(int)).clip(0, 3)` | **0–2** (was 0–3) | 0 | 2 | 0.210 | 0.431 | 3 | Sum of two binary flags. Mathematically cannot exceed 2. |
| **cart_abandonment** | `int64` | `((1 - raw['Is Active Member']) * 2 + (raw['Num Of Products'] == 1).astype(int) * 2).clip(0, 8)` | **{0, 2, 4}** (was 0–8) | 0 | 4 | 1.987 | 1.430 | 3 | Discrete values {0, 2, 4} based on inactivity and single-product holding. |
| **days_inactive** | `float64` | `((1 - raw['Is Active Member']) * 35.0 + (10 - raw['Tenure']).clip(0, 10) * 2.0).clip(0, 90).round(1)` | **0–55.0** (was 0–90) | 0.0 | 55.0 | 26.946 | 18.268 | 22 | Heuristic dormancy index. Max is 35 + 20 = 55.0 days. |
| **avg_rating** | `float64` | `(raw['Is Active Member'] * 0.8 + (raw['CreditScore'] / 250.0) + 1.2).clip(1.0, 5.0).round(2)` | **2.60–5.00** (was 1–5) | 2.60 | 5.00 | 4.199 | 0.537 | 229 | Minimum possible value is (350/250) + 1.2 = 2.60. |
| **spend_per_rental** | `float64` | `np.round(monthly_spend / (active_rentals + 0.1), 2)` | Unbounded | ₹1.07 | ₹4,862.97 | ₹1,893.06 | ₹1,231.13 | 9,877 | Ratio of monthly spend to active rentals. |
| **delinquency_rate** | `float64` | `np.round(late_payments / (active_rentals + 1.0), 4)` | 0–2.50 | 0.0000 | 2.5000 | 1.3210 | 0.6150 | 17 | Ratio of late payments to active rentals plus 1. |
| **inactivity_rate** | `float64` | `np.round(days_inactive / (tenure_months * 30.0 + 1.0), 4)` | 0–1.77 | 0.0000 | 1.7742 | 0.0370 | 0.1240 | 190 | Ratio of inactive days to total tenure days. |
| **engagement_score** | `float64` | `np.round(avg_rating * (1.0 - (days_inactive / 90.0).clip(0, 1)), 3)` | 1.011–5.000 | 1.011 | 5.000 | 3.017 | 1.143 | 1,830 | Interaction term attenuating rating by relative dormancy. |
| **churn** (Target) | `int64` | `raw['Churn'].astype(int)` | {0, 1} | 0 | 1 | 0.2037 | 0.4028 | 2 | Ground truth label from source corpus (20.37% positive rate). |

---

## 3. Manuscript Corrective Actions

1. **Table III Bounds Update:** Table III in the manuscript will be updated to display the exact empirical bounds (`[18, 92]` for age, `[1, 4]` for rentals, `[0, 2]` for early returns, `{0, 2, 4}` for cart abandonment, `[0.0, 55.0]` for days inactive, and `[2.60, 5.00]` for rating).
2. **Proxy Nomenclature:** Add an explicit column in Table III clarifying that these features are mathematical proxies for operational evaluation, not empirical customer sensor/appliance logs.
