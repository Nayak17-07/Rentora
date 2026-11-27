"""Self-Generating Feature Dataset Builder for Rentora ML Pipeline.

Supports two modes:
  1. `build_catalog_calibrated_datasets()`: Merges Rentora's operational tables
     (`appliances_catalog.csv`, `rentals_transactions.csv`, `appliance_recommendations.csv`)
     with cached Kaggle benchmarks to produce catalog-calibrated feature datasets.
  2. `export_from_mongodb()`: Exports real operational data from live MongoDB
     collections (`users`, `rentals`, `payments`, `browsing_history`,
     `serialized_inventory_units`) into training-ready CSVs once sufficient
     live app events have been collected.
"""

from __future__ import annotations

import os
import sys
from typing import Any, Dict, List

import numpy as np
import pandas as pd


CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(CURRENT_DIR)
CACHE_DIR = os.path.join(CURRENT_DIR, "kaggle_cache")
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)


def get_catalog_price_priors(repo_root: str = REPO_ROOT) -> Dict[str, float]:
    """Extract real INR price and tenure priors from data/appliances_catalog.csv."""
    cat_path = os.path.join(repo_root, "data", "appliances_catalog.csv")
    df = pd.read_csv(cat_path)
    prices = df["monthly_price"].dropna().astype(float)
    return {
        "median_monthly_price": float(prices.median()),
        "p25_monthly_price": float(prices.quantile(0.25)),
        "p75_monthly_price": float(prices.quantile(0.75)),
        "n_skus": int(len(df)),
    }


def build_recommender_training_pairs(repo_root: str = REPO_ROOT) -> pd.DataFrame:
    """Merge catalog, transactions, and bundle recommendations into training pairs."""
    data_dir = os.path.join(repo_root, "data")
    cat = pd.read_csv(os.path.join(data_dir, "appliances_catalog.csv"))
    tx = pd.read_csv(os.path.join(data_dir, "rentals_transactions.csv"))
    recs = pd.read_csv(os.path.join(data_dir, "appliance_recommendations.csv"))

    cat_small = cat[["appliance_id", "rental_name", "category_id", "sub_category", "monthly_price"]].copy()

    # 1. Co-rental pairs from rentals_transactions.csv
    pair_rows: List[Dict[str, Any]] = []
    for uid, grp in tx.groupby("user_id"):
        items = grp["appliance_id"].dropna().astype(str).unique().tolist()
        for i in range(len(items)):
            for j in range(i + 1, len(items)):
                pair_rows.append(
                    {
                        "source_appliance_id": items[i],
                        "target_appliance_id": items[j],
                        "signal_source": "RENTAL_CO_OCCURRENCE",
                        "weight": 1.0,
                    }
                )

    # 2. Bundle & affinity priors from appliance_recommendations.csv
    user_to_rented = tx.groupby("user_id")["appliance_id"].apply(lambda s: s.dropna().astype(str).tolist()).to_dict()
    for _, r in recs.iterrows():
        uid = str(r.get("user_id", ""))
        target_id = str(r.get("recommended_appliance_id", ""))
        rec_type = str(r.get("recommendation_type", "ECO_SAVER"))
        match_pct = float(r.get("match_percentage", 75.0)) / 100.0
        for src_id in user_to_rented.get(uid, []):
            if src_id != target_id:
                pair_rows.append(
                    {
                        "source_appliance_id": src_id,
                        "target_appliance_id": target_id,
                        "signal_source": rec_type,
                        "weight": round(match_pct, 4),
                    }
                )

    pairs_df = pd.DataFrame(pair_rows)
    if not pairs_df.empty:
        pairs_df = (
            pairs_df.groupby(["source_appliance_id", "target_appliance_id", "signal_source"], as_index=False)["weight"]
            .mean()
        )
        pairs_df = pairs_df.merge(
            cat_small.rename(columns={"appliance_id": "source_appliance_id", "category_id": "source_category", "monthly_price": "source_price", "rental_name": "source_name"}),
            on="source_appliance_id",
            how="left",
        ).merge(
            cat_small.rename(columns={"appliance_id": "target_appliance_id", "category_id": "target_category", "monthly_price": "target_price", "rental_name": "target_name"}),
            on="target_appliance_id",
            how="left",
        )
    out_path = os.path.join(CURRENT_DIR, "recommender_training_pairs.csv")
    pairs_df.to_csv(out_path, index=False)
    return pairs_df


def build_catalog_calibrated_datasets(repo_root: str = REPO_ROOT) -> Dict[str, Any]:
    """Generate/refresh all curated feature datasets in ml_pipeline/."""
    priors = get_catalog_price_priors(repo_root)
    pairs_df = build_recommender_training_pairs(repo_root)
    return {
        "catalog_priors": priors,
        "recommender_training_pairs_rows": int(len(pairs_df)),
        "recommender_pairs_path": os.path.join(CURRENT_DIR, "recommender_training_pairs.csv"),
    }


def export_from_mongodb(min_rentals: int = 50) -> Dict[str, Any]:
    """Export live MongoDB collections into feature CSVs when enough real data exists."""
    from api.mongo_client import get_mongo_db

    db = get_mongo_db()
    rentals = list(db.rentals.find({}))
    if len(rentals) < min_rentals:
        return {
            "status": "INSUFFICIENT_LIVE_DATA",
            "rentals_found": len(rentals),
            "min_required": min_rentals,
            "message": "Keep logging live rentals/events before switching off proxy datasets.",
        }

    df_rentals = pd.DataFrame(rentals)
    out_tx = os.path.join(CURRENT_DIR, "live_rentals_export.csv")
    df_rentals.to_csv(out_tx, index=False)

    browsing = list(db.browsing_history.find({}))
    if browsing:
        pd.DataFrame(browsing).to_csv(os.path.join(CURRENT_DIR, "live_browsing_export.csv"), index=False)

    units = list(db.serialized_inventory_units.find({}))
    if units:
        pd.DataFrame(units).to_csv(os.path.join(CURRENT_DIR, "live_inventory_units_export.csv"), index=False)

    return {
        "status": "EXPORTED",
        "rentals_exported": len(df_rentals),
        "browsing_exported": len(browsing),
        "units_exported": len(units),
    }


if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser(description="Rentora Self-Generating Dataset Builder")
    parser.add_argument("--mode", choices=["calibrated", "mongodb"], default="calibrated")
    args = parser.parse_args()
    if args.mode == "mongodb":
        print(json.dumps(export_from_mongodb(), indent=2))
    else:
        print(json.dumps(build_catalog_calibrated_datasets(), indent=2))
