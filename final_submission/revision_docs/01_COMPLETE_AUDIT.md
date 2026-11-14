# Complete Technical and Academic Audit Report: Rentora Research Manuscript

**Target Manuscript:** `yogita3.pdf` / `Rentora_Final_Paper_With_Graphs.docx`  
**Authors:** Dr. Patil Yogita Dattatraya (Mentor), Mukesh Naik, Abhinav Reddy Muthireddy, Kolloju Raghava, Md Rehal, Siddartha  
**Affiliation:** Department of Computer Science and Engineering (AI & ML), Keshav Memorial Institute of Technology (KMIT), Hyderabad, India  
**Turnitin AI Indicator:** 61% detected as AI writing (`trn:oid:::1:3709115585`)  
**Repository:** `https://github.com/Nayak17-07/Rentora`  
**Starting Commit Hash:** `e8041dcd2a4ea89cb35a92061b3e0fbda6cc9862`  
**Revision Branch:** `research-paper/revision-2026`  
**Date of Audit:** November 14, 2026  

---

## 1. Executive Summary

This audit is conducted in accordance with the **Rentora Research Paper Execution Workflow**, strictly adhering to three research integrity rules:
1. **Rule 1 (No editing before audit):** No code or manuscript content has been modified.
2. **Rule 2 (No self-certification):** An independent multi-agent verification pass is mandated before final acceptance.
3. **Rule 3 (No chasing the 61% Turnitin indicator):** The objective is authentic research engineering, factual alignment, and technical defensibility, not detector evasion.

---

## 2. Repository and Implementation Audit

Every capability claimed in the manuscript has been inspected against the actual implementation in `c:\Users\naik1\Desktop\Rentora`:

| Claimed Feature | Actual Code Implementation | Evidence Location | Verification Status |
| :--- | :--- | :--- | :--- |
| **Full-Stack SPA & Portals** | React 19 single-page application built with Vite, Tailwind CSS, and Lucide icons. Includes dedicated customer portal, peer owner portal, and administrative dashboard. | `frontend/src/App.jsx`, `frontend/src/pages/AdminDashboard.jsx`, `frontend/src/pages/OwnerDashboard.jsx` | **VERIFIED** |
| **API Gateway & RBAC** | Node.js Express service with 15 decoupled REST routes. JWT authentication with role-based route guards (`customer`, `owner`, `admin`). | `server/src/index.js`, `server/src/auth.js`, `server/src/routes/` | **VERIFIED** |
| **Database Concurrency & Inventory** | MongoDB system of record. Multi-city catalog with atomic conditional inventory decrement (`$inc: { stock: -qty }`, `stock >= qty`) and restoration on cancellation. | `server/src/routes/checkout.js`, `server/src/routes/rentals.js` | **VERIFIED** |
| **Client-Side Document OCR** | In-browser OCR using WebAssembly Tesseract.js extracting Aadhaar numerals from uploaded ID images, validated against UIDAI Verhoeff polynomial checksum. | `frontend/src/utils/documentOcr.js`, `server/src/routes/kyc.js` | **PARTIAL** (In-browser OCR is verified; government backend lookup is simulated in sandbox) |
| **Escrow Deposit Ledger & Damage Waiver** | Software-managed refundable deposit reserve ledger with simulated release upon item return inspection. Optional Rentora Care Damage Waiver (₹149/mo) capping liability at ₹10,000. | `server/src/routes/checkout.js`, `server/src/routes/rentals.js`, `frontend/src/components/DigitalLeaseAgreementModal.jsx` | **PARTIAL** (Software ledger verified; banking escrow is a prototype simulation) |
| **Live Delivery Tracking** | Full-duplex WebSocket event streaming via Socket.io broadcasting payment confirmation, stock allocation, and dispatch progress. | `server/src/index.js`, `frontend/src/pages/DeliveryTrackerPage.jsx` | **VERIFIED** |
| **Concierge Assistant** | Deterministic rule-based policy chatbot answering rental, deposit, waiver, and rent-to-own queries from fixed JSON knowledge bases. | `server/src/routes/concierge.js`, `frontend/src/components/RentoraConcierge.jsx` | **VERIFIED** (Accurately documented as non-generative) |
| **Decoupled Python ML Tier** | Standalone Python batch jobs reading MongoDB collections via native drivers, serializing artifacts (`joblib`), and refreshing derived scoring collections. | `ml_pipeline/train_model.py`, `ml_pipeline/etl_pipeline.py`, `ml_pipeline/evaluate_models.py` | **VERIFIED** |
| **TF-IDF & Cosine Content Recommender** | Sublinear TF-IDF vectorizer (2,500 features, 1-2 ngrams) on catalog text with 3× category and 2× sub-category domain boosting. Cosine similarity kernel. | `ml_pipeline/train_model.py` (lines 98–110) | **VERIFIED** |
| **Collaborative Co-Rental & Synergy Bootstrap** | Item-to-item co-rental association matrix normalized by geometric mean: $n_{ij} / \sqrt{n_i n_j}$. Hardcoded room synergy map (`COMPLEMENTARY_MAP`) bootstrapping companion pairs ($s \ge 0.22$). | `ml_pipeline/train_model.py` (lines 42–72, 195–215) | **VERIFIED** (Rule-bootstrapped; real collaborative telemetry not yet collected) |
| **Bayesian Rating Shrinkage** | Rating smoothing: $(v \cdot r + 12 \times 4.30) / (v + 12)$ preventing low-review items from dominating. | `ml_pipeline/train_model.py` (lines 205–215) | **VERIFIED** |
| **Gaussian Price Affinity & Eco Bonus** | Bell-shaped budget affinity $\exp(-0.5 ((p - \mu)/\sigma)^2)$ and tiered eco bonus ($+0.15$ for $\ge 4\star$, $+0.05$ otherwise). | `ml_pipeline/train_model.py` (lines 216–225) | **VERIFIED** |
| **Churn Risk Batch ETL & Prediction** | Reads user rentals, payments, carts, and feedback from MongoDB; builds 15-feature behavioral vector; executes tree inference; writes `user_churn_scores`. | `ml_pipeline/etl_pipeline.py` (lines 45–190) | **VERIFIED** |

---

## 3. Churn Model Investigation & Critical Issues

### 3.1 Critical Issue A: LightGBM vs. HistGradientBoosting Identity
- **Finding in Manuscript (`yogita3.pdf` Page 7):**
  The manuscript contains an implementation footnote:
  > *"Implementation note. The LightGBM figures above were produced with scikit-learn’s histogram-based gradient boosting configured with the same tree depth, learning rate, number of trees and class weight, because the LightGBM package could not be installed in the environment used to prepare this manuscript."*
- **Investigation in Environment:**
  - We audited the Python environment in `Rentora\venv`: `lightgbm 4.7.0` **is installed and operational**.
  - We executed an empirical benchmark comparing **Random Forest**, **Genuine LightGBM (`lightgbm.LGBMClassifier`)**, and **scikit-learn `HistGradientBoostingClassifier`** on the identical 80/20 stratified split (`random_state=42`):
    - **Random Forest:** Accuracy: 0.852, Precision: 0.741, Recall: 0.415, F1: 0.532, ROC-AUC: 0.819, PR-AUC: 0.643.
    - **Genuine LightGBM:** Accuracy: 0.860, Precision: 0.727, Recall: 0.496, F1: 0.590, ROC-AUC: 0.833, PR-AUC: 0.666.
    - **HistGradientBoosting:** Accuracy: 0.854, Precision: 0.739, Recall: 0.437, F1: 0.549, ROC-AUC: 0.831, PR-AUC: 0.666.
- **Resolution:**
  - The manuscript's Table IV numbers in `Rentora_Final_Paper_With_Graphs.docx` ($0.860, 0.727, 0.496, 0.590, 0.833, 0.666$) correspond to **Genuine LightGBM**.
  - In `yogita3.pdf`, the authors had substituted HistGradientBoosting figures ($0.855, 0.703, 0.494, 0.580, 0.831, 0.664$) because LightGBM was missing in their draft environment.
  - **Action for Revision:** Eliminate the awkward HistGradientBoosting compromise. With genuine LightGBM 4.7.0 installed, report the verified, genuine LightGBM metrics and retire the implementation footnote.

### 3.2 Critical Issue B: Nature of the Churn Dataset (Proxy vs. Empirical)
- **Source Dataset:** Public Bank Customer Churn dataset (10,000 customers, 20.37% churn rate).
- **Mapping Protocol (`ml_pipeline/evaluate_models.py`):**
  - All 15 rental features are deterministic mathematical projections from bank columns:
    - `tenure_months` $\leftarrow \text{Tenure} \times 12 + (\text{Age} \bmod 12)$
    - `monthly_spend` $\leftarrow (\text{EstimatedSalary} / 40.0) + (\text{Balance} > 0) \times 350.0$
    - `active_rentals` $\leftarrow \text{NumOfProducts} \in [1, 5]$
    - `late_payments` $\leftarrow ((850 - \text{CreditScore})/85) + (1 - \text{IsActiveMember}) \times 1.5 + (\text{Balance} == 0) \times 0.5$
    - `early_returns` $\leftarrow (1 - \text{IsActiveMember}) \times (\text{Tenure} \le 2) + (\text{CreditScore} < 520)$
    - `cart_abandonment` $\leftarrow (1 - \text{IsActiveMember}) \times 2 + (\text{NumOfProducts} == 1) \times 2$
    - `days_inactive` $\leftarrow (1 - \text{IsActiveMember}) \times 35.0 + (10 - \text{Tenure}) \times 2.0$
    - `avg_rating` $\leftarrow \text{IsActiveMember} \times 0.8 + (\text{CreditScore} / 250.0) + 1.2$
    - Ratios: `spend_per_rental`, `delinquency_rate`, `inactivity_rate`, `engagement_score`.
- **Integrity Implication:**
  - This is an **engineered proxy dataset**. It validates algorithmic convergence, training latency, memory efficiency, and ETL pipeline mechanics.
  - It does **not** represent verified behavioral histories of home appliance renters.
  - The manuscript must maintain absolute transparency regarding this proxy status in the Abstract, Introduction, Section V, Discussion, and Conclusion.

### 3.3 Critical Issue C: Deployed Risk Scores vs. Calibrated Probabilities
- **Code Inspection (`ml_pipeline/etl_pipeline.py` lines 152–165):**
  ```python
  raw_prob = float(model.predict_proba(X_user)[0, 1])
  risk_multiplier = 1.85
  if cart_abandonment > 0 and active_rentals == 0:
      risk_multiplier += 0.35
  if late_payments > 0:
      risk_multiplier += 0.40
  calibrated_prob = round(float(np.clip(raw_prob * risk_multiplier, 0.05, 0.95)), 4)
  ```
- **Audit Finding:**
  - The variable is labeled `calibrated_prob`, but mathematically it is an **uncalibrated heuristic risk index** scaled up to artificially flag at-risk accounts for customer support.
  - In addition, live scoring imputes `customer_age = 32` and estimates `credit_score = 650 - (late_payments * 45)`.
  - **Action for Revision:** Correct all references to deployed scores: explicitly define them as *operational heuristic risk indices*, not calibrated probabilities.

---

## 4. Explainable AI (SHAP) Investigation

- **Algorithm & Method:**
  - Manuscript page 6 describes permutation sampling (60 orderings over 40 background customers) for paper figures, and TreeSHAP in the live pipeline.
  - In `etl_pipeline.py`, `shap.TreeExplainer(model)` is called when SHAP is available.
- **Dominance of Inherited Features:**
  - TreeSHAP feature attributions place `customer_age` (mean $|SHAP| \approx 0.125 - 0.80$) and `active_rentals` (mean $|SHAP| \approx 0.058 - 0.63$) as the top predictors.
  - *Root Cause:* In the banking dataset, Age and NumOfProducts carry the strongest churn variance. The deterministic mapping copies these fields across.
  - *Academic Framing:* The revised paper must explicitly state that the top SHAP drivers reflect the source dataset structure rather than an empirical behavioral truth about appliance leasing.

---

## 5. Recommendation System Investigation

- **Intra-Catalog Evaluation vs. Live User Acceptance:**
  - Table VI reports Precision@5 ($0.600$), Hit Rate@5 ($0.972$), Recall@5 ($0.667$), and Catalogue Coverage ($0.975$) across 162 items in 41 sub-categories.
  - *Methodological Finding:* This evaluation measures **textual coherence and semantic grouping** (whether TF-IDF retrieves items of the same sub-category when category labels are excluded).
  - *Boundary:* It does **not** evaluate user click-through rate (CTR), conversion, or real-world collaborative filtering performance.
  - *Action for Revision:* Explicitly partition the recommender evaluation into:
    1. *Catalog Semantic Coherence (Empirically Evaluated).*
    2. *Collaborative Co-Rental & Room Bundling (Bootstrapped Heuristic).*
    3. *Live User Satisfaction & Business Impact (Unvalidated, Future Work).*

---

## 6. Academic and Reference Audit

| Ref # | Cited Publication | Verification Status & Findings |
| :--- | :--- | :--- |
| **[1]** | Koide et al. (Renew. Sustain. Energy Rev., 2022) | **VERIFIED.** DOI: 10.1016/j.rser.2021.111858. Genuine meta-analysis on consumer PSS. |
| **[2]** | Sigüenza et al. (Sustain. Prod. Consum., 2021) | **VERIFIED.** Vol. 26, pp. 1084–1098. Washing machine circular business models. |
| **[3]** | “Just Rent It”: an online appliance rental framework | **UNRESOLVED PLACEHOLDER.** Manuscript contains `[venue and year to be confirmed]`. Must be formalized or reframed as an institutional baseline report. |
| **[4]** | Satapathy et al. (Procedia Comput. Sci., 2020) | **VERIFIED.** Vol. 171, pp. 2480–2489. Recommendation system in rental portal. |
| **[5]** | Suh (J. Big Data, 2023) | **VERIFIED.** DOI: 10.1186/s40537-023-00721-8. Genuine ML churn study in appliance rental. |
| **[6]** | Ke et al. (NeurIPS, 2017) | **VERIFIED.** Seminal LightGBM publication. |
| **[7]** | Breiman (Mach. Learn., 2001) | **VERIFIED.** Seminal Random Forests paper. |
| **[8]** | Lundberg & Lee (NeurIPS, 2017) | **VERIFIED.** Seminal SHAP publication. |
| **[9]** | Lundberg et al. (Nat. Mach. Intell., 2020) | **VERIFIED.** TreeSHAP publication. |
| **[10]** | Koren et al. (Computer, 2009) | **VERIFIED.** Matrix factorization in recommenders. |
| **[11]** | Salton & Buckley (Inf. Process. Manag., 1988) | **VERIFIED.** Classic TF-IDF paper. |
| **[12]** | Shapley (1953) | **VERIFIED.** Game theory cooperative values. |
| **[13]** | Saito & Rehmsmeier (PLoS ONE, 2015) | **VERIFIED.** Precision-Recall curves on imbalanced data. |
| **[14]** | Sarwar et al. (WWW, 2001) | **VERIFIED.** Item-based collaborative filtering. |
| **[15]** | YBI Foundation Bank Churn Dataset (2026) | **VERIFIED.** Public repository source. |
| **[16]** | Smith (ICDAR, 2007) | **VERIFIED.** Tesseract OCR engine architecture. |

- **Cover Page Metadata Anomaly in `yogita3.pdf`:**
  - Cover page lists: Author: "Ashalathar Ramegowda", Institution: "Central University of Karnataka", Assignment: "MSW Dissertation 2025".
  - Manuscript page 3 lists: Authors: "Dr. Patil Yogita Dattatraya, Mukesh Naik, Abhinav Reddy Muthireddy, Kolloju Raghava, Md Rehal, Siddartha" from "Keshav Memorial Institute of Technology (KMIT)".
  - *Diagnosis:* The Turnitin scan was submitted through an external student LMS account. The true authors and institution on page 3 are authoritative.

---

## 7. Missing Artifacts & Reproducibility Gaps

1. **Missing `run_experiments.py`:**
   - The manuscript cites `run_experiments.py` against commit `7515c32`.
   - *Reality:* No file named `run_experiments.py` exists in the repository. The active script is `ml_pipeline/evaluate_models.py`.
   - *Requirement:* Create a standalone, deterministic `run_experiments.py` at the repo root that reproduces all figures (2–5) and tables (IV, V, VI) with `--seed 42`.
2. **Missing Standalone Table VI Evaluator:**
   - The catalog coherence evaluation logic must be formalized into `run_experiments.py` so that any evaluator can re-run and verify the P@5, Hit@5, and coverage metrics.

