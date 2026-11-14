# Empirical Experiment Log: Rentora Machine Learning & Recommender Pipeline

**Date of Execution:** November 14, 2026  
**Script Executed:** `run_experiments.py --seed 42`  
**Execution Environment:**
- Python: 3.14.8
- scikit-learn: 1.9.1
- LightGBM: 4.7.0
- SHAP: 0.54.1
- NumPy: 2.5.4
- Pandas: 3.0.6
- Matplotlib: 3.11.2
- Random State / Seed: 42 (Enforcing deterministic reproducibility)

---

## 1. Dataset Provenance & Split Specifications

- **Source Corpus:** Public Bank Customer Churn benchmark dataset (10,000 instances, 20.37% churn label proportion).
- **Domain Mapping:** Deterministically mapped into 15 rental-domain features via `ml_pipeline/evaluate_models.py`.
- **Partition:** 80/20 Stratified Train/Test split:
  - Training Partition: 8,000 customers (6,370 retained, 1,630 churned).
  - Test Partition: 2,000 customers (1,593 retained, 407 churned).

---

## 2. Test Split Classification Performance (Table IV)

Decision Threshold: 0.50 (Standard Unbiased Classification Boundary)

| Model Name | Estimator Specifications | Accuracy | Precision (Churn) | Recall (Churn) | F1-Score | ROC-AUC | PR-AUC | Latency |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Random Forest Baseline** | `RandomForestClassifier(n_estimators=250, max_depth=12, random_state=42)` | 0.852 | 0.741 | 0.415 | 0.532 | 0.819 | 0.643 | 0.91 s |
| **Genuine LightGBM** | `LGBMClassifier(n_estimators=300, max_depth=4, num_leaves=20, lr=0.04, scale_pos_weight=1.4, colsample=0.85, subsample=0.85, reg=0.1)` | **0.860** | 0.727 | **0.496** | **0.590** | **0.833** | **0.666** | **0.28 s** |

### LightGBM Confusion Matrix (N = 2,000 Test Customers)
- True Negative (TN): 1,517 (Retained customers correctly identified)
- False Positive (FP): 76 (False alarms / unnecessary retention calls)
- False Negative (FN): 205 (Churners missed)
- True Positive (TP): 202 (Churners caught, 49.6% recall)

---

## 3. Five-Fold Stratified Cross-Validation (Table V)

Evaluated across the full 10,000-instance corpus ($K = 5$, stratified folds, seed 42):

| Model Name | ROC-AUC (Mean ± SD) | PR-AUC (Mean ± SD) | F1-Score (Mean ± SD) |
| :--- | :--- | :--- | :--- |
| **Random Forest Baseline** | $0.824 \pm 0.011$ | $0.643 \pm 0.018$ | $0.535 \pm 0.012$ |
| **Genuine LightGBM** | **$0.833 \pm 0.012$** | **$0.661 \pm 0.018$** | **$0.572 \pm 0.017$** |

*Analysis:* LightGBM consistently leads Random Forest across all folds by approximately 0.01 in ROC-AUC, 0.018 in PR-AUC, and 0.037 in F1-score.

---

## 4. Recommender Catalog Semantic Coherence Evaluation (Table VI)

Evaluated on `data/appliances_catalog.csv` (164 items, 12 categories, 41 sub-categories) at retrieval depth $K = 5$:

| Semantic Granularity | Sample Size ($N$) | Distinct Classes | Precision@5 ($P@5$) | Random Baseline | Hit Rate@5 ($Hit@5$) | Recall@5 ($R@5$) | Catalog Coverage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Sub-Category Level** | 162 | 41 | 0.593 | 0.042 | 0.965 | 0.659 | 0.963 |
| **Category Level** | 164 | 12 | 0.604 | 0.207 | 0.921 | 0.633 | 0.970 |

*Analysis:* At the sub-category level, TF-IDF retrieves items from the exact same sub-category with 59.3% precision compared to a 4.2% random chance baseline (a $14.1\times$ lift). 96.5% of queries retrieve at least one valid peer in the top 5, with 96.3% catalog coverage.

---

## 5. Generated Publication Figures

All figures were generated at 300 DPI publication resolution:
- **Figure 2:** `experiments/figures/fig2_roc_pr_curves.png` (Dual-panel ROC and Precision-Recall comparison).
- **Figure 3:** `experiments/figures/fig3_confusion_matrix.png` (LightGBM confusion matrix heatmap).
- **Figure 4:** `experiments/figures/fig4_shap_summary.png` (TreeSHAP global beeswarm plot of feature impact).
- **Figure 5:** `experiments/figures/fig5_local_shap_waterfall.png` (TreeSHAP local feature attribution bar plot for highest-risk tenant).
