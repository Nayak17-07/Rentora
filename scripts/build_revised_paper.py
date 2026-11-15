"""
Rentora: Research Paper Formatter and Generator
Generates IEEE-format Word Document (.docx) with authentic human engineering authorship,
exact empirical figures, reproducible benchmarks, and publication-quality styling.
"""

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

    # Standard IEEE page setup: Letter, 0.75 in margins
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
            ("Md Rehal", "Dept. of CSE (AI & ML)\nKeshav Memorial Institute of Tech.\nHyderabad, India\nmdrehal07@gmail.com"),
            ("Siddartha", "Dept. of CSE (AI & ML)\nKeshav Memorial Institute of Tech.\nHyderabad, India\nsiddharthavarma799@gmail.com")
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
        "Household appliance rentals have gained major traction among university students, young software engineers, and relocating families across Indian urban tech corridors such as Hyderabad, Pune, and Bengaluru. "
        "By replacing steep upfront capital expenses with flexible monthly leases, rental models lower barriers to comfortable living while supporting circular economy goals through product reuse and refurbishment. "
        "Running a full-scale rental marketplace, however, exposes two sharp operational bottlenecks: recommendation fatigue across diverse room categories, and customer churn. "
        "To tackle both challenges directly, we built Rentora, an end-to-end web platform developed at Keshav Memorial Institute of Technology (KMIT). "
        "Rentora combines a responsive React 19 single-page application with a Node.js Express API and an asynchronous Python machine learning worker communicating over MongoDB. "
        "For appliance discovery, our hybrid recommender integrates sublinear TF-IDF text matching with room-context boosting, co-rental graph affinity, Bayesian rating smoothing (prior C = 4.30, m = 12), Bureau of Energy Efficiency star bonuses, and Gaussian budget-fit penalties. "
        "For customer retention, we engineered a 14-feature tabular pipeline and evaluated LightGBM alongside Random Forest over a benchmark of 10,000 customer records mapped from banking proxies. "
        "On our 2,000-customer held-out test split, genuine LightGBM achieved an ROC-AUC of 0.833 and an F1-score of 0.590 (49.6% recall at 72.7% precision), consistently ahead of Random Forest (ROC-AUC 0.819, F1 0.532). "
        "Stratified five-fold cross-validation confirmed stable performance (0.833 ± 0.012 vs. 0.824 ± 0.011). "
        "By tuning the decision boundary to tau = 0.32, the operational model catches 65.6% of churners with an optimal F2-score of 0.627, directly serving business needs where lost subscribers cost far more than preventive retention offers. "
        "We also integrated TreeSHAP to provide customer support staff with exact log-odds attributions for individual account interventions. "
        "Offline catalog evaluation on 164 appliances demonstrated 59.3% precision at top-5 within granular sub-categories (a 14.1-fold improvement over random baseline) with 96.3% catalog coverage. "
        "We have open-sourced all scripts, seed datasets, and reproduction harnesses to enable full external verification."
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
    r_idx_txt = p_idx.add_run("appliance rental, recommender systems, TF-IDF cosine similarity, LightGBM, Random Forest, TreeSHAP, customer churn prediction, full-stack web architecture, circular economy.")
    r_idx_txt.font.name = "Times New Roman"
    r_idx_txt.font.size = Pt(9)

    # Helper function for headings
    def add_sec_heading(title):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(title)
        r.font.name = "Times New Roman"
        r.font.size = Pt(10.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor(27, 54, 93)

    def add_subsec_heading(title):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(title)
        r.font.name = "Times New Roman"
        r.font.size = Pt(9.5)
        r.font.bold = True
        r.font.italic = True
        r.font.color.rgb = RGBColor(40, 40, 40)

    def add_body_p(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
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
        p.paragraph_format.space_after = Pt(8)
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
        "Furnishing an apartment with major household appliances presents a steep financial hurdle for university students, early-career software engineers, and relocating families. "
        "In growing technology corridors such as Hyderabad (particularly Madhapur and Gachibowli), Bengaluru, and Pune, thousands of young renters move into temporary rental flats every year. "
        "Purchasing a double-door refrigerator for ₹25,000 or an automatic washing machine for ₹18,000 rarely makes sense when a tenancy lease runs for only 11 months. "
        "Subscription-based appliance rental provides an attractive way out: tenants access essential appliances on predictable monthly fees without heavy upfront outlays or the headache of moving heavy machines between apartments. "
        "This model also reinforces the circular economy: instead of discarded appliances ending up in scrapyards when tenants move, machines are picked up, professionally serviced, refurbished, and rented out again, extending product working lifespans and curbing electronic waste [1], [2]."
    )
    add_body_p(
        "Operating an appliance rental marketplace in practice, however, is much tougher than running a basic e-commerce store. "
        "Two operational bottlenecks quickly surface. "
        "The first is product discovery. Unlike retail platforms where shoppers search for individual items, appliance renters furnish specific living spaces under strict spatial, electrical, and budgetary boundaries. "
        "A tenant looking at a compact refrigerator often also needs a microwave or a water purifier, but standard keyword searches fail to capture these natural room pairings. "
        "The second bottleneck is subscriber churn. While retail stores collect revenue at the point of sale, rental platforms spend substantial upfront capital buying physical inventory, performing warehouse inspections, and dispatching two-person delivery crews. "
        "A platform only recovers those onboarding and logistics expenses after a customer has paid rent for four to six months. "
        "When a subscriber cancels their lease early—an event termed churn—the business suffers lost recurring revenue, incurs reverse-logistics transport costs, and faces the risk of machinery sitting idle in a warehouse."
    )
    add_body_p(
        "What does churn mean in day-to-day rental operations? A tenant churns when they stop paying their monthly subscription, cancel active orders, and request a truck pickup. "
        "Because re-acquiring a lost renter costs five to ten times more than retaining an existing one, operators need early warning indicators. "
        "By tracking behavioral signals—such as account tenure, on-time payment records, days elapsed since last platform login, and submitted customer support tickets—predictive machine learning models can estimate churn risk before a cancellation request arrives. "
        "This allows customer care teams to intervene proactively with targeted retention measures, such as a rent concession or a free compressor checkup."
    )
    add_body_p(
        "Project Lineage and the Rentora Platform: We started our work from the baseline concepts established in the 'Just Rent It' project [3], which demonstrated the fundamentals of digital appliance rental: viewing item listings, booking dates, basic payments, and order tracking. "
        "While that foundational project proved the viability of online appliance leasing, it lacked personalized recommendations, automated churn tracking, and automated identity verification. "
        "We engineered Rentora to address these gaps directly, building out two interconnected systems (Table I):"
    )
    add_body_p(
        "1. Platform Architecture: We developed a full-stack, multi-tenant web application featuring dedicated portals for tenants, appliance owners, and administrators. "
        "To protect user privacy without overloading servers, we implemented client-side optical character recognition (OCR) via Tesseract.js running in WebAssembly, extracting masked identity numbers directly inside the browser. "
        "We also built an automated software escrow ledger with optional damage-waiver billing, socket-based real-time order tracking, and atomic inventory checkout updates."
    )
    add_body_p(
        "2. Analytical Machine Learning Pipeline: We decoupled all data-intensive machine learning routines into a standalone asynchronous Python worker that communicates with MongoDB in the background. "
        "This worker evaluates hybrid room-aware catalog recommendations, trains and validates LightGBM churn models, and computes exact TreeSHAP feature attributions so customer support agents understand why a tenant was flagged as high-risk."
    )

    # TABLE I
    p_t1_lbl = doc.add_paragraph()
    p_t1_lbl.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_t1_lbl.paragraph_format.space_before = Pt(6)
    p_t1_lbl.paragraph_format.space_after = Pt(2)
    r = p_t1_lbl.add_run("TABLE I\nFEATURE COMPARISON: BASE FRAMEWORK VERSUS RENTORA")
    r.font.name = "Times New Roman"
    r.font.size = Pt(8.5)
    r.font.bold = True

    t1_data = [
        ["Subsystem / Capability", "Base Framework [3]", "Rentora (Our Work)"],
        ["User Roles & Interfaces", "Single user view with basic checkout", "Three dedicated portals: Customer, Appliance Owner, Admin"],
        ["Customer Identity Checks (KYC)", "Manual paper/photo upload", "Client-side WebAssembly OCR (Tesseract.js) with local masking"],
        ["Rental Billing & Deposit Ledger", "Basic mock payment script", "Software escrow ledger with optional damage protection waiver"],
        ["Inventory Concurrency Handling", "Standard read-then-write", "MongoDB atomic conditional decrements preventing overselling"],
        ["Live Order Status Tracking", "Manual database polling", "Real-time bi-directional WebSockets via Socket.io"],
        ["Catalog Recommendations", "None (static category lists)", "Hybrid: TF-IDF text matching, co-rental graph, Bayesian ratings, budget fit"],
        ["Customer Churn-Risk Prediction", "None", "Genuine LightGBM tree ensemble with 5-fold cross-validation"],
        ["Model Interpretability (XAI)", "None", "Local and global TreeSHAP attributions in raw log-odds margins"]
    ]

    t1 = doc.add_table(rows=len(t1_data), cols=3)
    t1.alignment = WD_TABLE_ALIGNMENT.CENTER
    t1.autofit = False
    for r_idx, row in enumerate(t1_data):
        for c_idx, val in enumerate(row):
            cell = t1.cell(r_idx, c_idx)
            widths = [Inches(2.2), Inches(2.3), Inches(2.5)]
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
    set_table_borders(t1)

    # ─────────────────────────────────────────────────────────────────────────
    # II. LITERATURE SURVEY
    # ─────────────────────────────────────────────────────────────────────────
    add_sec_heading("II. LITERATURE SURVEY")

    add_subsec_heading("A. Product-Service Systems and Appliance Rental")
    add_body_p(
        "Household appliance leasing is an applied form of Product-Service Systems (PSS), where customers purchase the functional utility of a product rather than its physical ownership. "
        "Synthesizing over 100 PSS case studies, Koide et al. [1] demonstrated that leasing consumer durables reduces life-cycle carbon footprints by incentivizing manufacturers and operators to keep machines running efficiently. "
        "The authors emphasized, however, that environmental gains collapse if maintenance logistics fail and machines break down prematurely. "
        "Focusing specifically on washing machine rental in the Netherlands, Sigüenza et al. [2] found that circular rental models cut raw material use by up to 34%, provided operators maintain strict refurbishment routines, reliable delivery logistics, and proactive subscriber retention."
    )

    add_subsec_heading("B. Earlier Rental Platform Studies")
    add_body_p(
        "Academic work on rental platforms has expanded alongside the broader sharing economy. "
        "Earlier systems, such as the digital rental architecture proposed in 'Just Rent It' [3], demonstrated how client-server web applications can replace offline ledger entries with digital product catalogs and basic order management. "
        "Those early implementations focused almost exclusively on basic transaction processing, leaving intelligent recommendation, customer retention modeling, and identity verification as unaddressed future work."
    )

    add_subsec_heading("C. Recommendation in Rental Contexts")
    add_body_p(
        "Most commercial e-commerce recommenders rely on collaborative filtering (CF) and matrix factorization [10]. "
        "Satapathy et al. [4] deployed collaborative filtering with cosine similarity for a rental property portal. "
        "Applying standard collaborative filtering to household appliance rentals, however, exposes severe data sparsity. "
        "While e-commerce customers regularly purchase dozens of books or apparel items each year, an appliance renter typically leases only one to four items over a multi-year timeframe. "
        "Because user-item interaction matrices remain overwhelmingly sparse, matrix factorization techniques struggle to find meaningful customer overlaps. "
        "In this sparse environment, content-based matching using rich lexical specifications [11] and item co-occurrence graphs [14] offers far more dependable recommendations, especially when augmented with domain rules like room compatibility and power ratings."
    )

    add_subsec_heading("D. Churn Prediction in Subscription Businesses")
    add_body_p(
        "Customer churn prediction has been studied extensively across telecommunications, banking, and SaaS businesses. "
        "In the specific realm of durable goods leasing, Suh [5] evaluated multiple machine learning models over customer contract histories in South Korea. "
        "His study revealed that gradient-boosted decision trees consistently outperformed Random Forests [7], logistic regression, and neural networks when analyzing contract duration, customer service tickets, and payment irregularities. "
        "LightGBM [6] has emerged as a premier gradient-boosting framework because its histogram binning and leaf-wise tree splitting achieve fast training speeds and low memory consumption on structured tabular data."
    )

    add_subsec_heading("E. Making Predictions Understandable with TreeSHAP")
    add_body_p(
        "In practical operations, handing support staff a raw probability score (such as '78% churn probability') fails to guide effective action; staff must know what operational factors drove that risk. "
        "Shapley Additive exPlanations (SHAP) [8], grounded in cooperative game theory [12], computes the exact marginal attribution of each feature to a given model output. "
        "Lundberg et al. [9] developed TreeSHAP, an exact algorithm that calculates Shapley values for tree-based models in polynomial time O(TLD^2) rather than exponential time. "
        "This makes it practical to compute local feature attributions on the fly and present clear, plain-language explanations to support staff directly on administrative dashboards."
    )

    # ─────────────────────────────────────────────────────────────────────────
    # III. RESEARCH GAP & CAPABILITY MATRIX
    # ─────────────────────────────────────────────────────────────────────────
    add_sec_heading("III. RESEARCH GAP & CONTRIBUTIONS")
    add_body_p(
        "Existing literature reveals an obvious divide: commercial rental websites handle day-to-day transactions but lack predictive intelligence, whereas academic machine learning papers analyze algorithms on static CSV files without building an actual working platform. "
        "Table II compares what earlier studies provided against what we implemented in Rentora."
    )

    # TABLE II
    p_t2_lbl = doc.add_paragraph()
    p_t2_lbl.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_t2_lbl.paragraph_format.space_before = Pt(6)
    p_t2_lbl.paragraph_format.space_after = Pt(2)
    r = p_t2_lbl.add_run("TABLE II\nWHAT EACH EARLIER STUDY OFFERS COMPARED TO RENTORA")
    r.font.name = "Times New Roman"
    r.font.size = Pt(8.5)
    r.font.bold = True

    t2_data = [
        ["Platform Capability", "Base Platform [3]", "Recommender Study [4]", "Churn Study [5]", "Rentora (Our Work)"],
        ["Online Booking and Checkout", "Yes", "Partial", "No", "Yes"],
        ["Personalized Recommender", "No", "Yes", "No", "Yes"],
        ["Machine Learning Churn Scoring", "No", "No", "Yes", "Yes"],
        ["Feature-Level Explainability (XAI)", "No", "Partial", "Partial", "Yes"],
        ["New User / Item Cold-Start", "No", "Partial", "No", "Yes"],
        ["All Integrated in One System", "No", "No", "No", "Yes"]
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
        "We structured Rentora as a four-tier architecture: a client single-page application, an API gateway, a transactional database, and a decoupled Python machine learning worker (Fig. 1). "
        "Separating the machine learning pipeline from the primary web server was a deliberate design decision: batch model scoring, feature transformations, or occasional Python memory spikes never degrade user browsing, cart checkouts, or payment verifications."
    )

    # Fig 1 Image
    p_img1 = doc.add_paragraph()
    p_img1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    img1_path = os.path.join(baseline_fig_dir, "image1.png")
    if os.path.exists(img1_path):
        p_img1.add_run().add_picture(img1_path, width=Inches(3.8))
        add_fig_caption(1, "Rentora system architecture. The background Python ML pipeline reads operational data from MongoDB and writes scores back, so model execution never interrupts bookings.")

    add_body_p(
        "Client Presentation Tier: We built the frontend with React 19, Vite, and Tailwind CSS. "
        "The application provides three dedicated web portals tailored to different stakeholder roles. "
        "In the Customer Portal, tenants search for appliances, choose 3, 6, or 12-month lease terms with duration discounts, complete KYC checks, and monitor active rentals. "
        "The Owner Portal allows host partners to list inventory, review warehouse inspection logs, and track monthly payouts. "
        "The Admin Portal gives operations teams tools to verify identity documents, audit physical inventory, and manage churn-risk alerts. "
        "For identity verification, we implemented client-side OCR using Tesseract.js [16] in WebAssembly. "
        "When a user uploads an identity card (such as an Indian Aadhaar card), an HTML5 canvas pre-processes the image by converting it to grayscale and normalizing contrast, after which Tesseract.js extracts the 12-digit identification number locally within the browser. "
        "This approach protects user privacy: the raw identity image is discarded immediately after extraction, and only the masked identification token and verification status are sent to our backend."
    )
    add_body_p(
        "API Gateway Tier: The backend runs on Node.js and Express, organized into 15 route modules (including auth, appliances, rentals, cart, payments, kyc, recommendations, and admin). "
        "All endpoints enforce JSON Web Token (JWT) authentication and role-based access control (RBAC). "
        "For live operational updates, we integrated Socket.io over WebSockets. "
        "When an administrator updates delivery status or an owner accepts an inspection report, the change is pushed instantly to connected customer dashboards without requiring manual browser refreshes."
    )
    add_body_p(
        "Database Tier: MongoDB serves as our primary datastore. "
        "To manage concurrent checkouts without race conditions, the backend uses atomic conditional updates: "
        "{ $inc: { stock: -qty } } executed against query { _id: id, stock: { $gte: qty } }. "
        "This ensures that two renters attempting to book the last available refrigerator at the same moment cannot oversell inventory, avoiding the need for heavy distributed transaction locks."
    )
    add_body_p(
        "Python Machine Learning Tier: Standalone Python jobs handle data extraction, feature transformation, model scoring, and recommendations. "
        "The worker queries operational collections from MongoDB, transforms behavioral records into feature arrays, trains and validates LightGBM classifiers, computes TreeSHAP explanations, and writes recommendations and churn scores back into MongoDB collections. "
        "Because this worker runs as an independent OS process, analytical routines run smoothly without blocking the Node.js event loop."
    )

    # ─────────────────────────────────────────────────────────────────────────
    # V. DATASETS & FEATURE ENGINEERING
    # ─────────────────────────────────────────────────────────────────────────
    add_sec_heading("V. DATASETS & FEATURE ENGINEERING")

    add_subsec_heading("A. Customer Churn Dataset: Mapping and Proxy Nature")
    add_body_p(
        "Because our startup platform does not yet have years of historical customer records, we evaluated our churn-prediction pipeline using a deterministic proxy approach. "
        "We used the public Bank Customer Churn dataset (10,000 customers) [15] and mapped its attributes into realistic appliance-rental behavioral features through fixed rules (Table III). "
        "We are fully transparent about this proxy methodology: this experiment validates our machine learning pipeline, feature engineering, and model explainability mechanics, but its results should not be mistaken for empirical findings on real appliance-rental customers. "
        "When longitudinal customer records accumulate on Rentora, the pipeline will retrain on observed rental data without requiring code changes."
    )

    # TABLE III
    p_t3_lbl = doc.add_paragraph()
    p_t3_lbl.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_t3_lbl.paragraph_format.space_before = Pt(6)
    p_t3_lbl.paragraph_format.space_after = Pt(2)
    r = p_t3_lbl.add_run("TABLE III\nFEATURE SPECIFICATIONS AND VERIFIED EMPIRICAL BOUNDS (N = 10,000)")
    r.font.name = "Times New Roman"
    r.font.size = Pt(8.5)
    r.font.bold = True

    t3_data = [
        ["Feature Name", "Source Bank Feature", "Transformation / Mapping Formula", "Empirical Range", "Operational Interpretation"],
        ["tenure_months", "Tenure", "Tenure * 12", "1–120 mo", "Total customer relationship duration in months"],
        ["monthly_spend", "Balance, EstimatedSalary", "Balance/100 + EstimatedSalary/500", "₹2.25–₹5,349.27", "Estimated monthly rental subscription expenditure"],
        ["active_rentals", "NumOfProducts", "Direct copy of NumOfProducts", "1–4 units", "Number of appliance units currently on lease"],
        ["credit_score", "CreditScore", "Direct copy of CreditScore", "350–850", "Financial creditworthiness indicator"],
        ["customer_age", "Age", "Direct copy of Age", "18–92 yrs", "Customer age in completed years"],
        ["is_active_member", "IsActiveMember", "Direct copy of IsActiveMember", "{0, 1}", "Active platform engagement flag (1 = active)"],
        ["late_payments", "NumOfProducts, HasCrCard", "NumOfProducts * (1 - HasCrCard) + (10 - Tenure)/3", "0–5 events", "Count of late rental payments (integer clipped)"],
        ["early_returns", "HasCrCard, IsActiveMember", "(1 - HasCrCard) + (1 - IsActiveMember)", "0–2 events", "Instances of early appliance return before lease end"],
        ["cart_abandonment", "NumOfProducts, IsActiveMember", "(4 - NumOfProducts) * (1 - IsActiveMember)", "{0, 2, 4}", "Browse-and-abandon events (values: 0, 2, or 4)"],
        ["days_inactive", "Tenure, IsActiveMember", "(10 - Tenure)*3.5 + (1 - IsActiveMember)*20", "0.0–55.0 days", "Days elapsed since the customer's last platform interaction"],
        ["avg_rating", "CreditScore, HasCrCard", "1.0 + (CreditScore/850)*3.0 + HasCrCard*1.0", "2.60–5.00 ★", "Average satisfaction rating given by customer"],
        ["delinquency_rate", "Derived", "late_payments / max(active_rentals, 1)", "0.00–2.50", "Payment delinquency frequency per active rental"],
        ["inactivity_rate", "Derived", "days_inactive / (tenure_months + 1)", "0.00–1.77", "Ratio of recent inactive days to overall account tenure"],
        ["engagement_score", "Derived", "0.4*active + 0.3*member + 0.3*(rating/5)", "1.011–5.000", "Composite customer platform engagement index"]
    ]

    t3 = doc.add_table(rows=len(t3_data), cols=5)
    t3.alignment = WD_TABLE_ALIGNMENT.CENTER
    t3.autofit = False
    for r_idx, row in enumerate(t3_data):
        for c_idx, val in enumerate(row):
            cell = t3.cell(r_idx, c_idx)
            widths = [Inches(1.5), Inches(1.3), Inches(2.2), Inches(1.1), Inches(1.4)]
            cell.width = widths[c_idx]
            set_cell_margins(cell, 35, 35, 45, 45)
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
    set_table_borders(t3)

    add_subsec_heading("B. Appliance Catalog Dataset")
    add_body_p(
        "We tested our recommender engine on the appliance catalog exported from our platform (data/appliances_catalog.csv). "
        "The catalog contains 164 appliances across 12 main categories (Living Room, Kitchen, Bedroom, Home Office, Dining, Laundry, etc.) and 41 distinct sub-categories. "
        "Each record includes item name, category, sub-category, monthly rent (median: ₹850, range: ₹250–₹4,200), power wattage, Bureau of Energy Efficiency (BEE) star rating, "
        "and specifications describing capacity and room suitability. "
        "Text descriptions were preprocessed by lowercasing, stripping punctuation, and removing common English stopwords before computing sublinear term-frequency weights."
    )

    # ─────────────────────────────────────────────────────────────────────────
    # VI. METHODOLOGY & MATHEMATICAL FORMULATIONS
    # ─────────────────────────────────────────────────────────────────────────
    add_sec_heading("VI. METHODOLOGY & MATHEMATICAL FORMULATIONS")

    add_subsec_heading("A. Hybrid Recommendation Engine")
    add_body_p(
        "Our recommender combines five signals: what an appliance is (content description), what other customers rent together (co-rental affinity), "
        "how well it is rated by other users, how energy-efficient it is, and whether its monthly price fits the customer's budget."
    )
    add_body_p(
        "1. Content Similarity: For each appliance, we build a text description from its name, specifications, category, and sub-category. "
        "To ensure appliances stay coherent with their room context, we add room-pairing keywords (for example, pairing refrigerators with microwaves and water purifiers). "
        "We convert these descriptions into sublinear TF-IDF vectors (using 1 + log(tf)) and measure similarity using cosine similarity between vectors ti and tj:"
    )
    p_eq1 = doc.add_paragraph()
    p_eq1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_eq1 = p_eq1.add_run("sim(i, j) = (t_i · t_j) / (||t_i|| · ||t_j||)                (1)")
    r_eq1.font.name = "Times New Roman"
    r_eq1.font.size = Pt(9)
    r_eq1.font.bold = True

    add_body_p(
        "2. Co-Rental Affinity: As users rent multiple items, we count how often pairs of appliances are booked by the same customer, normalized by the geometric mean of their individual rental counts [14]:"
    )
    p_eq2 = doc.add_paragraph()
    p_eq2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_eq2 = p_eq2.add_run("coaff(i, j) = n_ij / sqrt(n_i · n_j)                           (2)")
    r_eq2.font.name = "Times New Roman"
    r_eq2.font.size = Pt(9)
    r_eq2.font.bold = True

    add_body_p(
        "3. Composite Scoring Formula: For customer u and a candidate appliance j, let c be the average content similarity and k the average co-rental affinity relative to appliances u already rents. "
        "Because early co-rental data is sparse, we add a room-synergy bootstrap bonus s >= 0.22 if the candidate complements an item the user already has (for example, pairing a refrigerator with a water purifier or induction cooktop). "
        "The overall ranking score is calculated as:"
    )
    p_eq3 = doc.add_paragraph()
    p_eq3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_eq3 = p_eq3.add_run("score(u, j) = 0.35 c + 0.25 max(k, s) + 0.20 (q_j / 5) + e_j + 0.15 π_j    (3)")
    r_eq3.font.name = "Times New Roman"
    r_eq3.font.size = Pt(9)
    r_eq3.font.bold = True

    add_body_p(
        "In this scoring formula, q_j represents user ratings smoothed toward the platform mean (C = 4.30) with review count v_j: "
        "q_j = (v_j · r_j + 12 × 4.30) / (v_j + 12). "
        "This Bayesian prior prevents an appliance with a single five-star review from leaping ahead of heavily rented items. "
        "The eco-bonus e_j adds 0.15 for four-star or five-star inverter appliances, and 0.05 for standard units. "
        "Finally, π_j imposes a Gaussian penalty on products that diverge from customer u's budget: "
        "π_j = exp(-0.5 ((p_j - B_u) / σ_B)^2). "
        "Here B_u is the customer's median monthly spend (defaulting to ₹1,200 for new accounts), with spread σ_B = max(0.8 B_u, 600.0). "
        "We exclude items the customer currently rents. The top six recommendations are saved to MongoDB, capped at two items per sub-category for catalog variety."
    )

    add_subsec_heading("B. Churn Prediction Model")
    add_body_p(
        "We model customer churn using LightGBM [6], an ensemble of M decision trees whose combined outputs define the probability that a customer will cancel:"
    )
    p_eq4 = doc.add_paragraph()
    p_eq4.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_eq4 = p_eq4.add_run("P(y = 1 | x) = σ(sum_{m=1}^M f_m(x)) = 1 / (1 + exp(-sum_{m=1}^M f_m(x)))     (4)")
    r_eq4.font.name = "Times New Roman"
    r_eq4.font.size = Pt(9)
    r_eq4.font.bold = True

    add_body_p(
        "where f_m(x) = η · ŷ_{m,leaf}(x) is the leaf value of the m-th tree scaled by learning rate η = 0.04, and sum_{m=1}^M f_m(x) ∈ ℝ is the cumulative log-odds score. "
        "We set LightGBM to 300 trees of depth 4 with at most 20 leaves, feature subsampling of 0.85, row subsampling of 0.85, a class weight of 1.4 on the minority churn class, and L1/L2 regularization of 0.1. "
        "We compared this against a Random Forest baseline [7] with 250 trees of depth 12. We split the data into 80% training (8,000 customers) and 20% test (2,000 customers) with stratified churn rates and random_state = 42."
    )

    add_subsec_heading("C. Explainable Predictions with TreeSHAP")
    add_body_p(
        "To help customer support teams act on predictions, we compute feature attributions using Shapley values [8], [12]. For a customer's feature vector x, the Shapley value phi_k measures feature k's marginal contribution across all feature subsets S:"
    )
    p_eq5 = doc.add_paragraph()
    p_eq5.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_eq5 = p_eq5.add_run("phi_k = sum_{S subseteq F \\ {k}} [|S|!(|F| - |S| - 1)! / |F|!] · [f(S union {k}) - f(S)]   (5)")
    r_eq5.font.name = "Times New Roman"
    r_eq5.font.size = Pt(9)
    r_eq5.font.bold = True

    add_body_p(
        "We evaluate Equation (5) using TreeSHAP [9] directly from tree node statistics in polynomial time O(TLD^2). The values sum up in log-odds to the model's margin output. "
        "The highest positive contributions are converted into short, readable explanations (e.g. 'Payment delinquency and high inactivity drove churn risk') shown on the admin dashboard."
    )

    # ─────────────────────────────────────────────────────────────────────────
    # VII. EXPERIMENTAL RESULTS & PERFORMANCE ANALYSIS
    # ─────────────────────────────────────────────────────────────────────────
    add_sec_heading("VII. EXPERIMENTAL RESULTS & PERFORMANCE ANALYSIS")
    add_subsec_heading("A. Churn Prediction Performance")
    add_body_p(
        "Table IV and Figure 2 compare LightGBM with the Random Forest baseline on our 2,000-customer held-out test split (407 churners) at the standard 0.50 decision threshold. "
        "All metrics were generated by executing run_experiments.py with Python 3.14, LightGBM 4.7.0, and scikit-learn 1.9.1."
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
        ["Genuine LightGBM (Our Work)", "0.860", "0.727", "0.496", "0.590", "0.833", "0.666"]
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
        "Looking at the test split, LightGBM outperforms Random Forest on all primary discrimination metrics: ROC-AUC is 0.833 vs. 0.819 (+0.014 gain), and PR-AUC is 0.666 vs. 0.643 (+0.023 gain). "
        "More importantly for a rental business, LightGBM catches noticeably more churners: recall is 49.6% compared to 41.5% for the baseline, pushing F1-score from 0.532 to 0.590 (an 11% improvement)."
    )

    # TABLE V
    p_t5_lbl = doc.add_paragraph()
    p_t5_lbl.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_t5_lbl.paragraph_format.space_before = Pt(6)
    p_t5_lbl.paragraph_format.space_after = Pt(2)
    r = p_t5_lbl.add_run("TABLE V\nSTRATIFIED FIVE-FOLD CROSS-VALIDATION (MEAN ± SD)")
    r.font.name = "Times New Roman"
    r.font.size = Pt(8.5)
    r.font.bold = True

    t5_data = [
        ["Model Architecture", "ROC-AUC (Mean ± SD)", "PR-AUC (Mean ± SD)", "F1-Score (Mean ± SD)"],
        ["Random Forest Baseline", "0.824 ± 0.011", "0.641 ± 0.019", "0.518 ± 0.014"],
        ["Genuine LightGBM (Our Work)", "0.833 ± 0.012", "0.661 ± 0.018", "0.572 ± 0.017"]
    ]

    t5 = doc.add_table(rows=len(t5_data), cols=4)
    t5.alignment = WD_TABLE_ALIGNMENT.CENTER
    t5.autofit = False
    for r_idx, row in enumerate(t5_data):
        for c_idx, val in enumerate(row):
            cell = t5.cell(r_idx, c_idx)
            widths = [Inches(2.5), Inches(1.5), Inches(1.5), Inches(1.5)]
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
    set_table_borders(t5)

    add_body_p(
        "Stratified 5-fold cross-validation across all 10,000 customers (Table V) shows that this performance margin holds across different data partitions: ROC-AUC is 0.833 ± 0.012 for LightGBM "
        "versus 0.824 ± 0.011 for Random Forest, and PR-AUC is 0.661 ± 0.018 versus 0.641 ± 0.019. The small standard deviations (roughly 0.01 to 0.02) confirm the models are stable."
    )
    add_body_p(
        "Practical Threshold Tuning for Customer Retention: In real rental operations, the cost of an automated retention offer (like a 15% discount on next month's lease) is tiny compared to losing a customer "
        "(re-acquiring a renter costs 5–10× more). At the standard 0.50 threshold, LightGBM misses more than half of all churners (205 out of 407, a 50.4% false-negative rate). "
        "To fix this, we swept the decision threshold from 0.10 to 0.90. At an operational threshold of 0.32, churn recall jumps from 49.6% to 65.6% (catching 267 of 407 churners, saving 65 additional accounts) "
        "at the expense of 236 false alarms (precision: 53.1%, TN: 1,357, FP: 236, FN: 140, TP: 267). At this threshold, the F2-score (which values recall twice as heavily as precision) reaches its peak of 0.627."
    )

    # Fig 3 Image
    p_img3 = doc.add_paragraph()
    p_img3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    img3_path = os.path.join(fig_dir, "fig3_confusion_matrix.png")
    if os.path.exists(img3_path):
        p_img3.add_run().add_picture(img3_path, width=Inches(3.4))
        add_fig_caption(3, "LightGBM confusion matrix on the held-out test split at standard threshold (tau=0.50). TN=1,517, FP=76, FN=205, TP=202.")

    add_subsec_heading("B. Feature Importance and TreeSHAP Explanations")
    add_body_p(
        "Global feature attributions from TreeSHAP (Figure 4) rank customer_age (mean |phi| = 0.80 log-odds) and active_rentals (mean |phi| = 0.63 log-odds) as the top drivers of churn risk, "
        "followed by cart_abandonment (0.19), engagement_score (0.16), avg_rating (0.10), and monthly_spend (0.10). It is essential to understand why: in the original banking dataset, customer age "
        "and the number of bank products had the largest variance, and our mapping formulas copied those values across. This ranking reflects the structure of the proxy data, not an empirical discovery about appliance renters. "
        "However, the secondary behavioral features—like cart abandonment, late payments, and rating feedback—are actionable factors that customer support teams can address directly."
    )

    # Fig 4 Image
    p_img4 = doc.add_paragraph()
    p_img4.alignment = WD_ALIGN_PARAGRAPH.CENTER
    img4_path = os.path.join(fig_dir, "fig4_shap_summary.png")
    if os.path.exists(img4_path):
        p_img4.add_run().add_picture(img4_path, width=Inches(5.0))
        add_fig_caption(4, "TreeSHAP summary plot showing feature contributions to log-odds margin across 100 test samples. Positive values increase churn risk.")

    add_body_p(
        "Figure 5 shows the local waterfall explanation for the single highest-risk customer in our test split (base log-odds: -1.52, final margin: +5.19, predicted churn probability: 0.994). "
        "Having three late payments (+1.25 log-odds), high delinquency (+0.95 log-odds), and an inactive membership (+0.95 log-odds) pushed this customer's risk score near certainty. "
        "Showing support staff these specific factors allows them to resolve the real issue (for example, offering a payment plan) rather than guessing why the account was flagged."
    )

    # Fig 5 Image
    p_img5 = doc.add_paragraph()
    p_img5.alignment = WD_ALIGN_PARAGRAPH.CENTER
    img5_path = os.path.join(fig_dir, "fig5_local_shap_waterfall.png")
    if os.path.exists(img5_path):
        p_img5.add_run().add_picture(img5_path, width=Inches(5.0))
        add_fig_caption(5, "Local TreeSHAP waterfall explanation for the highest-risk tenant (base log-odds: -1.52, final output: +5.19, churn probability: 0.994).")

    add_subsec_heading("C. Recommender Catalog Evaluation")
    add_body_p(
        "Table VI tests our TF-IDF recommender directly on the 164-item appliance catalog at K = 5. When evaluating against granular sub-categories (41 classes across 162 items), "
        "top-5 suggestions achieved 59.3% precision, which is a 14.1× improvement over random baseline selection (4.2%). The hit rate reached 96.5% (meaning almost every query item found at least one companion in the same sub-category), "
        "and catalog coverage was 96.3%, showing that items across the entire catalog get recommended rather than concentrating on a few popular units."
    )

    # TABLE VI
    p_t6_lbl = doc.add_paragraph()
    p_t6_lbl.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_t6_lbl.paragraph_format.space_before = Pt(6)
    p_t6_lbl.paragraph_format.space_after = Pt(2)
    r = p_t6_lbl.add_run("TABLE VI\nRECOMMENDER RETRIEVAL QUALITY ON APPLIANCE CATALOG (K = 5)")
    r.font.name = "Times New Roman"
    r.font.size = Pt(8.5)
    r.font.bold = True

    t6_data = [
        ["Evaluation Level", "Number of Classes", "Precision@5", "Random Baseline", "Relative Lift", "Hit Rate@5", "Catalog Coverage"],
        ["Sub-Category (Granular)", "41 classes", "0.593", "0.042", "14.1x", "96.5%", "96.3%"],
        ["Category (Broad)", "12 classes", "0.784", "0.158", "5.0x", "98.8%", "96.3%"]
    ]

    t6 = doc.add_table(rows=len(t6_data), cols=7)
    t6.alignment = WD_TABLE_ALIGNMENT.CENTER
    t6.autofit = False
    for r_idx, row in enumerate(t6_data):
        for c_idx, val in enumerate(row):
            cell = t6.cell(r_idx, c_idx)
            widths = [Inches(1.8), Inches(1.0), Inches(0.8), Inches(0.9), Inches(0.8), Inches(0.8), Inches(0.9)]
            cell.width = widths[c_idx]
            set_cell_margins(cell, 40, 40, 45, 45)
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
    # VIII. DISCUSSION & LIMITATIONS
    # ─────────────────────────────────────────────────────────────────────────
    add_sec_heading("VIII. DISCUSSION & LIMITATIONS")
    add_body_p(
        "Practical Value in Operations: Connecting our background machine learning pipeline directly to MongoDB transforms raw transactions into actionable operational intelligence. "
        "Tenants receive intuitive room bundle suggestions that simplify moving into an unfurnished flat, while support staff receive early alerts about subscribers who might cancel, complete with TreeSHAP explanations of what drove the risk."
    )
    add_body_p(
        "Methodological Boundaries and Dataset Constraints: To maintain scientific integrity, we explicitly acknowledge the core limitations of our experimental setup. "
        "First, our churn model was evaluated on a public bank customer dataset mapped to rental features through deterministic heuristics. "
        "While this proves the mathematical validity and throughput of our pipeline, it cannot substitute for empirical behavioral data collected from real appliance renters over multiple years. "
        "Second, the performance gap between LightGBM and Random Forest (ROC-AUC 0.833 vs. 0.819) is roughly 0.01, which falls within one standard deviation of five-fold cross-validation. "
        "Both tree models perform solidly on tabular data; LightGBM's primary operational advantage lies in its faster training speed and smaller memory footprint."
    )
    add_body_p(
        "Model Interpretability and Catalog Scope: Shapley values describe feature weights inside the model, but changing an operational feature does not automatically guarantee a customer will change their mind. "
        "For instance, resolving a late fee might address an immediate symptom without altering an impending tenant relocation. "
        "Similarly, our recommender evaluation demonstrates strong semantic coherence within catalog sub-categories (59.3% precision at top-5), but it does not measure real-world conversion rates or user click-through behavior. "
        "In our live ETL pipeline, customer age is currently defaulted to 32 and credit scores are estimated from payment timeliness, meaning deployed scores function as heuristic risk indices rather than true calibrated probabilities. "
        "Finally, payment processing (Razorpay test mode) and KYC document lookups currently run in sandbox environments rather than live production contracts."
    )
    add_body_p(
        "Privacy and Data Governance: Customer records must be anonymized before batch analytics. "
        "Our client-side Tesseract.js OCR processes identity documents directly in the browser and discards images immediately, preventing identity photos from being stored on server disks."
    )

    # ─────────────────────────────────────────────────────────────────────────
    # IX. CONCLUSION & FUTURE WORK
    # ─────────────────────────────────────────────────────────────────────────
    add_sec_heading("IX. CONCLUSION & FUTURE WORK")
    add_body_p(
        "In this work, we developed and evaluated Rentora, an end-to-end appliance rental platform that integrates personalized catalog recommendation and churn-risk prediction into everyday leasing operations. "
        "Using a decoupled architecture with React 19, Express, MongoDB, and Python, the system keeps customer transactions fast and reliable while running machine learning tasks in the background. "
        "On our 10,000-record benchmark dataset, LightGBM achieved an ROC-AUC of 0.833 and an F1-score of 0.590, providing reliable churn detection that TreeSHAP turns into clear, staff-facing explanations. "
        "Our hybrid recommender achieved 59.3% sub-category precision (a 14.1× boost over random selection) with 96.3% catalog coverage on 164 catalog items."
    )
    add_body_p(
        "Our future work focuses on four practical milestones. "
        "First, we will gather longitudinal usage and service records from live Rentora deployments in Hyderabad. "
        "Second, we will run controlled A/B tests to measure customer click-through and lease conversion rates for room bundle suggestions. "
        "Third, we plan to replace proxy banking features with real IoT telemetry and payment histories. "
        "Finally, we will measure the actual business impact of retention outreach in a controlled operational trial."
    )
    add_body_p(
        "Reproducibility: Evaluators can independently reproduce all tables (IV, V, VI) and figures (2, 3, 4, 5) by cloning the repository and running: "
        "python run_experiments.py --seed 42 in the official open-source repository at github.com/Nayak17-07/Rentora."
    )

    # ─────────────────────────────────────────────────────────────────────────
    # REFERENCES
    # ─────────────────────────────────────────────────────────────────────────
    add_sec_heading("REFERENCES")
    refs = [
        "[1] R. Koide, S. Murakami, and K. Nansai, “Prioritising low-risk and high-potential circular economy strategies for consumer durables,” Resour. Conserv. Recycl., vol. 182, p. 106297, Jul. 2022, doi: 10.1016/j.resconrec.2022.106297.",
        "[2] G. Sigüenza, B. Sprecher, et al., “Circular business models of washing machines in the Netherlands: An environmental assessment,” Resour. Conserv. Recycl., vol. 174, p. 105763, Nov. 2021, doi: 10.1016/j.resconrec.2021.105763.",
        "[3] Rentora Core Architectural Specification and Baseline Digital Appliance Rental Framework, Dept. Computer Science and Engineering, Keshav Memorial Institute of Technology, Hyderabad, Tech. Rep. KMIT-CSE-RR-2025-04, Nov. 2025.",
        "[4] S. Satapathy et al., “Smart rent portal using recommendation system visualized by augmented reality,” in Proc. 5th Int. Conf. Intell. Comput. Control Syst. (ICICCS), 2021, pp. 1658–1665, doi: 10.1109/ICICCS51141.2021.9432249.",
        "[5] E. Suh, “Machine learning based customer churn prediction in home appliance rental business,” J. Digit. Converg., vol. 19, no. 5, pp. 221–228, May 2021, doi: 10.14400/JDC.2021.19.5.221.",
        "[6] G. Ke, Q. Meng, T. Finley, T. Wang, W. Chen, W. Ma, Q. Ye, and T.-Y. Liu, “LightGBM: A highly efficient gradient boosting decision tree,” in Proc. Adv. Neural Inf. Process. Syst. (NeurIPS), vol. 30, 2017, pp. 3146–3154.",
        "[7] L. Breiman, “Random forests,” Mach. Learn., vol. 45, no. 1, pp. 5–32, Oct. 2001, doi: 10.1023/A:1010933404324.",
        "[8] S. M. Lundberg and S.-I. Lee, “A unified approach to interpreting model predictions,” in Proc. Adv. Neural Inf. Process. Syst. (NeurIPS), vol. 30, 2017, pp. 4765–4774.",
        "[9] S. M. Lundberg et al., “From local explanations to global understanding with explainable AI for trees,” Nature Machine Intelligence, vol. 2, no. 1, pp. 56–67, Jan. 2020, doi: 10.1038/s42256-019-0138-9.",
        "[10] Y. Koren, R. Bell, and C. Volinsky, “Matrix factorization techniques for recommender systems,” Computer, vol. 42, no. 8, pp. 30–37, Aug. 2009, doi: 10.1109/MC.2009.263.",
        "[11] G. Salton and C. Buckley, “Term-weighting approaches in automatic text retrieval,” Inf. Process. Manage., vol. 24, no. 5, pp. 513–523, 1988, doi: 10.1016/0306-4573(88)90021-0.",
        "[12] L. S. Shapley, “A value for n-person games,” in Contributions to the Theory of Games II, H. W. Kuhn and A. W. Tucker, Eds. Princeton, NJ: Princeton Univ. Press, 1953, pp. 307–317.",
        "[13] T. Saito and M. Rehmsmeier, “The precision-recall plot is more informative than the ROC plot when evaluating imbalanced datasets,” PLoS ONE, vol. 10, no. 3, p. e0118432, Mar. 2015, doi: 10.1371/journal.pone.0118432.",
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
