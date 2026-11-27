# Rentora: Research & Development Sub-Work Plan

This plan divides the 12-item Rentora R&D roadmap into concrete engineering and data sub-tasks grounded in the actual repository (`data/`, `server/`, `ml_pipeline/`, `frontend/`).

---

## Phase 1: Real Repo Audit & Consistency Fixes (Current)
- [x] **1.1 Repository & Data Audit** (`research/data_audit.py`)
  - Audited all 6 CSVs and 4 `.joblib` baselines; identified data provenance and gaps.
- [x] **1.2 Fix Catalog & Contract Inconsistencies (Sub-task 1A)**
  - [x] Align or remove the 2 test SKUs (`test_app_c639f8`, `test_app_2b755d`) in `data/appliances_catalog.csv` with the `1.5x` deposit rule (`1348` instead of `1500`).
  - [x] Explicitly enforce/record the ₹10,000 Rentora Shield waiver limit in `server/src/routes/rentals.js` return handling.
- [x] **1.3 CI Document Consistency Check (Sub-task 1B)**
  - [x] Added `research/document_verifier.py` and `tests/test_document_verifier.py`.
  - [x] Add `document_verifier.py` / `test_document_verifier.py` step to `.github/workflows/ci.yml`.

## Phase 2: Real Dataset Acquisition & Self-Generating Pipeline
- [x] **2.1 Configure Kaggle API locally** (`~/.kaggle/access_token`, ignored in `.gitignore`).
- [x] **2.2 Download & Integrate Datasets** (`ml_pipeline/kaggle_fetcher.py`, `ml_pipeline/dataset_builder.py`, `ml_pipeline/retrain_models.py`).

## Phase 3: Platform Logging & Schema Extensions (`server/`)
- [x] **3.1 Experiment Assignment & Exposure Logging (Item 1)** — log `user_id`, `city`, `experiment_id`, `variant`, and `stock_at_exposure` (`POST /api/experiments/exposure` in `server/src/routes/experiments.js`).
- [x] **3.2 Pricing & Deposit Intervention Logging (Items 2 & 10)** — log offered price, deposit, and waivers at checkout (`pricing_intervention_logs` in `server/src/routes/checkout.js`).
- [x] **3.3 Serialized Unit Telemetry & Refurbishment Logging (Items 4 & 9)** — log timestamped health/inspection snapshots across rental cycles in `server/src/routes/inventory.js` (`inspection_history`).
- [x] **3.4 Human-Review Audit Queue API (Item 8)** — add `/api/admin/audit-queue` in `server/src/routes/admin.js` (triage + evidence checklist only, no automated verdicts).
