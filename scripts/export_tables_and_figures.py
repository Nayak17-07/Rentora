import os
import shutil
import pandas as pd

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(PROJECT_ROOT, "Rentora_Paper_Tables_and_Figures")
os.makedirs(OUT_DIR, exist_ok=True)

# 1. Copy Figures
fig_sources = {
    "Fig1_Rentora_System_Architecture.png": os.path.join(PROJECT_ROOT, "revision_docs", "baseline", "experiment_outputs", "image1.png"),
    "Fig2_ROC_and_PR_Curves.png": os.path.join(PROJECT_ROOT, "experiments", "figures", "fig2_roc_pr_curves.png"),
    "Fig3_LightGBM_Confusion_Matrix.png": os.path.join(PROJECT_ROOT, "experiments", "figures", "fig3_confusion_matrix.png"),
    "Fig4_TreeSHAP_Global_Summary_15_Features.png": os.path.join(PROJECT_ROOT, "experiments", "figures", "fig4_shap_summary.png"),
    "Fig5_TreeSHAP_Local_Waterfall_Highest_Risk.png": os.path.join(PROJECT_ROOT, "experiments", "figures", "fig5_local_shap_waterfall.png"),
}

for dest_name, src_path in fig_sources.items():
    if os.path.exists(src_path):
        dest_in_folder = os.path.join(OUT_DIR, dest_name)
        dest_in_root = os.path.join(PROJECT_ROOT, dest_name)
        shutil.copy(src_path, dest_in_folder)
        shutil.copy(src_path, dest_in_root)
        print(f"[Figure] Copied {dest_name}")
    else:
        print(f"[Warning] Figure source not found: {src_path}")

# 2. Define all Manuscript Tables
tables_data = {
    "Table_I_Feature_Comparison": pd.DataFrame([
        ["User Roles & Interfaces", "Single user view with basic checkout", "Three dedicated portals: Customer, Appliance Owner, Admin"],
        ["Customer Identity Checks (KYC)", "Manual photo upload", "Client-side WebAssembly OCR (Tesseract.js) with local masking"],
        ["Rental Billing & Deposit Ledger", "Basic payment mock script", "Software escrow ledger with optional damage protection waiver"],
        ["Inventory Concurrency Handling", "Standard read-then-write", "MongoDB atomic conditional decrements preventing overselling"],
        ["Live Order Status Tracking", "Manual database polling", "Real-time bi-directional WebSockets via Socket.io"],
        ["Catalog Recommendations", "None (static lists)", "Hybrid: TF-IDF text matching, co-rental graph, Bayesian ratings, budget fit"],
        ["Customer Churn-Risk Prediction", "None", "Genuine LightGBM ensemble with 5-fold CV & significance tests"],
        ["Model Interpretability (XAI)", "None", "Local and global TreeSHAP attributions in raw log-odds margins"]
    ], columns=["Subsystem / Capability", "Baseline Framework [3]", "Rentora (Our Work)"]),

    "Table_II_Literature_Comparison": pd.DataFrame([
        ["Online Booking and Checkout", "Yes", "Partial", "No", "Yes"],
        ["Personalized Recommender", "No", "Yes", "No", "Yes"],
        ["Machine Learning Churn Scoring", "No", "No", "Yes", "Yes"],
        ["Feature-Level Explainability (XAI)", "No", "Partial", "Partial", "Yes"],
        ["New User / Item Cold-Start", "No", "Partial", "No", "Yes"],
        ["All Integrated in One System", "No", "No", "No", "Yes"]
    ], columns=["Platform Capability", "Base Platform [3]", "Recommender Study [4]", "Churn Study [5]", "Rentora (Our Work)"]),

    "Table_III_Feature_Specs": pd.DataFrame([
        ["tenure_months", "Tenure, Age", "(Tenure * 12 + Age % 12).clip(1, 120)", "1–120 mo", "Total relationship duration in months (clipped to [1, 120])"],
        ["monthly_spend", "Balance, EstimatedSalary", "Balance/100 + EstimatedSalary/500", "₹2.25–₹5,349.27", "Estimated monthly rental subscription expenditure"],
        ["active_rentals", "NumOfProducts", "Direct copy of NumOfProducts", "1–4 units", "Number of appliance units currently on active lease"],
        ["credit_score", "CreditScore", "Direct copy of CreditScore", "350–850", "Financial creditworthiness indicator"],
        ["customer_age", "Age", "Direct copy of Age", "18–92 yrs", "Customer age in completed years"],
        ["is_active_member", "IsActiveMember", "Direct copy of IsActiveMember", "{0, 1}", "Active platform engagement flag (1 = active member)"],
        ["late_payments", "NumOfProducts, HasCrCard", "NumOfProducts * (1 - HasCrCard) + (10 - Tenure)/3", "0–5 events", "Count of late rental payments (integer clipped)"],
        ["early_returns", "HasCrCard, IsActiveMember", "(1 - HasCrCard) + (1 - IsActiveMember)", "0–2 events", "Instances of early appliance return before lease maturity"],
        ["cart_abandonment", "NumOfProducts, IsActiveMember", "2*(1 - IsActiveMember) + 2*I(NumOfProducts == 1)", "{0, 2, 4}", "Browse-and-abandon events based on inactivity and single rental"],
        ["days_inactive", "Tenure, IsActiveMember", "(10 - Tenure)*3.5 + (1 - IsActiveMember)*20", "0.0–55.0 days", "Days elapsed since the customer's last platform interaction"],
        ["avg_rating", "CreditScore, HasCrCard", "1.0 + (CreditScore/850)*3.0 + HasCrCard*1.0", "2.60–5.00 ★", "Average satisfaction rating given by customer"],
        ["spend_per_rental", "monthly_spend, active_rentals", "monthly_spend / max(active_rentals, 1)", "₹1.07–₹4,862.97", "Average monthly expenditure per active appliance unit"],
        ["delinquency_rate", "Derived", "late_payments / max(active_rentals, 1)", "0.00–2.50", "Payment delinquency frequency per active rental"],
        ["inactivity_rate", "Derived", "days_inactive / (tenure_months + 1)", "0.00–1.77", "Ratio of recent inactive days to overall account tenure"],
        ["engagement_score", "avg_rating, days_inactive", "avg_rating * (1.0 - clip(days_inactive/90, 0, 1))", "1.011–5.000", "Composite customer platform engagement and satisfaction index"]
    ], columns=["Feature Name", "Source Bank Feature", "Transformation / Mapping Formula", "Empirical Range", "Operational Interpretation"]),

    "Table_IV_Churn_Test_Split": pd.DataFrame([
        ["Logistic Regression", 0.733, 0.411, 0.722, 0.524, 0.822, 0.596, 0.170],
        ["Random Forest Baseline", 0.852, 0.741, 0.415, 0.532, 0.819, 0.643, 0.114],
        ["Genuine LightGBM (Ours)", 0.860, 0.727, 0.496, 0.590, 0.833, 0.666, 0.112]
    ], columns=["Model Architecture", "Accuracy", "Precision", "Recall", "F1-Score", "ROC-AUC", "PR-AUC", "Brier Score"]),

    "Table_V_Stratified_5Fold_CV": pd.DataFrame([
        ["Logistic Regression", "0.816 ± 0.011", "0.588 ± 0.024", "0.538 ± 0.016", "0.173 ± 0.005", "t = 21.027, p < 0.0001***"],
        ["Random Forest Baseline", "0.824 ± 0.011", "0.643 ± 0.018", "0.535 ± 0.012", "0.113 ± 0.003", "t = 11.971, p = 0.0003***"],
        ["Genuine LightGBM (Ours)", "0.833 ± 0.012", "0.661 ± 0.018", "0.572 ± 0.017", "0.112 ± 0.003", "— (Reference)"]
    ], columns=["Model Architecture", "ROC-AUC (Mean ± SD)", "PR-AUC (Mean ± SD)", "F1-Score (Mean ± SD)", "Brier Score", "Paired t-test vs. LGBM"]),

    "Table_VI_Churn_Ablation": pd.DataFrame([
        ["Full Feature Set (All 15 Features)", 15, "0.833 ± 0.012", "0.661 ± 0.018", "0.572 ± 0.017"],
        ["Demographics Only (Age, Tenure)", 2, "0.740 ± 0.008", "0.439 ± 0.013", "0.430 ± 0.023"],
        ["Financial & Credit Only", 2, "0.517 ± 0.009", "0.226 ± 0.008", "0.029 ± 0.009"],
        ["Operational Behavioral Only (9 Features)", 9, "0.748 ± 0.007", "0.487 ± 0.009", "0.326 ± 0.019"],
        ["Ablated Top Proxies (No Age, No Active Units)", 13, "0.751 ± 0.008", "0.494 ± 0.007", "0.326 ± 0.018"]
    ], columns=["Feature Configuration", "Num Features", "ROC-AUC (Mean ± SD)", "PR-AUC (Mean ± SD)", "F1-Score (Mean ± SD)"]),

    "Table_VII_Recommender_Baselines": pd.DataFrame([
        ["Random Baseline", 0.036, 0.023, 0.035, 0.173, 0.170, 0.162],
        ["Popularity Baseline", 0.044, 0.031, 0.041, 0.222, 0.164, 0.174],
        ["Content-Only (TF-IDF)", 0.527, 0.460, 0.598, 0.858, 0.697, 0.721],
        ["Full Hybrid (Rentora)", 0.412, 0.317, 0.450, 0.778, 0.752, 0.790]
    ], columns=["Method Architecture", "Sub-P@5", "Sub-R@5", "Sub-NDCG@5", "Hit Rate@5", "Room-P@5", "Room-NDCG@5"]),

    "Table_VIII_Recommender_Ablation": pd.DataFrame([
        ["Full Hybrid (Rentora)", 0.752, 0.134, 0.790, 0.979],
        ["w/o Room Synergy (s = 0)", 0.314, 0.057, 0.338, 0.772],
        ["w/o Rating Prior (q = 0)", 0.796, 0.143, 0.833, 0.966],
        ["w/o Eco-Bonus (e = 0)", 0.988, 0.177, 0.988, 1.000],
        ["w/o Budget Fit (pi = 0)", 0.646, 0.112, 0.687, 0.910],
        ["Pure Content-Only (TF-IDF)", 0.697, 0.124, 0.721, 0.959]
    ], columns=["Component Configuration", "Room-P@5", "Room-R@5", "Room-NDCG@5", "Room-Hit Rate@5"])
}

for name, df_t in tables_data.items():
    csv_path = os.path.join(OUT_DIR, f"{name}.csv")
    df_t.to_csv(csv_path, index=False)
    print(f"[Table CSV] Saved {name}.csv")

print("[Success] All tables and figures exported to Rentora_Paper_Tables_and_Figures/")
