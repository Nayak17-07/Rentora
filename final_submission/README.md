# Rentora Platform: Scientific Research Reproducibility Suite

**Paper Title:** AI-Enhanced Household Appliance Rental Management: Personalized Recommendation and Customer Churn-Risk Prediction - A Case Study on the Rentora Platform  
**Authors:** Dr. Patil Yogita Dattatraya (Mentor), Mukesh Naik, Abhinav Reddy Muthireddy, Kolloju Raghava, Md Rehal, Siddartha  
**Affiliation:** Department of Computer Science & Engineering (AI & ML), Keshav Memorial Institute of Technology (KMIT), Hyderabad, India  
**Repository:** `https://github.com/Nayak17-07/Rentora`  

---

## 1. Quick Reproduction (Single Command)

To reproduce all empirical tables (Tables IV, V, VI) and all publication figures (Figures 2, 3, 4, 5) with a fixed deterministic random seed (`seed = 42`):

```bash
# Ensure Python 3.12+ virtual environment is active
python run_experiments.py --seed 42 --output-dir experiments
```

### Generated Outputs
- **Table IV (Held-Out Test Split Classification):** Printed to terminal and saved in `experiments/results.json`.
- **Table V (5-Fold Stratified Cross-Validation):** Evaluated across 10,000 instances; printed to terminal.
- **Table VI (Catalog Recommender Semantic Coherence):** Evaluated on 164 catalog items across 41 sub-categories and 12 categories.
- **Figure 2 (ROC & PR Curves):** `experiments/figures/fig2_roc_pr_curves.png`
- **Figure 3 (Confusion Matrix Heatmap):** `experiments/figures/fig3_confusion_matrix.png`
- **Figure 4 (TreeSHAP Summary Plot):** `experiments/figures/fig4_shap_summary.png`
- **Figure 5 (Local TreeSHAP Waterfall Explanation):** `experiments/figures/fig5_local_shap_waterfall.png`

---

## 2. Directory Structure of Deliverables

```
final_submission/
├── Rentora_Revised_Research_Paper.docx    # Formatted IEEE-compliant manuscript
├── Rentora_Revised_Research_Paper.pdf     # Compiled publication-ready PDF
├── README.md                              # This reproducibility guide
├── revision_docs/
│   ├── 01_COMPLETE_AUDIT.md               # Complete repository and empirical audit
│   ├── 02_REVISION_PLAN.md                # Prioritized P0-P3 revision taxonomy
│   ├── 03_EXPERIMENT_LOG.md               # Raw experiment logs, seeds, and metrics
│   ├── 04_INDEPENDENT_VERIFICATION.md     # Independent subagent verification report
│   ├── 05_CHANGELOG.md                    # Detailed section-by-section diff log
│   └── 06_REFERENCE_VERIFICATION.md       # Canonical verification of all 16 references
└── experiments/
    ├── results.json                       # Machine-readable JSON summary of metrics
    └── figures/                           # 300 DPI publication figures
        ├── fig2_roc_pr_curves.png
        ├── fig3_confusion_matrix.png
        ├── fig4_shap_summary.png
        └── fig5_local_shap_waterfall.png
```

