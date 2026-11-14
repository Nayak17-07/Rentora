#!/usr/bin/env python3
"""
Rentora Platform Research Reproducibility Engine
=================================================
Reproduces all empirical tables (Tables IV, V, VI) and figures (Figures 2, 3, 4, 5)
reported in the research paper:
"AI-Enhanced Household Appliance Rental Management: Personalized Recommendation
 and Customer Churn-Risk Prediction - A Case Study on the Rentora Platform"

Authors: Dr. Patil Yogita Dattatraya, Mukesh Naik, Abhinav Reddy Muthireddy,
         Kolloju Raghava, Md Rehal, Siddartha (KMIT, Hyderabad)
License: Academic Research Use
"""

import os
import sys
import argparse
import json
import time
import numpy as np
import pandas as pd

# Headless plotting
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    roc_curve,
    precision_recall_curve,
    confusion_matrix
)
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import lightgbm as lgb
import shap

# Set global IEEE style font options
plt.rcParams['font.sans-serif'] = 'Arial'
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.size'] = 10
plt.rcParams['axes.linewidth'] = 1.0


def parse_args():
    parser = argparse.ArgumentParser(description="Rentora Empirical Reproduction Runner")
    parser.add_argument("--seed", type=int, default=42, help="Random state seed (default: 42)")
    parser.add_argument("--output-dir", type=str, default="experiments", help="Directory to save experimental outputs")
    return parser.parse_args()


def load_churn_data(project_root):
    dataset_path = os.path.join(project_root, "ml_pipeline", "rental_churn_dataset.csv")
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Rental churn dataset not found at: {dataset_path}")
    df = pd.read_csv(dataset_path)
    feature_cols = [c for c in df.columns if c not in ['churn', 'customer_id']]
    X = df[feature_cols]
    y = df['churn']
    return df, X, y, feature_cols


def run_churn_benchmarks(X, y, seed=42):
    """
    Evaluates Random Forest baseline and Genuine LightGBM classifier
    on a held-out 20% test split (8,000 train, 2,000 test).
    """
    print("\n" + "=" * 78)
    print(" 1. CHURN RISK PREDICTION BENCHMARK (TEST SPLIT: N=2,000)")
    print("=" * 78)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=seed, stratify=y
    )

    # 1. Random Forest Baseline (250 trees, depth 12)
    rf = RandomForestClassifier(
        n_estimators=250,
        max_depth=12,
        random_state=seed,
        n_jobs=-1
    )
    t0 = time.time()
    rf.fit(X_train, y_train)
    rf_train_time = time.time() - t0

    rf_prob = rf.predict_proba(X_test)[:, 1]
    rf_pred_50 = (rf_prob >= 0.50).astype(int)

    rf_metrics = {
        "accuracy": float(accuracy_score(y_test, rf_pred_50)),
        "precision": float(precision_score(y_test, rf_pred_50)),
        "recall": float(recall_score(y_test, rf_pred_50)),
        "f1": float(f1_score(y_test, rf_pred_50)),
        "roc_auc": float(roc_auc_score(y_test, rf_prob)),
        "pr_auc": float(average_precision_score(y_test, rf_prob)),
        "train_time_sec": float(rf_train_time)
    }

    # 2. Genuine LightGBM Classifier (300 trees, depth 4, leaves 20, lr 0.04)
    lgbm = lgb.LGBMClassifier(
        n_estimators=300,
        max_depth=4,
        num_leaves=20,
        learning_rate=0.04,
        subsample=0.85,
        colsample_bytree=0.85,
        scale_pos_weight=1.4,
        reg_alpha=0.1,
        reg_lambda=0.1,
        random_state=seed,
        verbose=-1
    )
    t0 = time.time()
    lgbm.fit(X_train, y_train)
    lgb_train_time = time.time() - t0

    lgb_prob = lgbm.predict_proba(X_test)[:, 1]
    lgb_pred_50 = (lgb_prob >= 0.50).astype(int)

    lgb_metrics = {
        "accuracy": float(accuracy_score(y_test, lgb_pred_50)),
        "precision": float(precision_score(y_test, lgb_pred_50)),
        "recall": float(recall_score(y_test, lgb_pred_50)),
        "f1": float(f1_score(y_test, lgb_pred_50)),
        "roc_auc": float(roc_auc_score(y_test, lgb_prob)),
        "pr_auc": float(average_precision_score(y_test, lgb_prob)),
        "train_time_sec": float(lgb_train_time)
    }

    print(f"\nTABLE IV: Churn Prediction on Held-out Test Split (N = 2,000, Threshold = 0.50)")
    print("-" * 78)
    print(f"{'Model':<16} | {'Acc.':<7} | {'Prec.':<7} | {'Recall':<7} | {'F1':<7} | {'ROC-AUC':<8} | {'PR-AUC':<7}")
    print("-" * 78)
    print(f"{'Random Forest':<16} | {rf_metrics['accuracy']:.3f}   | {rf_metrics['precision']:.3f}   | {rf_metrics['recall']:.3f}   | {rf_metrics['f1']:.3f}   | {rf_metrics['roc_auc']:.3f}    | {rf_metrics['pr_auc']:.3f}")
    print(f"{'LightGBM':<16} | {lgb_metrics['accuracy']:.3f}   | {lgb_metrics['precision']:.3f}   | {lgb_metrics['recall']:.3f}   | {lgb_metrics['f1']:.3f}   | {lgb_metrics['roc_auc']:.3f}    | {lgb_metrics['pr_auc']:.3f}")
    print("-" * 78)

    # Confusion matrix for LightGBM
    cm = confusion_matrix(y_test, lgb_pred_50)
    tn, fp, fn, tp = cm.ravel()
    print(f"LightGBM Confusion Matrix (Th=0.50): TN={tn}, FP={fp}, FN={fn}, TP={tp}")

    return {
        "rf_model": rf,
        "lgbm_model": lgbm,
        "X_train": X_train,
        "X_test": X_test,
        "y_train": y_train,
        "y_test": y_test,
        "rf_prob": rf_prob,
        "lgb_prob": lgb_prob,
        "lgb_cm": cm,
        "rf_metrics": rf_metrics,
        "lgb_metrics": lgb_metrics
    }


def run_cross_validation(X, y, seed=42):
    """
    Executes Stratified 5-Fold Cross-Validation on the full 10,000 dataset.
    """
    print("\n" + "=" * 78)
    print(" 2. FIVE-FOLD STRATIFIED CROSS-VALIDATION (FULL DATASET: N=10,000)")
    print("=" * 78)

    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=seed)
    
    rf_rocs, rf_prs, rf_f1s = [], [], []
    lgb_rocs, lgb_prs, lgb_f1s = [], [], []

    for fold, (train_idx, val_idx) in enumerate(skf.split(X, y), 1):
        X_tr, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_tr, y_val = y.iloc[train_idx], y.iloc[val_idx]

        # RF
        rf = RandomForestClassifier(n_estimators=250, max_depth=12, random_state=seed, n_jobs=-1)
        rf.fit(X_tr, y_tr)
        p_rf = rf.predict_proba(X_val)[:, 1]
        rf_rocs.append(roc_auc_score(y_val, p_rf))
        rf_prs.append(average_precision_score(y_val, p_rf))
        rf_f1s.append(f1_score(y_val, (p_rf >= 0.5).astype(int)))

        # LightGBM
        lgbm = lgb.LGBMClassifier(
            n_estimators=300, max_depth=4, num_leaves=20, learning_rate=0.04,
            subsample=0.85, colsample_bytree=0.85, scale_pos_weight=1.4,
            reg_alpha=0.1, reg_lambda=0.1, random_state=seed, verbose=-1
        )
        lgbm.fit(X_tr, y_tr)
        p_lgb = lgbm.predict_proba(X_val)[:, 1]
        lgb_rocs.append(roc_auc_score(y_val, p_lgb))
        lgb_prs.append(average_precision_score(y_val, p_lgb))
        lgb_f1s.append(f1_score(y_val, (p_lgb >= 0.5).astype(int)))

    cv_results = {
        "rf": {
            "roc_mean": float(np.mean(rf_rocs)), "roc_std": float(np.std(rf_rocs)),
            "pr_mean": float(np.mean(rf_prs)), "pr_std": float(np.std(rf_prs)),
            "f1_mean": float(np.mean(rf_f1s)), "f1_std": float(np.std(rf_f1s))
        },
        "lgbm": {
            "roc_mean": float(np.mean(lgb_rocs)), "roc_std": float(np.std(lgb_rocs)),
            "pr_mean": float(np.mean(lgb_prs)), "pr_std": float(np.std(lgb_prs)),
            "f1_mean": float(np.mean(lgb_f1s)), "f1_std": float(np.std(lgb_f1s))
        }
    }

    print(f"\nTABLE V: Five-Fold Cross-Validation Performance (Mean ± SD)")
    print("-" * 78)
    print(f"{'Model':<16} | {'ROC-AUC':<18} | {'PR-AUC':<18} | {'F1-Score':<18}")
    print("-" * 78)
    print(f"{'Random Forest':<16} | {cv_results['rf']['roc_mean']:.3f} ± {cv_results['rf']['roc_std']:.3f}      | {cv_results['rf']['pr_mean']:.3f} ± {cv_results['rf']['pr_std']:.3f}      | {cv_results['rf']['f1_mean']:.3f} ± {cv_results['rf']['f1_std']:.3f}")
    print(f"{'LightGBM':<16} | {cv_results['lgbm']['roc_mean']:.3f} ± {cv_results['lgbm']['roc_std']:.3f}      | {cv_results['lgbm']['pr_mean']:.3f} ± {cv_results['lgbm']['pr_std']:.3f}      | {cv_results['lgbm']['f1_mean']:.3f} ± {cv_results['lgbm']['f1_std']:.3f}")
    print("-" * 78)

    return cv_results


def run_catalog_recommender_evaluation(project_root, k=5):
    """
    Evaluates TF-IDF content catalog retrieval coherence across 41 sub-categories
    and 12 broad categories (Table VI).
    """
    print("\n" + "=" * 78)
    print(f" 3. CATALOG RECOMMENDER COHERENCE EVALUATION (K = {k})")
    print("=" * 78)

    catalog_path = os.path.join(project_root, "data", "appliances_catalog.csv")
    df = pd.read_csv(catalog_path)

    # 1. Sub-category evaluation (162 items with valid sub_category)
    sub_df = df.dropna(subset=['sub_category']).copy().reset_index(drop=True)
    sub_df['text'] = sub_df['rental_name'].fillna('') + ' ' + sub_df['description'].fillna('') + ' ' + sub_df['tag'].fillna('')

    tfidf = TfidfVectorizer(ngram_range=(1, 2), stop_words='english', max_features=2500, sublinear_tf=True)
    X_sub = tfidf.fit_transform(sub_df['text'])
    sim_sub = cosine_similarity(X_sub, X_sub)
    np.fill_diagonal(sim_sub, -1)

    prec_sub, rec_sub, hit_sub, rand_sub = [], [], [], []
    rec_set_sub = set()

    for i in range(len(sub_df)):
        target = sub_df.loc[i, 'sub_category']
        peers = set(sub_df[sub_df['sub_category'] == target].index) - {i}
        if not peers:
            continue
        top_k = np.argsort(sim_sub[i])[::-1][:k]
        rec_set_sub.update(top_k)
        matched = len(set(top_k) & peers)
        prec_sub.append(matched / k)
        rec_sub.append(matched / min(k, len(peers)))
        hit_sub.append(1 if matched > 0 else 0)
        rand_sub.append(len(peers) / (len(sub_df) - 1))

    sub_results = {
        "n": len(sub_df),
        "classes": sub_df['sub_category'].nunique(),
        "p_at_k": float(np.mean(prec_sub)),
        "random": float(np.mean(rand_sub)),
        "hit_at_k": float(np.mean(hit_sub)),
        "r_at_k": float(np.mean(rec_sub)),
        "coverage": float(len(rec_set_sub) / len(sub_df))
    }

    # 2. Category level evaluation (164 items, 12 categories)
    cat_df = df.copy().reset_index(drop=True)
    cat_df['text'] = cat_df['rental_name'].fillna('') + ' ' + cat_df['description'].fillna('') + ' ' + cat_df['tag'].fillna('')
    X_cat = tfidf.fit_transform(cat_df['text'])
    sim_cat = cosine_similarity(X_cat, X_cat)
    np.fill_diagonal(sim_cat, -1)

    prec_cat, rec_cat, hit_cat, rand_cat = [], [], [], []
    rec_set_cat = set()

    for i in range(len(cat_df)):
        target = cat_df.loc[i, 'category_id']
        peers = set(cat_df[cat_df['category_id'] == target].index) - {i}
        if not peers:
            continue
        top_k = np.argsort(sim_cat[i])[::-1][:k]
        rec_set_cat.update(top_k)
        matched = len(set(top_k) & peers)
        prec_cat.append(matched / k)
        rec_cat.append(matched / min(k, len(peers)))
        hit_cat.append(1 if matched > 0 else 0)
        rand_cat.append(len(peers) / (len(cat_df) - 1))

    cat_results = {
        "n": len(cat_df),
        "classes": cat_df['category_id'].nunique(),
        "p_at_k": float(np.mean(prec_cat)),
        "random": float(np.mean(rand_cat)),
        "hit_at_k": float(np.mean(hit_cat)),
        "r_at_k": float(np.mean(rec_cat)),
        "coverage": float(len(rec_set_cat) / len(cat_df))
    }

    print(f"\nTABLE VI: Recommendation Semantic Quality on the Catalogue (K = {k})")
    print("-" * 78)
    print(f"{'Level (classes)':<30} | {'P@5':<7} | {'Random':<7} | {'Hit@5':<7} | {'R@5':<7} | {'Coverage':<8}")
    print("-" * 78)
    print(f"Sub-category (n={sub_results['n']}, {sub_results['classes']} classes)   | {sub_results['p_at_k']:.3f}   | {sub_results['random']:.3f}   | {sub_results['hit_at_k']:.3f}   | {sub_results['r_at_k']:.3f}   | {sub_results['coverage']:.3f}")
    print(f"Category (n={cat_results['n']}, {cat_results['classes']} classes)       | {cat_results['p_at_k']:.3f}   | {cat_results['random']:.3f}   | {cat_results['hit_at_k']:.3f}   | {cat_results['r_at_k']:.3f}   | {cat_results['coverage']:.3f}")
    print("-" * 78)

    return {"sub_category": sub_results, "category": cat_results}


def generate_and_save_figures(churn_res, output_dir):
    """
    Generates publication-quality IEEE-standard figures:
    - Fig. 2: ROC and Precision-Recall Curves
    - Fig. 3: LightGBM Confusion Matrix
    - Fig. 4: TreeSHAP Summary Plot (Top Influential Features)
    - Fig. 5: Local TreeSHAP Explanation Waterfall for Highest-Risk Customer
    """
    fig_dir = os.path.join(output_dir, "figures")
    os.makedirs(fig_dir, exist_ok=True)
    print(f"\nGenerating and saving high-resolution figures to: {fig_dir}")

    y_test = churn_res["y_test"]
    rf_prob = churn_res["rf_prob"]
    lgb_prob = churn_res["lgb_prob"]
    lgbm = churn_res["lgbm_model"]
    X_test = churn_res["X_test"]

    # ─────────────────────────────────────────────────────────────────────────
    # Fig. 2: ROC and Precision-Recall Curves
    # ─────────────────────────────────────────────────────────────────────────
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(7.2, 3.4), dpi=300)

    # (a) ROC
    fpr_rf, tpr_rf, _ = roc_curve(y_test, rf_prob)
    fpr_lgb, tpr_lgb, _ = roc_curve(y_test, lgb_prob)
    ax1.plot(fpr_rf, tpr_rf, color="#7f7f7f", lw=1.8, label=f"Random Forest (AUC {roc_auc_score(y_test, rf_prob):.3f})")
    ax1.plot(fpr_lgb, tpr_lgb, color="#1b497a", lw=2.0, label=f"LightGBM (AUC {roc_auc_score(y_test, lgb_prob):.3f})")
    ax1.plot([0, 1], [0, 1], color="#333333", ls=":", lw=1.2)
    ax1.set_xlim([-0.02, 1.02])
    ax1.set_ylim([-0.02, 1.05])
    ax1.set_xlabel("False-positive rate")
    ax1.set_ylabel("True-positive rate")
    ax1.set_title("(a) ROC", fontsize=10, fontweight="bold")
    ax1.grid(True, ls="--", alpha=0.3)
    ax1.legend(loc="lower right", fontsize=8, frameon=False)

    # (b) Precision-Recall
    p_rf, r_rf, _ = precision_recall_curve(y_test, rf_prob)
    p_lgb, r_lgb, _ = precision_recall_curve(y_test, lgb_prob)
    ax2.plot(r_rf, p_rf, color="#7f7f7f", lw=1.8, label=f"Random Forest (PR-AUC {average_precision_score(y_test, rf_prob):.3f})")
    ax2.plot(r_lgb, p_lgb, color="#1b497a", lw=2.0, label=f"LightGBM (PR-AUC {average_precision_score(y_test, lgb_prob):.3f})")
    ax2.set_xlim([-0.02, 1.02])
    ax2.set_ylim([0.15, 1.05])
    ax2.set_xlabel("Recall")
    ax2.set_ylabel("Precision")
    ax2.set_title("(b) Precision-recall", fontsize=10, fontweight="bold")
    ax2.grid(True, ls="--", alpha=0.3)
    ax2.legend(loc="lower left", fontsize=8, frameon=False)

    plt.tight_layout()
    fig2_path = os.path.join(fig_dir, "fig2_roc_pr_curves.png")
    plt.savefig(fig2_path, dpi=300)
    plt.close()
    print(f" [Saved] Fig 2 -> {fig2_path}")

    # ─────────────────────────────────────────────────────────────────────────
    # Fig. 3: Confusion Matrix
    # ─────────────────────────────────────────────────────────────────────────
    cm = churn_res["lgb_cm"]
    fig, ax = plt.subplots(figsize=(3.6, 3.2), dpi=300)
    cax = ax.matshow(cm, cmap="Blues", alpha=0.9)
    for i in range(2):
        for j in range(2):
            val = cm[i, j]
            color = "white" if (i == 0 and j == 0) or (i == 1 and j == 1) else "black"
            ax.text(j, i, str(val), ha="center", va="center", color=color, fontsize=12, fontweight="bold")
    ax.set_xticks([0, 1])
    ax.set_yticks([0, 1])
    ax.set_xticklabels(["Retained", "Churned"])
    ax.set_yticklabels(["Retained", "Churned"])
    ax.xaxis.set_ticks_position('bottom')
    ax.set_xlabel("Predicted", fontweight="bold", labelpad=8)
    ax.set_ylabel("Actual", fontweight="bold")
    ax.set_title("LightGBM", fontsize=11, pad=12)
    plt.tight_layout()
    fig3_path = os.path.join(fig_dir, "fig3_confusion_matrix.png")
    plt.savefig(fig3_path, dpi=300)
    plt.close()
    print(f" [Saved] Fig 3 -> {fig3_path}")

    # ─────────────────────────────────────────────────────────────────────────
    # Fig. 4: TreeSHAP Summary Plot (100 sampled test instances)
    # ─────────────────────────────────────────────────────────────────────────
    print(" Computing TreeSHAP values for summary and local explanations...")
    explainer = shap.TreeExplainer(lgbm)
    X_sample = X_test.iloc[:100]
    shap_values = explainer(X_sample)

    fig, ax = plt.subplots(figsize=(5.2, 5.8), dpi=300)
    shap.plots.beeswarm(shap_values, max_display=15, show=False)
    plt.title("TreeSHAP Feature Attributions (100 Test Samples)", fontsize=10, pad=10)
    plt.xlabel("Shapley value (log-odds margin contribution)")
    plt.tight_layout()
    fig4_path = os.path.join(fig_dir, "fig4_shap_summary.png")
    plt.savefig(fig4_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f" [Saved] Fig 4 -> {fig4_path}")

    # ─────────────────────────────────────────────────────────────────────────
    # Fig. 5: Local Explanation for Highest-Risk Customer
    # ─────────────────────────────────────────────────────────────────────────
    highest_risk_idx = int(np.argmax(lgb_prob))
    highest_risk_customer = X_test.iloc[highest_risk_idx:highest_risk_idx+1]
    local_shap = explainer(highest_risk_customer)

    # Extract feature contributions
    feature_names = X_test.columns.tolist()
    vals = local_shap.values[0]
    cust_data = highest_risk_customer.iloc[0]

    # Sort by absolute SHAP contribution
    sort_idx = np.argsort(np.abs(vals))[::-1][:10]
    sorted_features = [f"{feature_names[i]} = {cust_data.iloc[i]}" for i in sort_idx][::-1]
    sorted_vals = [vals[i] for i in sort_idx][::-1]

    fig, ax = plt.subplots(figsize=(5.4, 5.0), dpi=300)
    colors = ['#c85a17' if v > 0 else '#2b5c8f' for v in sorted_vals]
    ax.barh(sorted_features, sorted_vals, color=colors, height=0.65)
    ax.axvline(0, color="black", lw=1)
    base_val = float(local_shap.base_values[0])
    out_val = base_val + float(np.sum(vals))
    prob_val = float(lgb_prob[highest_risk_idx])
    ax.set_xlabel(f"Shapley log-odds contribution (base: {base_val:.2f}, margin: {out_val:.2f}, prob: {prob_val:.3f})")
    ax.set_title("LightGBM Local Risk Drivers (Highest-Risk Tenant)", fontsize=10, pad=10)
    ax.grid(True, ls="--", alpha=0.3, axis='x')
    plt.tight_layout()
    fig5_path = os.path.join(fig_dir, "fig5_local_shap_waterfall.png")
    plt.savefig(fig5_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f" [Saved] Fig 5 -> {fig5_path}")

    return {
        "fig2": fig2_path,
        "fig3": fig3_path,
        "fig4": fig4_path,
        "fig5": fig5_path
    }


def main():
    args = parse_args()
    project_root = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(project_root, args.output_dir)
    os.makedirs(output_dir, exist_ok=True)

    print("=" * 78)
    print("   RENTORA: SCIENTIFIC REPRODUCIBILITY & EXPERIMENTAL PIPELINE      ")
    print(f"   Random Seed: {args.seed} | Environment: Python {sys.version.split()[0]}")
    print("=" * 78)

    # 1. Load Data
    _, X, y, _ = load_churn_data(project_root)

    # 2. Benchmarks (Table IV)
    churn_res = run_churn_benchmarks(X, y, seed=args.seed)

    # 3. 5-Fold Stratified Cross-Validation (Table V)
    cv_res = run_cross_validation(X, y, seed=args.seed)

    # 4. Catalog Recommender Coherence (Table VI)
    rec_res = run_catalog_recommender_evaluation(project_root, k=5)

    # 5. Generate Figures
    figs = generate_and_save_figures(churn_res, output_dir)

    # 6. Save JSON Summary
    summary = {
        "seed": args.seed,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "table_iv_test_split": {
            "random_forest": churn_res["rf_metrics"],
            "lightgbm": churn_res["lgb_metrics"]
        },
        "table_v_cross_validation": cv_res,
        "table_vi_catalog_recommender": rec_res,
        "figures": figs
    }

    results_json_path = os.path.join(output_dir, "results.json")
    with open(results_json_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"\n[Success] Complete empirical audit and experiments logged to: {results_json_path}")


if __name__ == "__main__":
    main()

