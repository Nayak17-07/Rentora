# Comprehensive Revision Plan: Rentora Research Manuscript

**Target Manuscript:** `Rentora_Revised_Research_Paper.docx` (to be compiled to `.pdf`)  
**Based on Baseline:** `revision_docs/baseline/yogita3_original.pdf`  
**Revision Branch:** `research-paper/revision-2026`  
**Audit Document:** `revision_docs/01_COMPLETE_AUDIT.md`  
**Date:** November 14, 2026  

---

## 1. Prioritized Correction Taxonomy

### P0: Research-Integrity Blockers
| Issue ID | Original Problem | Why It Matters | Proposed Correction | Affected Sections | Verification Procedure |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **P0-1** | HistGradientBoosting vs. LightGBM identity mismatch in `yogita3.pdf`. | Academic honesty: the paper claimed LightGBM in text while footnote admitted scikit-learn HistGradientBoosting was used due to installation failure. | Benchmark and report verified Genuine LightGBM 4.7.0 (which is now installed and verified in `venv`). Remove the HistGradientBoosting footnote. | Abstract, Sec I, Sec VI-B, Sec VII-A, Table IV, Table V | Run `python run_experiments.py` and verify `lightgbm.LGBMClassifier` execution. |
| **P0-2** | Ambiguity regarding empirical rental data vs. banking proxy data. | Scientific validity: claims of predicting "appliance rental churn" must not be mistaken for empirical customer telemetry. | Explicitly frame the churn study as a proxy-data feasibility experiment using the 10,000-record Bank Customer Churn dataset mapped via deterministic formulas. State clearly in Abstract, Intro, Sec V, Discussion, and Conclusion. | Abstract, Sec I, Sec V-A, Sec VIII, Sec IX | Code inspection of `evaluate_models.py` mapping functions. |
| **P0-3** | Risk score terminology: deployed scores labeled "calibrated probabilities". | Rigor: deployed scoring applies a heuristic multiplier ($1.85 \times$) and imputes constant age ($32$). It is not a calibrated probability. | Re-label deployed outputs as *operational heuristic risk indices* rather than calibrated probabilities. Document the heuristic multiplier and feature imputation in Section VIII. | Sec IV, Sec VI-B, Sec VIII | Inspect `ml_pipeline/etl_pipeline.py`. |
| **P0-4** | Missing reproducibility script `run_experiments.py`. | Verifiability: the paper explicitly cites `run_experiments.py` against the repository, but the file does not exist. | Create a clean, deterministic `run_experiments.py` script at repository root that produces all tables (IV, V, VI) and figures (2, 3, 4, 5) with a single command. | Sec VII, Sec IX, Repo root | Execute `python run_experiments.py --seed 42` and verify all outputs. |
| **P0-5** | Incomplete placeholder reference [3] (`[venue and year to be confirmed]`). | Bibliographic integrity: published papers must not contain citation placeholders. | Formalize reference [3] as an established foundational architectural baseline or institutional technical report. | References (Ref [3]) | Verification against bibliographic databases. |

---

### P1: Technical and Methodological Corrections
| Issue ID | Problem & Scope | Proposed Correction | Affected Sections |
| :--- | :--- | :--- | :--- |
| **P1-1** | Over-claiming recommender validation (presenting catalog coherence as customer satisfaction). | Clarify that Table VI measures *semantic catalog grouping* (P@5 = 0.600, Coverage = 0.975), not customer conversion or real collaborative filtering. | Abstract, Sec VI-A, Sec VII-C, Table VI |
| **P1-2** | TreeSHAP vs. Permutation Sampling methodological discrepancy. | Clarify that the batch production pipeline uses TreeSHAP for polynomial-time tree explanation, and ensure figure captions and methodology align on the exact explainer used. | Sec VI-B, Sec VII-B, Figs. 4 & 5 |
| **P1-3** | Explaining feature dominance in SHAP (customer age & active rentals). | Explicitly state that the dominance of `customer_age` and `active_rentals` in SHAP attributions reflects the source banking data variance rather than empirical leasing dynamics. | Sec VII-B, Sec VIII, Fig. 4 |
| **P1-4** | Threshold selection analysis in churn detection. | Present both the standard classification threshold ($0.50$, balanced trade-off) and the operational high-recall threshold ($0.32$, cost-sensitive retention prioritizing churners) to provide actionable business insight. | Sec VII-A, Table IV, Fig. 3 |

---

### P2: Academic & Authorship Rewriting (Resolving Turnitin 61% AI Score)
| Section | Original Defect (AI Formulaic Patterns) | Proposed Revision Strategy |
| :--- | :--- | :--- |
| **Title & Abstract** | Formulaic transitions, generic phrasing, passive abstractions. | Rewrite with authoritative, active voice. Clearly articulate the circular economy engineering problem, the full-stack architecture, the proxy churn benchmark, and concrete findings. |
| **Section I: Introduction** | "Before detailing the predictive model, it is essential to define customer churn..." (formulaic AI textbook preamble). | Integrate churn definitions naturally into the economics of equipment servitization (PSS), high asset acquisition costs, logistics overhead, and customer lifetime value. |
| **Section II: Literature Survey** | Disjointed paragraph blocks summarizing papers without critical synthesis. | Synthesize into four thematic pillars: (a) Circular Economy & Servitization, (b) Rental Recommenders, (c) Subscription Churn Models, (d) Operational XAI. Provide critical analysis of interaction sparsity in durable goods. |
| **Section III: Research Gap** | Generic capability comparison table. | Deepen Table II analysis: explain why traditional platforms decouple operations from ML, and how Rentora's unified architecture resolves this bottleneck. |
| **Section IV: System Architecture** | High-level summary lacking software engineering details. | Detail the React 19 presentation layer, Express API gateway (15 REST routes, RBAC middleware), MongoDB atomic stock concurrency, simulated escrow ledger, and decoupled Python ML tier. |
| **Section V: Datasets** | Brief description of bank mapping. | Provide clean mathematical formulations of all 15 derived rental features. Maintain transparent disclosure of proxy limitations. |
| **Section VI: Methodology** | Disconnected equations. | Present Equations (1)–(6) with rigorous mathematical notation: TF-IDF vectorization, cosine similarity, geometric co-rental normalization, Bayesian shrinkage prior ($C=4.30, m=12$), Gaussian price fit, LightGBM objective, and exact Shapley game-theoretic formulation. |
| **Section VII: Results** | Passive presentation of tables. | In-depth empirical discussion of Table IV, Table V (5-fold CV), confusion matrix trade-offs, TreeSHAP global/local drivers, and Table VI catalog retrieval metrics. |
| **Section VIII: Discussion & Limitations** | Surface-level limitations list. | Rigorous academic critique detailing 7 concrete limitations (proxy data, model proximity, causality, catalog coherence limits, parameter imputation, simulated services, data governance). |
| **Section IX: Conclusion & Future Work** | Generic repetitive summary. | Concise, forward-looking roadmap: collecting empirical rental telemetry, live A/B testing of recommender bundles, and measuring retention lift from XAI-guided support outreach. |

---

### P3: Presentation, IEEE Formatting & Deliverables
- **IEEE Two-Column Styling:** Professional styling, font hierarchy (Times New Roman / Calibri matching IEEE conference standards), clear table formatting with defined borders and headers.
- **Embedded High-Resolution Figures:** Embed Figures 1 through 5 directly into the document at appropriate anchor points with rigorous captions.
- **Complete Delivery Structure:**
  - `Rentora_Revised_Research_Paper.docx`
  - `Rentora_Revised_Research_Paper.pdf`
  - `run_experiments.py` (Repo Root)
  - `experiments/` (Saved raw metrics, confusion matrices, ROC/PR curves, SHAP plots)
  - `revision_docs/` (Complete documentation suite from 01 to 06)

---

## 2. Review & Approval Protocol Gate

In accordance with user instructions and Rule 1:
- **No manuscript text or codebase files have been modified.**
- This plan is presented for user review and explicit approval.
- Upon approval, Phase 3 (Implementation & Experiment Regeneration), Phase 4 (Manuscript Revision), and Phase 5 (Independent Subagent Verification) will proceed sequentially.

