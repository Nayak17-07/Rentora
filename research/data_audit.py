"""Repository Data Audit & Existing Baseline Model Evaluation (Items 11 & 12).

Audits all CSV datasets and saved ML models in the Rentora repository,
classifying data provenance (operational repo data vs. mapped public benchmarks)
and evaluating existing baseline models without requiring a live MongoDB server.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, asdict
from typing import Any, Dict, List

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_absolute_error,
    r2_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split


REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(REPO_ROOT, "data")
ML_DIR = os.path.join(REPO_ROOT, "ml_pipeline")


@dataclass
class DatasetAuditEntry:
    """Metadata and provenance summary for a repository CSV dataset."""

    name: str
    path: str
    rows: int
    columns: int
    provenance: str
    key_fields: List[str]
    notes: str


DATASET_PROVENANCE: Dict[str, Dict[str, str]] = {
    "appliances_catalog.csv": {
        "provenance": "REPO_OPERATIONAL_CATALOG",
        "notes": "164 appliance/furniture SKUs with daily/monthly pricing, tiered {3,6,12} pricing, deposits, and cities.",
    },
    "rentals_transactions.csv": {
        "provenance": "REPO_OPERATIONAL_TRANSACTIONS",
        "notes": "101 rental records; sparse optional fields (deposit_discount, damage_report, buyout_details); no randomized pricing logs.",
    },
    "appliance_recommendations.csv": {
        "provenance": "REPO_MODEL_OUTPUT",
        "notes": "606 precomputed TF-IDF + co-rental recommendations.",
    },
    "appliance_sensor_dataset.csv": {
        "provenance": "MAPPED_EXTERNAL_BENCHMARK (AI4I 2020)",
        "notes": "10,000 static rows mapped from AI4I 2020; appliance_type assigned round-robin (i % 6); no longitudinal trajectories or owner graph.",
    },
    "inventory_depletion_dataset.csv": {
        "provenance": "MAPPED_EXTERNAL_BENCHMARK (Kaggle Supply Chain)",
        "notes": "5,001 rows mapped from supply chain data; no multi-city transport cost or condition grade.",
    },
    "rental_churn_dataset.csv": {
        "provenance": "MAPPED_EXTERNAL_BENCHMARK (Bank Churn)",
        "notes": "10,000 rows mapped from Bank Customer Churn into rental engagement features.",
    },
}


def audit_datasets(repo_root: str = REPO_ROOT) -> List[DatasetAuditEntry]:
    """Inspect all CSV datasets under data/ and ml_pipeline/."""
    entries: List[DatasetAuditEntry] = []
    search_dirs = [os.path.join(repo_root, "data"), os.path.join(repo_root, "ml_pipeline")]
    for directory in search_dirs:
        if not os.path.isdir(directory):
            continue
        for fname in sorted(os.listdir(directory)):
            if not fname.endswith(".csv"):
                continue
            fpath = os.path.join(directory, fname)
            df = pd.read_csv(fpath)
            meta = DATASET_PROVENANCE.get(
                fname,
                {"provenance": "UNKNOWN", "notes": "Unclassified dataset."},
            )
            entries.append(
                DatasetAuditEntry(
                    name=fname,
                    path=os.path.relpath(fpath, repo_root).replace("\\", "/"),
                    rows=int(len(df)),
                    columns=int(len(df.columns)),
                    provenance=meta["provenance"],
                    key_fields=list(df.columns[:8]),
                    notes=meta["notes"],
                )
            )
    return entries


def _load_joblib_estimator(artifact: Any) -> Any:
    """Extract the sklearn/lgbm estimator whether saved directly or inside a dict."""
    if isinstance(artifact, dict):
        for key in ("model", "classifier", "regressor", "estimator"):
            if key in artifact:
                return artifact[key]
    return artifact


def evaluate_existing_baselines(repo_root: str = REPO_ROOT) -> Dict[str, Dict[str, Any]]:
    """Evaluate existing saved baseline models on deterministic held-out splits."""
    ml_dir = os.path.join(repo_root, "ml_pipeline")
    results: Dict[str, Dict[str, Any]] = {}

    # 1. Churn LightGBM baseline
    churn_csv = os.path.join(ml_dir, "rental_churn_dataset.csv")
    churn_model_path = os.path.join(ml_dir, "churn_lightgbm_model.joblib")
    if os.path.exists(churn_csv) and os.path.exists(churn_model_path):
        df = pd.read_csv(churn_csv)
        feature_cols = [c for c in df.columns if c not in ("churn", "customer_id")]
        _, X_test, _, y_test = train_test_split(
            df[feature_cols], df["churn"], test_size=0.2, random_state=42, stratify=df["churn"]
        )
        model = _load_joblib_estimator(joblib.load(churn_model_path))
        probs = model.predict_proba(X_test)[:, 1]
        preds = (probs >= 0.5).astype(int)
        results["churn_lightgbm"] = {
            "provenance": "MAPPED_EXTERNAL_BENCHMARK",
            "n_test": int(len(y_test)),
            "accuracy": round(float(accuracy_score(y_test, preds)), 4),
            "f1": round(float(f1_score(y_test, preds)), 4),
            "roc_auc": round(float(roc_auc_score(y_test, probs)), 4),
        }

    # 2. Predictive Maintenance Random Forest baseline
    sensor_csv = os.path.join(ml_dir, "appliance_sensor_dataset.csv")
    maint_model_path = os.path.join(ml_dir, "maintenance_rf_model.joblib")
    if os.path.exists(sensor_csv) and os.path.exists(maint_model_path):
        df = pd.read_csv(sensor_csv)
        features = [
            "operating_hours", "motor_temp_c", "vibration_amplitude",
            "power_fluctuation_pct", "daily_energy_kwh", "duty_cycle_pct",
            "days_since_service", "ambient_temp_c",
        ]
        _, X_test, _, y_test = train_test_split(
            df[features], df["failure_30d"], test_size=0.2, random_state=42, stratify=df["failure_30d"]
        )
        model = _load_joblib_estimator(joblib.load(maint_model_path))
        probs = model.predict_proba(X_test)[:, 1]
        preds = (probs >= 0.5).astype(int)
        results["maintenance_rf"] = {
            "provenance": "MAPPED_EXTERNAL_BENCHMARK",
            "n_test": int(len(y_test)),
            "accuracy": round(float(accuracy_score(y_test, preds)), 4),
            "f1": round(float(f1_score(y_test, preds)), 4),
            "roc_auc": round(float(roc_auc_score(y_test, probs)), 4),
        }

    # 3. Low-Stock Predictor GBR baseline
    stock_csv = os.path.join(ml_dir, "inventory_depletion_dataset.csv")
    stock_model_path = os.path.join(ml_dir, "low_stock_predictor_model.joblib")
    if os.path.exists(stock_csv) and os.path.exists(stock_model_path):
        df = pd.read_csv(stock_csv)
        features = ["current_stock", "weekly_velocity", "seasonal_lift", "lead_time_days", "views_velocity"]
        _, X_test, _, y_test = train_test_split(
            df[features], df["days_to_stockout"], test_size=0.2, random_state=42
        )
        model = _load_joblib_estimator(joblib.load(stock_model_path))
        preds = model.predict(X_test)
        results["low_stock_gbr"] = {
            "provenance": "MAPPED_EXTERNAL_BENCHMARK",
            "n_test": int(len(y_test)),
            "mae_days": round(float(mean_absolute_error(y_test, preds)), 4),
            "r2": round(float(r2_score(y_test, preds)), 4),
        }

    # 4. Hybrid Recommender artifact check
    rec_model_path = os.path.join(ml_dir, "recommender_hybrid_model.joblib")
    rec_csv = os.path.join(repo_root, "data", "appliance_recommendations.csv")
    if os.path.exists(rec_model_path) and os.path.exists(rec_csv):
        rec_df = pd.read_csv(rec_csv)
        rec_artifact = joblib.load(rec_model_path)
        results["hybrid_recommender"] = {
            "provenance": "REPO_OPERATIONAL_CATALOG",
            "n_recommendations": int(len(rec_df)),
            "unique_users": int(rec_df["user_id"].nunique()),
            "unique_items": int(rec_df["recommended_appliance_id"].nunique()),
            "artifact_keys": list(rec_artifact.keys()) if isinstance(rec_artifact, dict) else [type(rec_artifact).__name__],
        }

    return results


def assess_initiative_readiness() -> List[Dict[str, Any]]:
    """Rank all 10 research & infrastructure proposals by data & research defensibility."""
    return [
        {
            "id": 1,
            "name": "Rental-market experiment design",
            "readiness": "SELECTED_PRIMARY",
            "evaluation_mode": "SIMULATION_ONLY (parameterized from repo catalog & transactions)",
            "rationale": "Strong causal/interference question; directly testable via shared-inventory simulator (Item 7).",
        },
        {
            "id": 6,
            "name": "Rental-document consistency verification",
            "readiness": "SELECTED_PRIMARY",
            "evaluation_mode": "REPO_DATA",
            "rationale": "Catalog CSV, rental routes, and docs exist in repo; verifiable with exact citations and ABSTAIN.",
        },
        {
            "id": 7,
            "name": "Reusable-asset rental simulator and benchmark",
            "readiness": "SELECTED_INFRASTRUCTURE",
            "evaluation_mode": "SIMULATION_ONLY (parameterized from repo catalog & transactions)",
            "rationale": "Essential testbed for Items 1, 2, 3, 9, and 10 where observational intervention logs are absent.",
        },
        {
            "id": 5,
            "name": "Cross-appliance learning for new inventory",
            "readiness": "PARTIAL_DATA_CAVEAT",
            "evaluation_mode": "MAPPED_EXTERNAL_BENCHMARK",
            "rationale": "10,000-row sensor CSV exists, but appliance_type is assigned round-robin (i % 6) from AI4I 2020.",
        },
        {
            "id": 10,
            "name": "Depreciation-aware fairness",
            "readiness": "PARTIAL_REPO_DATA",
            "evaluation_mode": "REPO_DATA + SIMULATION",
            "rationale": "Pricing, deposits, and depreciation formulas exist in catalog and inventory.js; fairness tradeoffs testable.",
        },
        {
            "id": 8,
            "name": "Decision auditing and evidence allocation",
            "readiness": "DESIGN_AND_TRIAGE_READY",
            "evaluation_mode": "REPO_DATA (transactions) + SIMULATION",
            "rationale": "Triage scoring and evidence checklists can be built without automated damage verdicts.",
        },
        {
            "id": 3,
            "name": "Lifecycle-aware inventory allocation",
            "readiness": "SIMULATION_ONLY",
            "evaluation_mode": "SIMULATION_ONLY",
            "rationale": "Repo lacks multi-city transport cost logs; testable in simulator with uncertainty.",
        },
        {
            "id": 9,
            "name": "Reverse logistics and asset recovery",
            "readiness": "SIMULATION_ONLY",
            "evaluation_mode": "SIMULATION_ONLY",
            "rationale": "4-stage refurbishment workflow exists in inventory.js, but no empirical recovery outcome logs.",
        },
        {
            "id": 2,
            "name": "Health-aware pricing and contract decisions",
            "readiness": "BLOCKED_FOR_CAUSAL_REAL_DATA",
            "evaluation_mode": "SIMULATION_ONLY (causal uplift)",
            "rationale": "No randomized historical pricing/deposit intervention logs in repo; simulation benchmark only.",
        },
        {
            "id": 4,
            "name": "Asset-health forecasting across the rental network",
            "readiness": "BLOCKED_FOR_LONGITUDINAL_GRAPH",
            "evaluation_mode": "DATA_GAP",
            "rationale": "No multi-cycle per-unit sensor time series or owner-to-owner transfer graph in repo.",
        },
    ]


if __name__ == "__main__":
    print("=== Dataset Audit ===")
    for entry in audit_datasets():
        print(asdict(entry))
    print("\n=== Baseline Evaluation ===")
    print(evaluate_existing_baselines())
