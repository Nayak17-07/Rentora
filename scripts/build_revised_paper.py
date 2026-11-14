import os
import sys
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tc_pr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tc_mar.append(node)
    tc_pr.append(tc_mar)

def set_table_borders(table, color="D3D3D3", sz="4", val="single"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'  <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:left w:val="none"/>'
        f'  <w:right w:val="none"/>'
        f'  <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:insideV w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def build_manuscript(output_docx_path):
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    fig_dir = os.path.join(project_root, "experiments", "figures")
    baseline_fig_dir = os.path.join(project_root, "revision_docs", "baseline", "experiment_outputs")

    doc = Document()

    # Page setup: Standard Letter, 0.75 in margins
    for section in doc.sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)

    # ─────────────────────────────────────────────────────────────────────────
    # TITLE & AUTHORS
    # ─────────────────────────────────────────────────────────────────────────
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(4)
    run_title = p_title.add_run("AI-Enhanced Household Appliance Rental Management:\nPersonalized Recommendation and Customer Churn-Risk Prediction")
    run_title.font.name = "Times New Roman"
    run_title.font.size = Pt(18)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(27, 54, 93)

    p_subtitle = doc.add_paragraph()
    p_subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_subtitle.paragraph_format.space_after = Pt(14)
    run_sub = p_subtitle.add_run("A Case Study on the Rentora Platform")
    run_sub.font.name = "Times New Roman"
    run_sub.font.size = Pt(12)
    run_sub.font.italic = True
    run_sub.font.color.rgb = RGBColor(80, 80, 80)

    # Authors Table (3 columns x 2 rows)
    authors_data = [
        [
            ("Dr. Patil Yogita Dattatraya (Mentor)", "Dept. of CSE (AI & ML)\nKeshav Memorial Institute of Tech.\nHyderabad, India\nagyogita@gmail.com"),
            ("Mukesh Naik", "Dept. of CSE (AI & ML)\nKeshav Memorial Institute of Tech.\nHyderabad, India\nnaik170707@gmail.com"),
            ("Abhinav Reddy Muthireddy", "Dept. of CSE (AI & ML)\nKeshav Memorial Institute of Tech.\nHyderabad, India\nmuthireddyabhi@gmail.com")
        ],
        [
            ("Kolloju Raghava", "Dept. of CSE (AI & ML)\nKeshav Memorial Institute of Tech.\nHyderabad, India\nkollojuraghava414@gmail.com"),
            ("Md Rehal", "Dept. of CSE (AI & ML)\nKeshav Memorial Institute of Tech.\nHyderabad, India\nrehalmd300@gmail.com"),
            ("Siddartha", "Dept. of CSE (AI & ML)\nKeshav Memorial Institute of Tech.\nHyderabad, India\nsiddartha3352@gmail.com")
        ]
    ]

    t_auth = doc.add_table(rows=2, cols=3)
    t_auth.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_auth.autofit = False

    for r_idx, row in enumerate(authors_data):
        for c_idx, (name, affil) in enumerate(row):
            cell = t_auth.cell(r_idx, c_idx)
            cell.width = Inches(2.3)
            set_cell_margins(cell, 40, 40, 60, 60)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.05
            
            r_name = p.add_run(name + "\n")
            r_name.font.name = "Times New Roman"
            r_name.font.size = Pt(9.5)
            r_name.font.bold = True
            r_name.font.color.rgb = RGBColor(27, 54, 93)

            r_affil = p.add_run(affil)
            r_affil.font.name = "Times New Roman"
            r_affil.font.size = Pt(8)
            r_affil.font.color.rgb = RGBColor(90, 90, 90)

    # Separator
    p_sep = doc.add_paragraph()
    p_sep.paragraph_format.space_before = Pt(8)
    p_sep.paragraph_format.space_after = Pt(8)

    # ─────────────────────────────────────────────────────────────────────────
    # ABSTRACT & INDEX TERMS
    # ─────────────────────────────────────────────────────────────────────────
    p_abs = doc.add_paragraph()
    p_abs.paragraph_format.space_after = Pt(4)
    p_abs.paragraph_format.line_spacing = 1.15
    r_abs_lbl = p_abs.add_run("Abstract—")
    r_abs_lbl.font.name = "Times New Roman"
    r_abs_lbl.font.size = Pt(9)
    r_abs_lbl.font.bold = True
    r_abs_lbl.font.italic = True

    r_abs_text = p_abs.add_run(
        "Online household appliance leasing systems represent an essential Product-Service System (PSS) within the circular economy, "
        "lowering upfront consumer capital barriers while maximizing manufactured durable asset utilization. However, successful operationalization "
        "requires resolving two pervasive operational challenges: helping customers discover contextually appropriate appliances without exhaustive catalog browsing, "
        "and proactively detecting early subscriber attrition before contractual lease termination. This paper presents Rentora, an end-to-end multi-tier appliance rental "
        "platform integrating personalized discovery and explainable churn-risk intelligence into transactional workflows. The software architecture comprises a React 19 "
        "single-page application, an Express.js API gateway with role-based access control (RBAC), a concurrent MongoDB data store with atomic stock reservations, and a "
        "decoupled Python machine learning batch tier. Catalog recommendations are synthesized via term frequency–inverse document frequency (TF-IDF) text representations "
        "with cosine similarity, augmented by co-rental affinity mining, Bayesian rating shrinkage (prior C=4.30, m=12), eco-tier energy incentives, and Gaussian price-budget alignment. "
        "Customer churn risk is evaluated using genuine LightGBM gradient boosting benchmarked against a Random Forest baseline, explained locally and globally via TreeSHAP. "
        "To evaluate pipeline scalability and latency, the machine learning workflow is benchmarked on an engineered proxy corpus of 10,000 records derived deterministically from public "
        "customer banking churn data. In held-out test split evaluations (N=2,000), LightGBM achieves an ROC-AUC of 0.833 and an F1-score of 0.590 (Recall: 0.496, Precision: 0.727), "
        "demonstrating narrow superiority over Random Forest (ROC-AUC: 0.819, F1: 0.532). Five-fold stratified cross-validation confirms consistent performance (0.833 ± 0.012 vs. 0.824 ± 0.011). "
        "Recommender catalog evaluation on 164 appliances confirms strong intra-catalog sub-category coherence (P@5 = 0.593 vs. 0.042 random baseline, 96.3% coverage). "
        "All reported empirical outputs are fully reproducible via the repository's open benchmark suite, demonstrating the engineering viability of decoupled intelligence in circular durable-goods leasing."
    )
    r_abs_text.font.name = "Times New Roman"
    r_abs_text.font.size = Pt(9)
    r_abs_text.font.bold = True

    p_idx = doc.add_paragraph()
    p_idx.paragraph_format.space_after = Pt(14)
    r_idx_lbl = p_idx.add_run("Index Terms—")
    r_idx_lbl.font.name = "Times New Roman"
    r_idx_lbl.font.size = Pt(9)
    r_idx_lbl.font.bold = True
    r_idx_lbl.font.italic = True
    r_idx_txt = p_idx.add_run("household appliance rental, recommender systems, term frequency–inverse document frequency, cosine similarity, LightGBM, Random Forest, Shapley values, customer churn prediction, product-service systems.")
    r_idx_txt.font.name = "Times New Roman"
    r_idx_txt.font.size = Pt(9)
    r_idx_txt.font.italic = True

    def add_sec_heading(title):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        r = p.add_run(title)
        r.font.name = "Times New Roman"
        r.font.size = Pt(10.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor(27, 54, 93)
        return p

    def add_subsec_heading(title):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(title)
        r.font.name = "Times New Roman"
        r.font.size = Pt(9.5)
        r.font.bold = True
        r.font.italic = True
        r.font.color.rgb = RGBColor(40, 40, 40)
        return p

    def add_body_p(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        r = p.add_run(text)
        r.font.name = "Times New Roman"
        r.font.size = Pt(9.5)
        return p

    def add_fig_caption(num, caption):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(3)
        p.paragraph_format.space_after = Pt(10)
        r_lbl = p.add_run(f"Fig. {num}. ")
        r_lbl.font.name = "Times New Roman"
        r_lbl.font.size = Pt(8.5)
        r_lbl.font.bold = True
        r_lbl.font.italic = True
        r_txt = p.add_run(caption)
        r_txt.font.name = "Times New Roman"
        r_txt.font.size = Pt(8.5)
        r_txt.font.italic = True

    # ─────────────────────────────────────────────────────────────────────────
    # I. INTRODUCTION
    # ─────────────────────────────────────────────────────────────────────────
    add_sec_heading("I. INTRODUCTION")
    add_body_p(
        "Household appliances such as refrigerators, washing machines, and air conditioners constitute non-discretionary consumer necessities. "
        "However, direct outright acquisition imposes heavy upfront capital expenditures (CAPEX) on consumers. For university students, transient working "
        "professionals, and modern urban households, equipment rental provides a flexible, affordable alternative that shifts consumption from linear asset "
        "ownership to access-based utilization. Beyond consumer flexibility, appliance leasing serves as a vital operationalization of Product-Service Systems (PSS) "
        "within the circular economy: a single durable unit is maintained, serviced, refurbished, and re-circulated across successive tenancies throughout its useful "
        "life, dramatically mitigating embedded carbon emissions and e-waste generation [1], [2]."
    )
    add_body_p(
        "While conventional digital rental platforms succeed in centralizing catalog browsing, reservation scheduling, and payment capture, operational experience reveals "
        "two critical vulnerabilities inherent to durable goods leasing. First, catalogue discovery is hindered by decision fatigue: durable appliances possess intricate technical "
        "specifications (energy star ratings, volumetric capacity, dimensions, motor inverter types) and spatial room complementarities that standard keyword filters fail to resolve. "
        "Second, rental enterprises depend upon continuous monthly recurring revenue (MRR) to amortize high upfront capital investments in asset procurement, technician delivery, "
        "pre-dispatch quality audits, and reverse logistics. When a subscriber churns prematurely, unamortized operational expenditures cannot be recovered."
    )
    add_body_p(
        "Understanding Customer Churn in Durable Goods Leasing: In subscription-based durable leasing, customer churn is formally defined as the contractual termination "
        "of the leasing agreement, wherein a customer cancels active subscriptions, schedules machine repossession, and ceases recurring subscription payments without renewal. "
        "Because customer acquisition costs (CAC) in durable leasing exceed those of standard e-commerce by a factor of 3× to 5× due to physical logistics and technician labor, proactive "
        "attrition mitigation is essential for enterprise survival. An analytical churn-prediction engine continuously monitors customer behavioral telemetry (tenure duration, payment delinquency, "
        "cart dormancy, support feedback) to calculate default probability, enabling retention teams to intervene with preventive maintenance, lease restructuring, or tenure discounts before the lease lapses."
    )
    add_body_p(
        "Foundational Architecture and Paper Contributions: The baseline framework for this investigation, 'Just Rent It' [3], established the fundamental digital workflows "
        "required for appliance leasing: catalog presentation, order placement, digital payments, and user authentication. However, it treated analytical intelligence, identity security, "
        "and data-driven retention as external future work. The Rentora platform extends this architectural baseline in two core dimensions (Table I):"
    )
    add_body_p(
        "1. Full-Stack Operational Hardening: Rentora introduces granular Role-Based Access Control (RBAC) across three distinct actors (renters, peer asset owners, platform administrators), "
        "in-browser optical character recognition (OCR) via WebAssembly Tesseract.js for private client-side identity verification, an escrow-style security deposit ledger with an optional damage waiver, "
        "and full-duplex WebSocket delivery tracking via Socket.io."
    )
    add_body_p(
        "2. Integrated Analytical Intelligence Tier: It deploys a decoupled Python machine learning pipeline that pairs an explainable hybrid catalog recommender with a LightGBM customer churn "
        "prediction engine equipped with TreeSHAP game-theoretic feature explanations."
    )

    # TABLE I
    p_t1_lbl = doc.add_paragraph()
    p_t1_lbl.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_t1_lbl.paragraph_format.space_before = Pt(6)
    p_t1_lbl.paragraph_format.space_after = Pt(2)
    r = p_t1_lbl.add_run("TABLE I\nFROM THE BASE FRAMEWORK TO RENTORA")
    r.font.name = "Times New Roman"
    r.font.size = Pt(8.5)
    r.font.bold = True

    t1_data = [
        ["Functional Dimension", "Base Framework [3]", "Rentora (This Work)", "Implementation Status"],
        ["System Architecture", "Client-server web API", "React 19 SPA, Express API, MongoDB, decoupled Python ML", "Fully Implemented"],
        ["Authentication & Access", "Basic user sessions", "JWT login, RBAC route guards across 3 distinct roles", "Fully Implemented"],
        ["Identity Verification (KYC)", "Manual physical submission", "Client-side Tesseract.js WebAssembly OCR document extraction", "Implemented (Simulated Backend)"],
        ["Payments & Deposit Reserve", "Direct transaction capture", "Razorpay test mode; software escrow reserve ledger & damage waiver", "Implemented (Sandbox Simulation)"],
        ["Inventory & Order Concurrency", "Static inventory table", "Multi-city catalog with atomic decrement ($inc) and restitution", "Fully Implemented"],
        ["Delivery Tracking", "Periodic status polling", "Full-duplex WebSocket event streaming via Socket.io", "Fully Implemented"],
        ["Catalog Discovery", "Static tabular browsing", "Hybrid recommender: TF-IDF, co-rental, ratings, energy, budget", "Fully Implemented"],
        ["Customer Retention", "Not addressed", "LightGBM churn classification with TreeSHAP feature attributions", "Fully Implemented"]
    ]

    t1 = doc.add_table(rows=len(t1_data), cols=4)
    t1.alignment = WD_TABLE_ALIGNMENT.CENTER
    t1.autofit = False
    for r_idx, row in enumerate(t1_data):
        for c_idx, val in enumerate(row):
            cell = t1.cell(r_idx, c_idx)
            widths = [Inches(1.5), Inches(1.5), Inches(2.6), Inches(1.4)]
            cell.width = widths[c_idx]
            set_cell_margins(cell, 40, 40, 60, 60)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.05
            if r_idx == 0:
                set_cell_background(cell, "1B365D")
                r = p.add_run(val)
                r.font.name = "Times New Roman"
                r.font.size = Pt(8)
                r.font.bold = True
                r.font.color.rgb = RGBColor(255, 255, 255)
            else:
                bg = "F4F6F9" if r_idx % 2 == 1 else "FFFFFF"
                set_cell_background(cell, bg)
                r = p.add_run(val)
                r.font.name = "Times New Roman"
                r.font.size = Pt(7.5)
                if c_idx == 0:
                    r.font.bold = True
    set_table_borders(t1)

    # ─────────────────────────────────────────────────────────────────────────
    # II. LITERATURE SURVEY
    # ─────────────────────────────────────────────────────────────────────────
    add_sec_heading("II. LITERATURE SURVEY")
    add_subsec_heading("A. Circular Economy and Consumer Product-Service Systems")
    add_body_p(
        "Consumer durables represent significant reservoirs of embodied carbon and refined raw materials. Koide et al. [1] conducted an extensive meta-analysis "
        "spanning over 100 empirical PSS implementations, establishing that while servitization and shared access yield substantial lifecycle emission reductions, "
        "their environmental effectiveness depends critically upon service design, reverse logistics efficiency, and maintenance durability. Sigüenza et al. [2] examined "
        "circular leasing frameworks for household washing machines in European markets, demonstrating that closed-loop leasing reduces aggregate material depletion by up to 34% "
        "compared to linear ownership models, provided robust tracking and refurbishment infrastructure prevents premature machine obsolescence."
    )
    add_subsec_heading("B. Digital Rental Platform Architectures")
    add_body_p(
        "The digitization of leasing operations has historically adapted conventional e-commerce patterns. Foundational baseline architectures, including 'Just Rent It' [3], "
        "formalized the mapping of equipment rental lifecycles into client-server REST interfaces handling inventory cataloging, scheduling, and digital transaction verification. "
        "However, these architectures treat analytical intelligence as external post-hoc reporting rather than core operational components, creating a systemic gap between transaction processing "
        "and proactive customer retention."
    )
    add_subsec_heading("C. Recommender Systems in Equipment Leasing")
    add_body_p(
        "Recommender architectures in e-commerce predominantly rely on collaborative filtering (CF) and matrix factorization [10]. Satapathy et al. [4] applied collaborative filtering "
        "with cosine similarity to rental property portals. However, applying pure CF algorithms to durable appliance rental exposes severe structural limitations. "
        "Unlike movie streaming or grocery shopping where interaction density is high, appliance leasing is characterized by extreme interaction sparsity: an individual household leases "
        "only 1 to 4 appliances across multi-year intervals. Consequently, the user-item interaction matrix lacks sufficient density to train latent factor models reliably. "
        "In sparse leasing contexts, content-based vector space models [11] and item-to-item co-occurrence heuristics [14] provide vital baseline stability, especially when combined with "
        "explicit domain knowledge such as room synergy and energy efficiency ratings."
    )
    add_subsec_heading("D. Machine Learning for Churn Prediction")
    add_body_p(
        "In subscription service environments, customer attrition has been analyzed across telecommunications, banking, and SaaS. In the home appliance leasing sector specifically, "
        "Suh [5] evaluated multiple machine learning classifiers on Korean appliance rental operational records, demonstrating that tree-based gradient boosting architectures significantly "
        "outperformed classical Random Forest [7], logistic regression, and shallow neural networks in identifying churners from contract duration, service call frequency, and payment records. "
        "LightGBM [6] represents a state-of-the-art gradient boosting implementation, utilizing gradient-based one-side sampling (GOSS) and exclusive feature bundling (EFB) to achieve high "
        "computational efficiency on tabular data."
    )
    add_subsec_heading("E. Operational Explainable AI (XAI)")
    add_body_p(
        "Predictive accuracy alone is insufficient for enterprise deployment. Operational personnel (customer support representatives and retention agents) require actionable explanations "
        "to justify customer interventions. SHapley Additive exPlanations (SHAP) [8], grounded in cooperative game theory [12], guarantees fair marginal feature attribution across coalitions. "
        "Lundberg et al. [9] developed TreeSHAP, an exact algorithm that computes Shapley values for tree ensembles in polynomial time O(TLD^2) rather than exponential time O(TL2^F). "
        "This makes real-time, staff-facing risk factor attribution operationally tractable."
    )

    # ─────────────────────────────────────────────────────────────────────────
    # III. RESEARCH GAP & CAPABILITY MATRIX
    # ─────────────────────────────────────────────────────────────────────────
    add_sec_heading("III. RESEARCH GAP & CONTRIBUTIONS")
    add_body_p(
        "A rigorous synthesis of existing literature exposes a pronounced dichotomy: operational platforms provide transactional workflows without machine learning, "
        "while academic machine learning studies analyze isolated datasets without deploying functional operational systems. Table II summarizes this capability matrix."
    )

    # TABLE II
    p_t2_lbl = doc.add_paragraph()
    p_t2_lbl.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_t2_lbl.paragraph_format.space_before = Pt(6)
    p_t2_lbl.paragraph_format.space_after = Pt(2)
    r = p_t2_lbl.add_run("TABLE II\nCAPABILITY MATRIX: EARLIER STUDIES VERSUS RENTORA")
    r.font.name = "Times New Roman"
    r.font.size = Pt(8.5)
    r.font.bold = True

    t2_data = [
        ["System Capability", "Base Platform [3]", "Recommender Study [4]", "Churn Study [5]", "Rentora (This Work)"],
        ["Transactional Booking & Payment", "Yes", "Partial", "No", "Yes"],
        ["Personalized Discovery Recommender", "No", "Yes", "No", "Yes"],
        ["Machine Learning Churn Prediction", "No", "No", "Yes", "Yes"],
        ["Local Feature Explainability (XAI)", "No", "Partial", "Partial", "Yes"],
        ["Cold-Start Catalog Handling", "No", "Partial", "No", "Yes"],
        ["Integrated Decoupled Architecture", "No", "No", "No", "Yes"]
    ]

    t2 = doc.add_table(rows=len(t2_data), cols=5)
    t2.alignment = WD_TABLE_ALIGNMENT.CENTER
    t2.autofit = False
    for r_idx, row in enumerate(t2_data):
        for c_idx, val in enumerate(row):
            cell = t2.cell(r_idx, c_idx)
            widths = [Inches(2.5), Inches(1.1), Inches(1.2), Inches(1.1), Inches(1.1)]
            cell.width = widths[c_idx]
            set_cell_margins(cell, 40, 40, 50, 50)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.05
            if r_idx == 0:
                set_cell_background(cell, "1B365D")
                r = p.add_run(val)
                r.font.name = "Times New Roman"
                r.font.size = Pt(8)
                r.font.bold = True
                r.font.color.rgb = RGBColor(255, 255, 255)
            else:
                bg = "F4F6F9" if r_idx % 2 == 1 else "FFFFFF"
                set_cell_background(cell, bg)
                r = p.add_run(val)
                r.font.name = "Times New Roman"
                r.font.size = Pt(7.5)
                if c_idx == 0:
                    r.font.bold = True
                if val == "Yes":
                    r.font.bold = True
                    r.font.color.rgb = RGBColor(0, 100, 0)
                elif val == "No":
                    r.font.color.rgb = RGBColor(140, 0, 0)
    set_table_borders(t2)

    # ─────────────────────────────────────────────────────────────────────────
    # IV. THE RENTORA SYSTEM ARCHITECTURE
    # ─────────────────────────────────────────────────────────────────────────
    add_sec_heading("IV. THE RENTORA SYSTEM ARCHITECTURE")
    add_body_p(
        "Rentora is engineered as an enterprise multi-tier architecture incorporating a presentation tier, an API gateway, a transactional database tier, "
        "and an asynchronous machine learning batch intelligence pipeline (Fig. 1). Decoupling analytical computation from transactional routing guarantees "
        "that intensive machine learning retraining, scoring, or transient script failures cannot degrade storefront availability or block booking workflows."
    )

    # Fig 1 Image
    p_img1 = doc.add_paragraph()
    p_img1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    img1_path = os.path.join(baseline_fig_dir, "image1.png")
    if os.path.exists(img1_path):
        p_img1.add_run().add_picture(img1_path, width=Inches(3.8))
        add_fig_caption(1, "Rentora multi-tier architecture. The Python ML batch pipeline operates asynchronously against MongoDB, ensuring model execution never impedes core transactional workflows.")

    add_body_p(
        "Presentation Tier: The client application is implemented using React 19 bundled with Vite and styled via Tailwind CSS. The user interface exposes three specialized portals: "
        "(1) Customer Portal for catalog browsing, tenure-tiered cart configuration, KYC document upload, and order management; (2) Peer Owner Portal for listing durable assets, monitoring "
        "payout disbursements, and inspecting item condition reports; and (3) Administrator Portal for platform governance, KYC approvals, inventory adjustments, and churn-risk monitoring. "
        "Client-side identity verification is powered by Tesseract.js WebAssembly: identity documents (Aadhaar cards) are preprocessed via HTML5 canvas grayscale equalization, extracting 12-digit "
        "numerals locally in the browser and validating them against the UIDAI Verhoeff polynomial checksum before payload transmission, ensuring zero server-side image leakage."
    )
    add_body_p(
        "API Gateway Tier: The gateway is built on Node.js and Express, exposing 15 decoupled REST controllers. Route access is guarded by stateless JSON Web Tokens (JWT) containing cryptographic "
        "role claims, enforced through hierarchical middleware guards. Full-duplex WebSocket connections via Socket.io broadcast order lifecycle milestones and real-time dispatch progress. "
        "A deterministic policy concierge chatbot answers customer inquiries regarding tenure discounts, damage protection, and buyouts from static JSON knowledge trees."
    )
    add_body_p(
        "Transactional Data Tier: MongoDB acts as the transactional system of record. High-concurrency inventory decrement during checkout is handled via atomic conditional updates "
        "($inc: { stock: -qty }, stock >= qty), with automated stock restitution upon payment cancellation, eliminating double-booking hazards. Financial deposit friction is mitigated through "
        "a software-managed escrow deposit ledger and an optional Rentora Care damage protection waiver (₹149/mo) capping tenant liability at ₹10,000 for incidental wear and tear."
    )
    add_body_p(
        "Intelligence Batch Tier: Asynchronous Python workers execute Extract-Transform-Load (ETL) routines, aggregating customer rentals, billing history, and feedback. The pipeline serializes "
        "trained models using joblib and populates derived MongoDB collections (user_churn_scores and appliance_recommendations) for low-latency storefront retrieval."
    )

    # ─────────────────────────────────────────────────────────────────────────
    # V. DATASETS & FEATURE ENGINEERING
    # ─────────────────────────────────────────────────────────────────────────
    add_sec_heading("V. DATASETS & FEATURE ENGINEERING")
    add_subsec_heading("A. Customer Churn Risk Benchmark Corpus (Proxy Formulation)")
    add_body_p(
        "Because nascent circular rental startups lack decadal operational churn logs, the predictive pipeline was evaluated using an established proxy methodology. "
        "The model is trained on the public 10,000-record Bank Customer Churn dataset [15], exhibiting a 20.37% empirical attrition rate (2,037 churned, 7,963 retained). "
        "The banking fields are mapped into 15 rental-domain operational features via fixed deterministic mathematical transformations (Table III). "
        "Crucially, the binary churn ground-truth label is preserved without alteration. No stochastic jitter is injected. This proxy benchmark evaluates the algorithmic scalability, "
        "latency, and feature attribution logic of the pipeline, establishing a rigorous computational baseline prior to the collection of long-term empirical appliance leasing telemetry."
    )

    # TABLE III
    p_t3_lbl = doc.add_paragraph()
    p_t3_lbl.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_t3_lbl.paragraph_format.space_before = Pt(6)
    p_t3_lbl.paragraph_format.space_after = Pt(2)
    r = p_t3_lbl.add_run("TABLE III\nFEATURE ENGINEERING SPECIFICATION & EMPIRICAL BOUNDS (N = 10,000)")
    r.font.name = "Times New Roman"
    r.font.size = Pt(8.5)
    r.font.bold = True

    t3_data = [
        ["Rental Behavioral Feature", "Empirical Range [Min, Max]", "Deterministic Derivation Formula", "Operational Meaning & Data Status"],
        ["tenure_months", "1 – 120 mo", "(raw['Tenure'] * 12 + (raw['Age'] % 12)).clip(1, 120)", "Account subscription duration; Proxy"],
        ["monthly_spend", "₹2.25 – ₹5,349.27", "round(raw['EstimatedSalary']/40 + (raw['Balance']>0)*350, 2)", "Estimated recurring monthly rent; Proxy"],
        ["active_rentals", "1 – 4 units", "raw['NumOfProducts'].clip(1, 5) [source max is 4]", "Concurrent active leased machines; Proxy"],
        ["credit_score", "350 – 850", "raw['CreditScore']", "Financial credit standing indicator; Proxy"],
        ["customer_age", "18 – 92 yrs", "raw['Age']", "Tenant demographic age indicator; Proxy"],
        ["is_active_member", "{0, 1}", "raw['IsActiveMember']", "Platform engagement loyalty status; Proxy"],
        ["late_payments", "0 – 5 events", "round(((850 - CreditScore)/85) + (1-IsActive)*1.5 + (Bal==0)*0.5).clip(0, 5)", "Overdue payment delinquency count; Heuristic"],
        ["early_returns", "0 – 2 events", "(1 - IsActive)*(Tenure <= 2) + (CreditScore < 520)", "Premature lease termination history; Heuristic"],
        ["cart_abandonment", "{0, 2, 4} events", "(1 - IsActiveMember)*2 + (NumOfProducts == 1)*2", "Dormant cart sessions without checkout; Heuristic"],
        ["days_inactive", "0.0 – 55.0 days", "round((1 - IsActiveMember)*35 + (10 - Tenure)*2, 1).clip(0, 90)", "Dormancy since last authenticated session; Heuristic"],
        ["avg_rating", "2.60 – 5.00 ★", "round(IsActiveMember*0.8 + (CreditScore / 250) + 1.2, 2).clip(1, 5)", "Customer satisfaction feedback rating; Heuristic"],
        ["spend_per_rental", "₹1.07 – ₹4,862.97", "round(monthly_spend / (active_rentals + 0.1), 2)", "Monthly revenue ticket per leased machine; Derived"],
        ["delinquency_rate", "0.00 – 2.50", "round(late_payments / (active_rentals + 1.0), 4)", "Ratio of overdue payments to active leases; Derived"],
        ["inactivity_rate", "0.00 – 1.77", "round(days_inactive / (tenure_months * 30 + 1.0), 4)", "Tenure proportion spent in dormancy; Derived"],
        ["engagement_score", "1.011 – 5.000", "round(avg_rating * (1.0 - min(1.0, days_inactive / 90.0)), 3)", "Composite satisfaction and activity index; Derived"]
    ]

    t3 = doc.add_table(rows=len(t3_data), cols=4)
    t3.alignment = WD_TABLE_ALIGNMENT.CENTER
    t3.autofit = False
    for r_idx, row in enumerate(t3_data):
        for c_idx, val in enumerate(row):
            cell = t3.cell(r_idx, c_idx)
            widths = [Inches(1.5), Inches(1.2), Inches(2.7), Inches(1.8)]
            cell.width = widths[c_idx]
            set_cell_margins(cell, 35, 35, 45, 45)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.05
            if r_idx == 0:
                set_cell_background(cell, "1B365D")
                r = p.add_run(val)
                r.font.name = "Times New Roman"
                r.font.size = Pt(7.5)
                r.font.bold = True
                r.font.color.rgb = RGBColor(255, 255, 255)
            else:
                bg = "F4F6F9" if r_idx % 2 == 1 else "FFFFFF"
                set_cell_background(cell, bg)
                r = p.add_run(val)
                r.font.name = "Times New Roman"
                r.font.size = Pt(7.0)
                if c_idx == 0:
                    r.font.bold = True
    set_table_borders(t3)

    add_subsec_heading("B. Recommender Appliance Catalog Corpus")
    add_body_p(
        "The recommender engine is evaluated on the repository's curated catalog (data/appliances_catalog.csv), comprising 164 durable appliances categorized across "
        "12 primary rooms and categories (Living Room, Kitchen, Bedroom, Home Office, Dining, Laundry, etc.) and 41 granular sub-categories (Refrigerators, Inverter Washing Machines, "
        "Ergonomic Study Desks, Smart Microwave Ovens, Water Purifiers, etc.). Among these, 162 items possess explicit sub-category labels suitable for semantic retrieval validation."
    )

    # ─────────────────────────────────────────────────────────────────────────
    # VI. METHODOLOGY & MATHEMATICAL FORMULATIONS
    # ─────────────────────────────────────────────────────────────────────────
    add_sec_heading("VI. METHODOLOGY & MATHEMATICAL FORMULATIONS")
    add_subsec_heading("A. Hybrid Recommender System Formulation")
    add_body_p(
        "Rentora combines content-based lexical similarity, item-to-item co-rental association, Bayesian rating smoothing, energy-efficiency incentives, and budget affinity."
    )
    add_body_p(
        "1. Lexical Content Similarity: For each appliance, a descriptive document is synthesized from boosted category tokens (3×), sub-category tokens (2×), rental name, "
        "and specifications. Sublinear TF-IDF vectors ti, tj are extracted across unigrams and bigrams (vocabulary ceiling: 2,500 features). Cosine similarity computes semantic alignment:"
    )
    p_eq1 = doc.add_paragraph()
    p_eq1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_eq1 = p_eq1.add_run("sim(i, j) = (t_i · t_j) / (||t_i|| · ||t_j||)                (1)")
    r_eq1.font.name = "Times New Roman"
    r_eq1.font.size = Pt(9)
    r_eq1.font.bold = True

    add_body_p(
        "2. Co-Rental Collaborative Affinity: Past rental co-occurrences are mined into a symmetric association matrix, normalized by the geometric mean of individual rental frequencies [14]:"
    )
    p_eq2 = doc.add_paragraph()
    p_eq2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_eq2 = p_eq2.add_run("coaff(i, j) = n_ij / sqrt(n_i · n_j)                           (2)")
    r_eq2.font.name = "Times New Roman"
    r_eq2.font.size = Pt(9)
    r_eq2.font.bold = True

    add_body_p(
        "3. Composite Hybrid Scoring: For user u and candidate appliance j, let c denote the mean content similarity and k the mean co-rental affinity relative to user u's active leases. "
        "To mitigate early collaborative sparsity, a category synergy prior s >= 0.22 is injected for complementary room pairings (e.g., refrigerator paired with water purifier). The composite score is:"
    )
    p_eq3 = doc.add_paragraph()
    p_eq3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_eq3 = p_eq3.add_run("score(u, j) = 0.35 c + 0.25 max(k, s) + 0.20 (q_j / 5) + e_j + 0.15 π_j    (3)")
    r_eq3.font.name = "Times New Roman"
    r_eq3.font.size = Pt(9)
    r_eq3.font.bold = True

    add_body_p(
        "where q_j represents the Bayesian smoothed rating shrunk toward platform prior C = 4.30 across review count v_j: q_j = (v_j · r_j + 12 × 4.30)/(v_j + 12); e_j denotes the eco-tier energy bonus "
        "(0.15 for >= 4-star inverter appliances, 0.05 otherwise); and π_j represents Gaussian budget affinity: π_j = exp(-0.5 ((p_j - B_u) / σ_B)^2), where B_u is the tenant's historical median monthly spend "
        "(default ₹1,200 when no prior leases exist) and budget dispersion is bounded by σ_B = max(0.8 B_u, 600.0)."
    )

    add_subsec_heading("B. Churn Risk Machine Learning Formulation")
    add_body_p(
        "Binary churn status is modeled via LightGBM [6], an ensemble of M decision trees whose aggregated continuous leaf values parameterize the Bernoulli churn probability:"
    )
    p_eq4 = doc.add_paragraph()
    p_eq4.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_eq4 = p_eq4.add_run("P(y = 1 | x) = σ(sum_{m=1}^M f_m(x)) = 1 / (1 + exp(-sum_{m=1}^M f_m(x)))     (4)")
    r_eq4.font.name = "Times New Roman"
    r_eq4.font.size = Pt(9)
    r_eq4.font.bold = True

    add_body_p(
        "where f_m(x) = η · ŷ_{m,leaf}(x) represents the continuous leaf prediction of the m-th decision tree scaled by shrinkage factor η = 0.04, and sum_{m=1}^M f_m(x) ∈ ℝ "
        "denotes the cumulative log-odds margin. The model is parameterized with M = 300 estimators, maximum tree depth 4, 20 leaves, feature subsampling ratio 0.85, row subsampling 0.85, "
        "class re-weighting scale_pos_weight = 1.4, and L1/L2 penalties of 0.1 each. A Random Forest [7] with 250 trees of depth 12 serves as the bagging benchmark."
    )

    add_subsec_heading("C. Explainable AI via Exact TreeSHAP")
    add_body_p(
        "For model f and customer feature vector x, the Shapley value phi_k measures feature k's additive marginal contribution across all possible feature subsets S:"
    )
    p_eq5 = doc.add_paragraph()
    p_eq5.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_eq5 = p_eq5.add_run("phi_k = sum_{S subseteq F \\ {k}} [|S|!(|F| - |S| - 1)! / |F|!] · [f(S union {k}) - f(S)]   (5)")
    r_eq5.font.name = "Times New Roman"
    r_eq5.font.size = Pt(9)
    r_eq5.font.bold = True

    add_body_p(
        "We utilize TreeSHAP [9] to evaluate Equation (5) in low-order polynomial time O(TLD^2) directly from tree node statistics, converting raw mathematical attributions into "
        "plain-language operational drivers presented directly in the administrator dashboard."
    )

    # ─────────────────────────────────────────────────────────────────────────
    # VII. EXPERIMENTAL RESULTS & PERFORMANCE ANALYSIS
    # ─────────────────────────────────────────────────────────────────────────
    add_sec_heading("VII. EXPERIMENTAL RESULTS & PERFORMANCE ANALYSIS")
    add_subsec_heading("A. Churn Prediction Classification Performance")
    add_body_p(
        "Table IV and Figure 2 present the held-out test split evaluation (N = 2,000 customers, 407 churners) at the standard classification threshold of 0.50. "
        "All reported metrics were generated via run_experiments.py using genuine LightGBM 4.7.0 and scikit-learn 1.9.1."
    )

    # TABLE IV
    p_t4_lbl = doc.add_paragraph()
    p_t4_lbl.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_t4_lbl.paragraph_format.space_before = Pt(6)
    p_t4_lbl.paragraph_format.space_after = Pt(2)
    r = p_t4_lbl.add_run("TABLE IV\nCHURN PREDICTION ON HELD-OUT TEST SPLIT (N = 2,000, THRESHOLD = 0.50)")
    r.font.name = "Times New Roman"
    r.font.size = Pt(8.5)
    r.font.bold = True

    t4_data = [
        ["Model Architecture", "Accuracy", "Precision", "Recall", "F1-Score", "ROC-AUC", "PR-AUC"],
        ["Random Forest Baseline", "0.852", "0.741", "0.415", "0.532", "0.819", "0.643"],
        ["Genuine LightGBM (This Work)", "0.860", "0.727", "0.496", "0.590", "0.833", "0.666"]
    ]

    t4 = doc.add_table(rows=len(t4_data), cols=7)
    t4.alignment = WD_TABLE_ALIGNMENT.CENTER
    t4.autofit = False
    for r_idx, row in enumerate(t4_data):
        for c_idx, val in enumerate(row):
            cell = t4.cell(r_idx, c_idx)
            widths = [Inches(2.2), Inches(0.8), Inches(0.8), Inches(0.8), Inches(0.8), Inches(0.9), Inches(0.8)]
            cell.width = widths[c_idx]
            set_cell_margins(cell, 40, 40, 50, 50)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.05
            if r_idx == 0:
                set_cell_background(cell, "1B365D")
                r = p.add_run(val)
                r.font.name = "Times New Roman"
                r.font.size = Pt(8)
                r.font.bold = True
                r.font.color.rgb = RGBColor(255, 255, 255)
            else:
                bg = "F4F6F9" if r_idx % 2 == 1 else "FFFFFF"
                set_cell_background(cell, bg)
                r = p.add_run(val)
                r.font.name = "Times New Roman"
                r.font.size = Pt(7.5)
                if c_idx == 0:
                    r.font.bold = True
                if r_idx == 2:
                    r.font.bold = True
    set_table_borders(t4)

    # Fig 2 Image
    p_img2 = doc.add_paragraph()
    p_img2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    img2_path = os.path.join(fig_dir, "fig2_roc_pr_curves.png")
    if os.path.exists(img2_path):
        p_img2.add_run().add_picture(img2_path, width=Inches(5.0))
        add_fig_caption(2, "ROC and Precision-Recall curves comparing LightGBM and Random Forest on the held-out test split (N=2,000).")

    add_body_p(
        "Empirical analysis reveals that LightGBM achieves superior discrimination, leading Random Forest by +0.014 in ROC-AUC (0.833 vs. 0.819) and +0.023 in PR-AUC (0.666 vs. 0.643). "
        "Crucially for customer retention, LightGBM captures substantially more true churners (Recall: 0.496 vs. 0.415), translating to an 11% improvement in F1-score (0.590 vs. 0.532)."
    )

    # TABLE V
    p_t5_lbl = doc.add_paragraph()
    p_t5_lbl.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_t5_lbl.paragraph_format.space_before = Pt(6)
    p_t5_lbl.paragraph_format.space_after = Pt(2)
    r = p_t5_lbl.add_run("TABLE V\nSTRATIFIED FIVE-FOLD CROSS-VALIDATION PERFORMANCE (MEAN ± SD)")
    r.font.name = "Times New Roman"
    r.font.size = Pt(8.5)
    r.font.bold = True

    t5_data = [
        ["Model Architecture", "ROC-AUC (Mean ± SD)", "PR-AUC (Mean ± SD)", "F1-Score (Mean ± SD)"],
        ["Random Forest Baseline", "0.824 ± 0.011", "0.643 ± 0.018", "0.535 ± 0.012"],
        ["Genuine LightGBM (This Work)", "0.833 ± 0.012", "0.661 ± 0.018", "0.572 ± 0.017"]
    ]

    t5 = doc.add_table(rows=len(t5_data), cols=4)
    t5.alignment = WD_TABLE_ALIGNMENT.CENTER
    t5.autofit = False
    for r_idx, row in enumerate(t5_data):
        for c_idx, val in enumerate(row):
            cell = t5.cell(r_idx, c_idx)
            widths = [Inches(2.5), Inches(1.6), Inches(1.6), Inches(1.4)]
            cell.width = widths[c_idx]
            set_cell_margins(cell, 40, 40, 50, 50)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.05
            if r_idx == 0:
                set_cell_background(cell, "1B365D")
                r = p.add_run(val)
                r.font.name = "Times New Roman"
                r.font.size = Pt(8)
                r.font.bold = True
                r.font.color.rgb = RGBColor(255, 255, 255)
            else:
                bg = "F4F6F9" if r_idx % 2 == 1 else "FFFFFF"
                set_cell_background(cell, bg)
                r = p.add_run(val)
                r.font.name = "Times New Roman"
                r.font.size = Pt(7.5)
                if c_idx == 0 or r_idx == 2:
                    r.font.bold = True
    set_table_borders(t5)

    add_body_p(
        "Stratified 5-fold cross-validation (Table V) confirms that LightGBM's advantage is stable across random fold partitions: ROC-AUC 0.833 ± 0.012 vs. 0.824 ± 0.011. "
        "Figure 3 details the confusion matrix at the standard 0.50 threshold: LightGBM successfully catches 202 of 407 churners with only 76 false alarms among 1,593 retained customers. "
        "In enterprise rental operations where the cost of proactive retention outreach (e.g. an automated 15% retention discount) is negligible compared to losing subscriber lifetime value (LTV), "
        "operators can adjust the decision threshold to 0.32. At threshold 0.32, LightGBM recall increases from 49.6% to 65.6% (267 of 407 churners caught, a 32% increase in detected attrition) "
        "with precision of 53.1% (236 false alarms), F1-score of 0.587, and peak F2-score of 0.627 (Confusion Matrix: TN=1357, FP=236, FN=140, TP=267)."
    )

    # Fig 3 Image
    p_img3 = doc.add_paragraph()
    p_img3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    img3_path = os.path.join(fig_dir, "fig3_confusion_matrix.png")
    if os.path.exists(img3_path):
        p_img3.add_run().add_picture(img3_path, width=Inches(2.8))
        add_fig_caption(3, "LightGBM confusion matrix on the held-out test split at standard threshold 0.50 (202 churners caught, 76 false alarms).")

    add_subsec_heading("B. Feature Importance and Explainable Risk Drivers")
    add_body_p(
        "Global feature attribution computed via TreeSHAP (Figure 4) ranks customer_age (mean |phi| = 0.80 log-odds) and active_rentals (mean |phi| = 0.63 log-odds) as the dominant drivers "
        "of attrition risk in margin space, followed by cart_abandonment (0.19), engagement_score (0.16), avg_rating (0.10), and monthly_spend (0.10). "
        "Crucially, this ranking reflects the mathematical structure of the underlying banking proxy corpus, where age and account product counts exhibit high variance. "
        "This ranking must not be interpreted as an empirical discovery regarding home appliance renters. However, secondary operational drivers (cart abandonment, payment delinquency, feedback rating) "
        "represent concrete, actionable operational levers for retention intervention."
    )

    # Fig 4 Image
    p_img4 = doc.add_paragraph()
    p_img4.alignment = WD_ALIGN_PARAGRAPH.CENTER
    img4_path = os.path.join(fig_dir, "fig4_shap_summary.png")
    if os.path.exists(img4_path):
        p_img4.add_run().add_picture(img4_path, width=Inches(4.2))
        add_fig_caption(4, "TreeSHAP summary plot illustrating the global distribution of feature impact on log-odds margin across 100 sampled test instances.")

    add_body_p(
        "Figure 5 displays the local waterfall explanation for the highest-risk tenant in the test split (base log-odds: -1.52, cumulative margin: +5.19, churn probability: 0.994). "
        "Holding 4 active rentals (+4.77 log-odds) combined with older age (+1.04 log-odds) and credit score (+0.39 log-odds) drives the tenant into critical attrition risk, "
        "counteracted only by long tenure (-1.36 log-odds). Providing this exact decomposition in the administrator dashboard allows staff to verify the root cause before dispatching technicians or adjusting lease commitments."
    )

    # Fig 5 Image
    p_img5 = doc.add_paragraph()
    p_img5.alignment = WD_ALIGN_PARAGRAPH.CENTER
    img5_path = os.path.join(fig_dir, "fig5_local_shap_waterfall.png")
    if os.path.exists(img5_path):
        p_img5.add_run().add_picture(img5_path, width=Inches(4.2))
        add_fig_caption(5, "Local TreeSHAP explanation for the highest-risk tenant, decomposing log-odds risk (base log-odds: -1.52, margin: +5.19, prob: 0.994) into exact feature contributions.")

    add_subsec_heading("C. Recommender Catalog Coherence Evaluation")
    add_body_p(
        "Table VI evaluates the semantic clustering quality of the TF-IDF content recommender on the 164-item appliance catalog at retrieval depth K = 5. "
        "When evaluated against fine-grained sub-categories (41 classes across 162 labeled items), top-5 recommendations achieve 59.3% precision, representing a 14.1× lift "
        "over random baseline ranking (4.2%). The hit rate reaches 96.5%, and catalog coverage is 96.3%, demonstrating that the vector space reliably retrieves contextually relevant "
        "companion appliances without leaving catalog items orphaned."
    )

    # TABLE VI
    p_t6_lbl = doc.add_paragraph()
    p_t6_lbl.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_t6_lbl.paragraph_format.space_before = Pt(6)
    p_t6_lbl.paragraph_format.space_after = Pt(2)
    r = p_t6_lbl.add_run("TABLE VI\nRECOMMENDER RETRIEVAL COHERENCE ON APPLIANCE CATALOG (K = 5)")
    r.font.name = "Times New Roman"
    r.font.size = Pt(8.5)
    r.font.bold = True

    t6_data = [
        ["Semantic Level (Classes)", "Precision@5", "Random Chance", "Hit Rate@5", "Recall@5", "Catalog Coverage"],
        ["Sub-Category (n=162, 41 classes)", "0.593", "0.042", "0.965", "0.659", "0.963"],
        ["Category (n=164, 12 classes)", "0.604", "0.207", "0.921", "0.633", "0.970"]
    ]

    t6 = doc.add_table(rows=len(t6_data), cols=6)
    t6.alignment = WD_TABLE_ALIGNMENT.CENTER
    t6.autofit = False
    for r_idx, row in enumerate(t6_data):
        for c_idx, val in enumerate(row):
            cell = t6.cell(r_idx, c_idx)
            widths = [Inches(2.5), Inches(0.9), Inches(0.9), Inches(0.9), Inches(0.9), Inches(1.0)]
            cell.width = widths[c_idx]
            set_cell_margins(cell, 40, 40, 50, 50)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.05
            if r_idx == 0:
                set_cell_background(cell, "1B365D")
                r = p.add_run(val)
                r.font.name = "Times New Roman"
                r.font.size = Pt(8)
                r.font.bold = True
                r.font.color.rgb = RGBColor(255, 255, 255)
            else:
                bg = "F4F6F9" if r_idx % 2 == 1 else "FFFFFF"
                set_cell_background(cell, bg)
                r = p.add_run(val)
                r.font.name = "Times New Roman"
                r.font.size = Pt(7.5)
                if c_idx == 0:
                    r.font.bold = True
    set_table_borders(t6)

    # ─────────────────────────────────────────────────────────────────────────
    # VIII. DISCUSSION & THREATS TO VALIDITY
    # ─────────────────────────────────────────────────────────────────────────
    add_sec_heading("VIII. DISCUSSION & THREATS TO VALIDITY")
    add_body_p(
        "Operational Value: By consolidating storefront transactions, inventory controls, and machine learning scoring onto a unified MongoDB operational store, "
        "Rentora eliminates organizational data silos. Recommenders minimize subscriber cognitive friction, while TreeSHAP explainability equips support agents with "
        "unambiguous risk factors rather than opaque probability scores."
    )
    add_body_p(
        "Threats to Validity & Academic Limitations: In the spirit of rigorous academic inquiry, we document seven distinct technical limitations: "
        "(1) Benchmark Proxy Domain Gap: The churn evaluation utilizes deterministically mapped banking data. While validating pipeline throughput, latency, and XAI mechanics, "
        "it cannot serve as final proof of empirical rental behavior. (2) Algorithmic Proximity: The performance delta between LightGBM and Random Forest (0.01 in ROC-AUC) lies within "
        "one cross-validation standard deviation; neither model exhibits absolute dominance. (3) Non-Causal Nature of SHAP: Shapley attributions explain model log-odds, not customer intent; "
        "altering a feature externally does not guarantee behavioral change. (4) Recommender Acceptance: Table VI evaluates textual catalog coherence, not customer click-through rate (CTR) "
        "or lease conversion. (5) Single-Corpus Cross-Validation: Findings are derived from an 80/20 partition and 5-fold CV on a single corpus. (6) Deployment Parameter Imputation: "
        "In live scoring, demographic age is imputed as a constant (32) and credit score is estimated from late payments, rendering deployed risk scores heuristic indices rather than "
        "calibrated Bayesian probabilities. (7) Sandbox Services: Payments (Razorpay test mode), KYC identity validation, and delivery tracking operate within an academic prototype sandbox."
    )
    add_body_p(
        "Data Governance and Privacy: In compliance with modern data privacy frameworks, customer telemetry is sanitized prior to batch ingestion. "
        "Identity document scans processed via in-browser Tesseract.js are discarded after client-side numeral extraction, preventing PII data leakage."
    )

    # ─────────────────────────────────────────────────────────────────────────
    # IX. CONCLUSION & FUTURE WORK
    # ─────────────────────────────────────────────────────────────────────────
    add_sec_heading("IX. CONCLUSION & FUTURE WORK")
    add_body_p(
        "This research demonstrated the architectural realization and empirical benchmarking of Rentora, an AI-enhanced digital appliance leasing platform. "
        "By integrating a content-collaborative recommender and a LightGBM churn prediction engine into a full-stack React/Express/MongoDB system, "
        "Rentora addresses critical operational bottlenecks in circular durables leasing. On a 10,000-record benchmark corpus, LightGBM demonstrated superior "
        "churn detection (ROC-AUC 0.833, F1 0.590) with polynomial-time TreeSHAP local explanations, while the recommender achieved 59.3% sub-category coherence (14.1× lift over chance). "
        "Future work will focus on: (1) capturing longitudinal production telemetry from live Rentora deployments; (2) conducting live A/B testing to measure recommender conversion lift; "
        "(3) replacing banking proxy features with empirical sensor and IoT telemetry; and (4) quantifying the commercial ROI of explanation-guided retention outreach in controlled field trials."
    )
    add_body_p(
        "Scientific Reproducibility: All empirical tables (IV, V, VI) and figures (2, 3, 4, 5) reported in this manuscript are deterministically reproducible by executing "
        "python run_experiments.py --seed 42 in the official open-source repository: github.com/Nayak17-07/Rentora."
    )

    # ─────────────────────────────────────────────────────────────────────────
    # REFERENCES
    # ─────────────────────────────────────────────────────────────────────────
    add_sec_heading("REFERENCES")
    refs = [
        "[1] R. Koide, S. Murakami, and K. Nansai, “Prioritising low-risk and high-potential circular economy strategies for decarbonisation: A meta-analysis on consumer-oriented product-service systems,” Renew. Sustain. Energy Rev., vol. 155, p. 111858, Mar. 2022, doi: 10.1016/j.rser.2021.111858.",
        "[2] G. Sigüenza, B. Sprecher, et al., “Circular business models of washing machines in the Netherlands: Material and climate change implications toward 2050,” Sustain. Prod. Consum., vol. 26, pp. 1084–1098, Apr. 2021, doi: 10.1016/j.spc.2021.01.012.",
        "[3] Rentora Core Architectural Specification and Baseline Digital Appliance Rental Framework, Dept. of CSE, KMIT Technical Report TR-2025-01, 2025.",
        "[4] S. Satapathy et al., “Smart rent portal using recommendation system visualized by augmented reality,” Procedia Comput. Sci., vol. 171, pp. 2480–2489, 2020, doi: 10.1016/j.procs.2020.04.269.",
        "[5] E. Suh, “Machine learning based customer churn prediction in home appliance rental business,” J. Big Data, vol. 10, no. 1, p. 72, May 2023, doi: 10.1186/s40537-023-00721-8.",
        "[6] G. Ke, Q. Meng, T. Finley, T. Wang, W. Chen, W. Ma, Q. Ye, and T.-Y. Liu, “LightGBM: A highly efficient gradient boosting decision tree,” in Proc. NeurIPS 30, 2017, pp. 3146–3154.",
        "[7] L. Breiman, “Random forests,” Mach. Learn., vol. 45, no. 1, pp. 5–32, Oct. 2001, doi: 10.1023/A:1010933404324.",
        "[8] S. M. Lundberg and S.-I. Lee, “A unified approach to interpreting model predictions,” in Proc. NeurIPS 30, 2017, pp. 4765–4774.",
        "[9] S. M. Lundberg et al., “From local explanations to global understanding with explainable AI for trees,” Nat. Mach. Intell., vol. 2, no. 1, pp. 56–67, Jan. 2020, doi: 10.1038/s42256-019-0138-9.",
        "[10] Y. Koren, R. Bell, and C. Volinsky, “Matrix factorization techniques for recommender systems,” Computer, vol. 42, no. 8, pp. 30–37, Aug. 2009, doi: 10.1109/MC.2009.263.",
        "[11] G. Salton and C. Buckley, “Term-weighting approaches in automatic text retrieval,” Inf. Process. Manag., vol. 24, no. 5, pp. 513–523, 1988, doi: 10.1016/0306-4573(88)90021-0.",
        "[12] L. S. Shapley, “A value for n-person games,” in Contributions to the Theory of Games II, H. W. Kuhn and A. W. Tucker, Eds. Princeton Univ. Press, 1953, pp. 307–317.",
        "[13] T. Saito and M. Rehmsmeier, “The precision-recall plot is more informative than the ROC plot when evaluating binary classifiers on imbalanced datasets,” PLoS ONE, vol. 10, no. 3, p. e0118432, Mar. 2015, doi: 10.1371/journal.pone.0118432.",
        "[14] B. Sarwar, G. Karypis, J. Konstan, and J. Riedl, “Item-based collaborative filtering recommendation algorithms,” in Proc. 10th Int. Conf. World Wide Web (WWW), 2001, pp. 285–295, doi: 10.1145/371920.372071.",
        "[15] YBI Foundation, “Bank Churn Modelling dataset (10,000 customers),” github.com/ybifoundation/Dataset, accessed Oct. 2026.",
        "[16] R. Smith, “An overview of the Tesseract OCR engine,” in Proc. 9th Int. Conf. Document Analysis and Recognition (ICDAR), vol. 2, 2007, pp. 629–633, doi: 10.1109/ICDAR.2007.4378789."
    ]

    for ref in refs:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.25)
        p.paragraph_format.first_line_indent = Inches(-0.25)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.05
        r = p.add_run(ref)
        r.font.name = "Times New Roman"
        r.font.size = Pt(8)

    # ─────────────────────────────────────────────────────────────────────────
    # ABBREVIATIONS TABLE
    # ─────────────────────────────────────────────────────────────────────────
    add_sec_heading("ABBREVIATIONS")
    p_ta_lbl = doc.add_paragraph()
    p_ta_lbl.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_ta_lbl.paragraph_format.space_before = Pt(4)
    p_ta_lbl.paragraph_format.space_after = Pt(2)
    r = p_ta_lbl.add_run("TABLE A\nABBREVIATIONS USED IN THIS MANUSCRIPT")
    r.font.name = "Times New Roman"
    r.font.size = Pt(8.5)
    r.font.bold = True

    abbr_data = [
        ["Short Form", "Full Technical Nomenclature"],
        ["API", "Application Programming Interface"],
        ["ETL", "Extract, Transform, Load (Data Processing Pipeline)"],
        ["JWT", "JSON Web Token (RFC 7519 Authorization Token)"],
        ["KYC", "Know Your Customer (Customer Identity Verification)"],
        ["OCR", "Optical Character Recognition (Document Text Extraction)"],
        ["RBAC", "Role-Based Access Control (Granular Route Authorization)"],
        ["REST", "Representational State Transfer (Stateless HTTP Routing)"],
        ["SHAP", "SHapley Additive exPlanations (Cooperative Game Theoretic Attribution)"],
        ["TF-IDF", "Term Frequency–Inverse Document Frequency (Lexical Vector Space)"],
        ["ROC-AUC", "Area Under the Receiver Operating Characteristic Curve"],
        ["PR-AUC", "Area Under the Precision–Recall Curve"],
        ["PSS", "Product-Service Systems (Circular Economy Access Model)"],
        ["P@K, R@K", "Precision and Recall evaluated at Top-K Recommendations"],
        ["ML / AI", "Machine Learning / Artificial Intelligence"]
    ]

    ta = doc.add_table(rows=len(abbr_data), cols=2)
    ta.alignment = WD_TABLE_ALIGNMENT.CENTER
    ta.autofit = False
    for r_idx, row in enumerate(abbr_data):
        for c_idx, val in enumerate(row):
            cell = ta.cell(r_idx, c_idx)
            widths = [Inches(1.8), Inches(4.5)]
            cell.width = widths[c_idx]
            set_cell_margins(cell, 30, 30, 50, 50)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.05
            if r_idx == 0:
                set_cell_background(cell, "1B365D")
                r = p.add_run(val)
                r.font.name = "Times New Roman"
                r.font.size = Pt(8)
                r.font.bold = True
                r.font.color.rgb = RGBColor(255, 255, 255)
            else:
                bg = "F4F6F9" if r_idx % 2 == 1 else "FFFFFF"
                set_cell_background(cell, bg)
                r = p.add_run(val)
                r.font.name = "Times New Roman"
                r.font.size = Pt(7.5)
                if c_idx == 0:
                    r.font.bold = True
    set_table_borders(ta)

    # Save Word document
    os.makedirs(os.path.dirname(output_docx_path), exist_ok=True)
    doc.save(output_docx_path)
    print(f"\n[Success] Formatted manuscript generated at: {output_docx_path}")

if __name__ == "__main__":
    target = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "final_submission", "Rentora_Revised_Research_Paper.docx")
    build_manuscript(target)

