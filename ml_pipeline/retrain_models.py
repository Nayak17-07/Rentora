"""Disciplined ML training & evaluation protocol for Rentora.

1. Churn: Trains on Kaggle `training-master.csv` (grouped by CustomerID into train/val)
   and evaluates on untouched `testing-master.csv`, plus CustomerID-grouped split check.
   Compares against Majority Class and Inactivity Rule baselines.
2. Maintenance: Uses Kaggle Azure PdM with a strict 30-day failure horizon,
   30-day temporal embargo between adjacent splits, and Prevalence / LogisticRegression
   baselines. Explicitly labeled as an industrial proxy baseline.
3. Recommender: Builds the content-based cold-start recommender from Rentora's
   164-SKU catalog (`data/appliances_catalog.csv`) without mismatched external benchmarks.
"""

from __future__ import annotations

import datetime
import json
import os
import sys
from typing import Any, Dict, List, Tuple

import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(CURRENT_DIR)
CACHE_DIR = os.path.join(CURRENT_DIR, "kaggle_cache")
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from ml_pipeline.dataset_builder import (
    build_catalog_calibrated_datasets,
    get_catalog_price_priors,
)
from ml_pipeline.train_model import COMPLEMENTARY_MAP, build_co_rental_matrix


CHURN_FEATURE_COLS = [
    "tenure_months",
    "monthly_spend",
    "active_rentals",
    "credit_score",
    "customer_age",
    "is_active_member",
    "late_payments",
    "early_returns",
    "cart_abandonment",
    "days_inactive",
    "avg_rating",
    "spend_per_rental",
    "delinquency_rate",
    "inactivity_rate",
    "engagement_score",
]


def _map_kaggle_churn_features(raw: pd.DataFrame, catalog_median_price: float = 900.0) -> Tuple[pd.DataFrame, pd.Series, pd.Series]:
    """Map Kaggle subscription churn columns to Rentora's 15 ETL feature columns,
    calibrated to Rentora's catalog INR monthly-price scale."""
    df = raw.dropna(subset=["Churn"]).copy()

    sub_map = {"Basic": 1, "Standard": 2, "Premium": 3}
    contract_map = {"Monthly": 1, "Quarterly": 3, "Annual": 12}

    tenure = df["Tenure"].astype(float).clip(1, 120)
    total_spend = df["Total Spend"].astype(float).clip(10, 50000)
    usage_freq = df["Usage Frequency"].astype(float).clip(0, 60)
    support_calls = df["Support Calls"].astype(float).clip(0, 20)
    payment_delay = df["Payment Delay"].astype(float).clip(0, 60)
    last_inter = df["Last Interaction"].astype(float).clip(0, 90)
    age = df["Age"].astype(float).clip(18, 90)
    sub_tier = df["Subscription Type"].map(sub_map).fillna(1).astype(float)
    contract_len = df["Contract Length"].map(contract_map).fillna(1).astype(float)

    active_rentals = (sub_tier + (contract_len >= 3).astype(float)).clip(1, 5)
    spend_scale = (total_spend / 661.0).clip(0.3, 3.0)
    monthly_spend = (active_rentals * catalog_median_price * spend_scale).round(2)
    credit_score = (780.0 - payment_delay * 8.5 - support_calls * 6.0).clip(350, 850).round(0)
    is_active_member = ((last_inter <= 15) & (usage_freq >= 10)).astype(int)
    late_payments = np.round(payment_delay / 6.0).clip(0, 5).astype(int)
    early_returns = ((contract_len == 1) & (tenure <= 6)).astype(int)
    cart_abandonment = np.round(support_calls / 2.0).clip(0, 8).astype(int)
    days_inactive = last_inter.round(1)
    avg_rating = (4.8 - support_calls * 0.28 - payment_delay * 0.03).clip(1.0, 5.0).round(2)

    spend_per_rental = np.round(monthly_spend / (active_rentals + 0.1), 2)
    delinquency_rate = np.round(late_payments / (active_rentals + 1.0), 4)
    inactivity_rate = np.round(days_inactive / (tenure * 30.0 + 1.0), 4)
    engagement_score = np.round(avg_rating * (1.0 - (days_inactive / 90.0).clip(0, 1)), 3)

    X = pd.DataFrame(
        {
            "tenure_months": tenure,
            "monthly_spend": monthly_spend,
            "active_rentals": active_rentals,
            "credit_score": credit_score,
            "customer_age": age,
            "is_active_member": is_active_member,
            "late_payments": late_payments,
            "early_returns": early_returns,
            "cart_abandonment": cart_abandonment,
            "days_inactive": days_inactive,
            "avg_rating": avg_rating,
            "spend_per_rental": spend_per_rental,
            "delinquency_rate": delinquency_rate,
            "inactivity_rate": inactivity_rate,
            "engagement_score": engagement_score,
        }
    )
    y = df["Churn"].astype(int)
    cids = df["CustomerID"].astype(int).astype(str)
    return X[CHURN_FEATURE_COLS], y, cids


def _binary_classification_report(y_true: pd.Series, probs: np.ndarray, threshold: float) -> Dict[str, Any]:
    """Compute full binary classification metrics including PR-AUC and calibration."""
    preds = (probs >= threshold).astype(int)
    cm = confusion_matrix(y_true, preds).tolist()
    return {
        "n": int(len(y_true)),
        "prevalence": round(float(np.mean(y_true)), 4),
        "threshold": threshold,
        "roc_auc": round(float(roc_auc_score(y_true, probs)), 4),
        "pr_auc": round(float(average_precision_score(y_true, probs)), 4),
        "brier_score": round(float(brier_score_loss(y_true, probs)), 4),
        "accuracy": round(float(accuracy_score(y_true, preds)), 4),
        "precision": round(float(precision_score(y_true, preds, zero_division=0)), 4),
        "recall": round(float(recall_score(y_true, preds, zero_division=0)), 4),
        "f1": round(float(f1_score(y_true, preds, zero_division=0)), 4),
        "confusion_matrix": cm,
    }


def retrain_churn_model() -> Dict[str, Any]:
    """Evaluate churn with CustomerID-grouped splits and official train/test separation."""
    tr_path = os.path.join(CACHE_DIR, "customer_churn", "customer_churn_dataset-training-master.csv")
    te_path = os.path.join(CACHE_DIR, "customer_churn", "customer_churn_dataset-testing-master.csv")

    priors = get_catalog_price_priors(REPO_ROOT)
    cat_med = priors["median_monthly_price"]
    raw_tr = pd.read_csv(tr_path)
    raw_te = pd.read_csv(te_path)
    X_tr_all, y_tr_all, cid_tr = _map_kaggle_churn_features(raw_tr, catalog_median_price=cat_med)
    X_te_off, y_te_off, cid_te = _map_kaggle_churn_features(raw_te, catalog_median_price=cat_med)

    # 1. Official partition evaluation: train/val grouped by CustomerID on training-master,
    #    evaluated on untouched testing-master (no shared CustomerIDs).
    gss = GroupShuffleSplit(n_splits=1, test_size=0.15, random_state=42)
    tr_idx, val_idx = next(gss.split(X_tr_all, y_tr_all, groups=cid_tr))
    X_train, y_train = X_tr_all.iloc[tr_idx], y_tr_all.iloc[tr_idx]
    X_val, y_val = X_tr_all.iloc[val_idx], y_tr_all.iloc[val_idx]

    model_off = lgb.LGBMClassifier(
        n_estimators=400,
        learning_rate=0.06,
        num_leaves=63,
        max_depth=8,
        subsample=0.85,
        colsample_bytree=0.85,
        class_weight="balanced",
        reg_alpha=0.1,
        reg_lambda=0.1,
        random_state=42,
        n_jobs=-1,
        verbose=-1,
    )
    model_off.fit(X_train, y_train)

    val_probs = model_off.predict_proba(X_val)[:, 1]
    best_th, best_f1 = 0.50, 0.0
    for th in np.arange(0.30, 0.71, 0.05):
        f1 = f1_score(y_val, (val_probs >= th).astype(int))
        if f1 > best_f1:
            best_f1 = f1
            best_th = round(float(th), 2)

    off_probs = model_off.predict_proba(X_te_off)[:, 1]
    off_metrics = _binary_classification_report(y_te_off, off_probs, best_th)

    # Simple baselines on official test set
    maj_prob = np.full(len(y_te_off), float(y_train.mean()))
    inact_prob = (X_te_off["days_inactive"].values > 15.0).astype(float)
    baselines_off = {
        "majority_prevalence": _binary_classification_report(y_te_off, maj_prob, 0.5),
        "inactivity_rule_gt_15d": _binary_classification_report(y_te_off, inact_prob, 0.5),
    }

    # 2. Combined CustomerID-grouped check (prefixing file origin to prevent ID collision)
    X_comb = pd.concat([X_tr_all, X_te_off], ignore_index=True)
    y_comb = pd.concat([y_tr_all, y_te_off], ignore_index=True)
    groups_comb = pd.concat(["tr_" + cid_tr, "te_" + cid_te], ignore_index=True)
    gss_comb = GroupShuffleSplit(n_splits=1, test_size=0.15, random_state=42)
    c_tr_idx, c_te_idx = next(gss_comb.split(X_comb, y_comb, groups=groups_comb))
    assert len(set(groups_comb.iloc[c_tr_idx]) & set(groups_comb.iloc[c_te_idx])) == 0

    model_grp = lgb.LGBMClassifier(
        n_estimators=400, learning_rate=0.06, num_leaves=63, max_depth=8,
        subsample=0.85, colsample_bytree=0.85, class_weight="balanced",
        reg_alpha=0.1, reg_lambda=0.1, random_state=42, n_jobs=-1, verbose=-1,
    )
    model_grp.fit(X_comb.iloc[c_tr_idx], y_comb.iloc[c_tr_idx])
    grp_probs = model_grp.predict_proba(X_comb.iloc[c_te_idx])[:, 1]
    grp_metrics = _binary_classification_report(y_comb.iloc[c_te_idx], grp_probs, best_th)

    # Save 50k stratified sample for repo inspection
    curated = X_tr_all.copy()
    curated.insert(0, "customer_id", cid_tr.values)
    curated["churn"] = y_tr_all.values
    sample_idx = np.random.default_rng(42).choice(len(curated), size=50000, replace=False)
    curated.iloc[sample_idx].to_csv(os.path.join(CURRENT_DIR, "rental_churn_dataset.csv"), index=False)

    all_metrics = {
        "provenance": "KAGGLE_CUSTOMER_CHURN (proxy subscription dataset; not Rentora customer validation)",
        "official_test_partition": off_metrics,
        "official_test_baselines": baselines_off,
        "grouped_combined_split": grp_metrics,
    }
    joblib.dump(
        {
            "model": model_off,
            "feature_cols": CHURN_FEATURE_COLS,
            "optimal_threshold": best_th,
            "metrics": all_metrics,
            "trained_at": datetime.datetime.now(datetime.UTC).isoformat(),
        },
        os.path.join(CURRENT_DIR, "churn_lightgbm_model.joblib"),
    )
    return all_metrics


def _build_synergy_matrix(df_app: pd.DataFrame) -> np.ndarray:
    """Build domain-synergy + price-proximity bonus matrix across catalog items."""
    n = len(df_app)
    syn = np.zeros((n, n), dtype=float)
    names = df_app["rental_name"].fillna("").str.lower().tolist()
    prices = df_app["monthly_price"].fillna(1000.0).astype(float).values

    for i in range(n):
        comps_i: List[str] = []
        for k, targets in COMPLEMENTARY_MAP.items():
            if k in names[i]:
                comps_i.extend(targets)
        for j in range(n):
            if i == j:
                continue
            if any(t in names[j] for t in comps_i):
                syn[i, j] += 0.35
            p_diff = abs(prices[i] - prices[j]) / max(prices[i], prices[j], 1.0)
            syn[i, j] += 0.15 * max(0.0, 1.0 - p_diff)
    return syn


def retrain_recommender_model() -> Dict[str, Any]:
    """Build content-based cold-start recommender from Rentora's 164-SKU catalog."""
    cat_path = os.path.join(REPO_ROOT, "data", "appliances_catalog.csv")
    r_tx_path = os.path.join(REPO_ROOT, "data", "rentals_transactions.csv")
    df_app = pd.read_csv(cat_path)
    df_rtx = pd.read_csv(r_tx_path)

    app_ids = df_app["appliance_id"].astype(str).tolist()
    content = (
        (df_app["category_id"].fillna("") + " ") * 3
        + (df_app["sub_category"].fillna("") + " ") * 2
        + df_app["brand"].fillna("") + " "
        + df_app["tag"].fillna("") + " "
        + df_app["rental_name"].fillna("") + " "
        + df_app["description"].fillna("")
    )
    tfidf = TfidfVectorizer(
        ngram_range=(1, 2), stop_words="english", max_features=3000, sublinear_tf=True
    )
    content_sim = cosine_similarity(tfidf.fit_transform(content))
    co_matrix = build_co_rental_matrix(
        df_rtx[["user_id", "appliance_id"]].dropna().to_dict("records"), app_ids
    )
    synergy_mat = _build_synergy_matrix(df_app)

    # Merge curated bundle & affinity priors from recommender_training_pairs.csv
    pairs_path = os.path.join(CURRENT_DIR, "recommender_training_pairs.csv")
    n_pairs = 0
    if os.path.exists(pairs_path):
        pairs_df = pd.read_csv(pairs_path)
        id_to_idx = {aid: i for i, aid in enumerate(app_ids)}
        for _, pr in pairs_df.iterrows():
            si = id_to_idx.get(str(pr.get("source_appliance_id", "")))
            ti = id_to_idx.get(str(pr.get("target_appliance_id", "")))
            if si is not None and ti is not None and si != ti:
                synergy_mat[si, ti] = max(synergy_mat[si, ti], float(pr.get("weight", 0.5)) * 0.5)
                n_pairs += 1

    meta = {
        "provenance": "REPO_CATALOG (164 SKUs) + recommender_training_pairs.csv",
        "n_catalog_items": int(len(df_app)),
        "merged_bundle_pairs": n_pairs,
        "note": "Cold-start content + bundle recommender; CF awaits larger live rental history.",
    }
    joblib.dump(
        {
            "tfidf": tfidf,
            "content_sim": content_sim,
            "co_matrix": co_matrix,
            "synergy_matrix": synergy_mat,
            "app_id_list": app_ids,
            "eval_metrics": meta,
            "trained_at": datetime.datetime.now(datetime.UTC).isoformat(),
        },
        os.path.join(CURRENT_DIR, "recommender_hybrid_model.joblib"),
    )
    return meta


MAINT_FEATURES = [
    "operating_hours",
    "motor_temp_c",
    "vibration_amplitude",
    "power_fluctuation_pct",
    "daily_energy_kwh",
    "duty_cycle_pct",
    "days_since_service",
    "ambient_temp_c",
]


def retrain_maintenance_model() -> Dict[str, Any]:
    """Train 30-day failure baseline on Azure PdM with 30-day embargo & baselines."""
    pdm_dir = os.path.join(CACHE_DIR, "azure_pdm")
    tel = pd.read_csv(os.path.join(pdm_dir, "PdM_telemetry.csv"), parse_dates=["datetime"])
    machines = pd.read_csv(os.path.join(pdm_dir, "PdM_machines.csv"))
    errors = pd.read_csv(os.path.join(pdm_dir, "PdM_errors.csv"), parse_dates=["datetime"])
    maint = pd.read_csv(os.path.join(pdm_dir, "PdM_maint.csv"), parse_dates=["datetime"])
    failures = pd.read_csv(os.path.join(pdm_dir, "PdM_failures.csv"), parse_dates=["datetime"])

    tel["date"] = tel["datetime"].dt.floor("D")
    daily = (
        tel.groupby(["machineID", "date"], as_index=False)
        .agg(
            volt_mean=("volt", "mean"),
            volt_std=("volt", "std"),
            rotate_mean=("rotate", "mean"),
            pressure_mean=("pressure", "mean"),
            vibration_mean=("vibration", "mean"),
        )
        .fillna(0.0)
        .merge(machines, on="machineID", how="left")
    )

    errors["date"] = errors["datetime"].dt.floor("D")
    err_daily = errors.groupby(["machineID", "date"], as_index=False).size().rename(columns={"size": "err_count"})
    daily = daily.merge(err_daily, on=["machineID", "date"], how="left")
    daily["err_count"] = daily["err_count"].fillna(0.0)

    daily = daily.sort_values(["machineID", "date"]).reset_index(drop=True)
    daily["err_3d"] = daily.groupby("machineID")["err_count"].transform(lambda s: s.rolling(3, min_periods=1).sum())

    horizon_days = 30
    maint_dates = maint.groupby("machineID")["datetime"].apply(lambda s: np.sort(s.dt.floor("D").values)).to_dict()
    fail_dates = failures.groupby("machineID")["datetime"].apply(lambda s: np.sort(s.dt.floor("D").values)).to_dict()

    days_since_svc: List[int] = []
    fail_next_30d: List[int] = []
    for mid, dt in zip(daily["machineID"].values, daily["date"].values):
        m_arr = maint_dates.get(mid)
        if m_arr is not None and len(m_arr) > 0:
            past = m_arr[m_arr <= dt]
            d_svc = int((dt - past[-1]) / np.timedelta64(1, "D")) if len(past) > 0 else 60
        else:
            d_svc = 60
        days_since_svc.append(min(365, max(0, d_svc)))

        f_arr = fail_dates.get(mid)
        if f_arr is not None and len(f_arr) > 0:
            future = f_arr[(f_arr > dt) & (f_arr <= dt + np.timedelta64(horizon_days, "D"))]
            fail_next_30d.append(1 if len(future) > 0 else 0)
        else:
            fail_next_30d.append(0)

    model_to_app = {
        "model1": "Washing Machine",
        "model2": "Refrigerator",
        "model3": "Air Conditioner",
        "model4": "Dishwasher",
    }
    curated = pd.DataFrame(
        {
            "device_id": [f"AZURE_M{int(m):03d}" for m in daily["machineID"].values],
            "appliance_type": daily["model"].map(model_to_app).fillna("Appliance"),
            "date": daily["date"].dt.strftime("%Y-%m-%d"),
            "operating_hours": (daily["age"].astype(float) * 350.0).round(1),
            "motor_temp_c": (daily["pressure_mean"] * 0.48).round(1),
            "vibration_amplitude": (daily["vibration_mean"] * 0.15).round(2),
            "power_fluctuation_pct": (daily["volt_std"] * 0.8).round(2),
            "daily_energy_kwh": (daily["volt_mean"] * daily["rotate_mean"] / 25000.0).round(2),
            "duty_cycle_pct": ((daily["rotate_mean"] / 600.0) * 100.0).clip(5, 99).round(1),
            "days_since_service": days_since_svc,
            "ambient_temp_c": (25.0 + daily["err_3d"] * 3.0).round(1),
            "failure_30d": fail_next_30d,
        }
    )

    d_dt_all = pd.to_datetime(curated["date"])
    max_obs_date = d_dt_all.max() - pd.Timedelta(days=horizon_days)
    curated = curated[d_dt_all <= max_obs_date].reset_index(drop=True)
    curated.to_csv(os.path.join(CURRENT_DIR, "appliance_sensor_dataset.csv"), index=False)

    d_dt = pd.to_datetime(curated["date"])
    q70, q85 = d_dt.quantile(0.70), d_dt.quantile(0.85)
    embargo = pd.Timedelta(days=horizon_days)
    train_df = curated[d_dt <= q70]
    val_df = curated[(d_dt > q70 + embargo) & (d_dt <= q85)]
    test_df = curated[d_dt > q85 + embargo]

    # Simple baselines: prevalence & logistic regression
    logreg = make_pipeline(StandardScaler(), LogisticRegression(class_weight="balanced", max_iter=500, random_state=42))
    logreg.fit(train_df[MAINT_FEATURES], train_df["failure_30d"])
    lr_probs = logreg.predict_proba(test_df[MAINT_FEATURES])[:, 1]
    prev_probs = np.full(len(test_df), float(train_df["failure_30d"].mean()))

    clf = lgb.LGBMClassifier(
        n_estimators=300,
        learning_rate=0.05,
        num_leaves=31,
        max_depth=6,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
        verbose=-1,
    )
    clf.fit(train_df[MAINT_FEATURES], train_df["failure_30d"])

    val_probs = clf.predict_proba(val_df[MAINT_FEATURES])[:, 1]
    best_th, best_f1 = 0.50, 0.0
    for th in np.arange(0.30, 0.85, 0.05):
        f1 = f1_score(val_df["failure_30d"], (val_probs >= th).astype(int), zero_division=0)
        if f1 > best_f1:
            best_f1 = f1
            best_th = round(float(th), 2)

    test_probs = clf.predict_proba(test_df[MAINT_FEATURES])[:, 1]
    metrics = {
        "provenance": "KAGGLE_AZURE_PDM (industrial proxy baseline; 30d horizon & 30d embargo)",
        "curated_csv_rows": int(len(curated)),
        "split_sizes": {"train": int(len(train_df)), "val": int(len(val_df)), "test": int(len(test_df))},
        "lightgbm_test": _binary_classification_report(test_df["failure_30d"], test_probs, best_th),
        "logistic_regression_test": _binary_classification_report(test_df["failure_30d"], lr_probs, 0.5),
        "prevalence_baseline_test": _binary_classification_report(test_df["failure_30d"], prev_probs, 0.5),
    }

    joblib.dump(
        {
            "model": clf,
            "features": MAINT_FEATURES,
            "optimal_threshold": best_th,
            "metrics": metrics,
            "trained_at": datetime.datetime.now(datetime.UTC).isoformat(),
        },
        os.path.join(CURRENT_DIR, "maintenance_rf_model.joblib"),
    )
    return metrics


def main() -> None:
    print("=== 0. Building Catalog-Calibrated Feature Datasets ===")
    print(json.dumps(build_catalog_calibrated_datasets(REPO_ROOT), indent=2))
    print("\n=== 1. Churn LightGBM (CustomerID-Grouped & Official Partition) ===")
    print(json.dumps(retrain_churn_model(), indent=2))
    print("\n=== 2. Cold-Start Content Recommender ===")
    print(json.dumps(retrain_recommender_model(), indent=2))
    print("\n=== 3. Predictive Maintenance (30d Horizon, 30d Embargo, Baselines) ===")
    print(json.dumps(retrain_maintenance_model(), indent=2))


if __name__ == "__main__":
    main()
