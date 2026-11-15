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
        "Renting household appliances has become a practical choice for college students, young professionals, and relocating families who want to avoid large upfront expenses. "
        "From an environmental standpoint, appliance rental also supports circular economy goals by keeping machines serviced and in use across multiple households. "
        "However, running an appliance rental service comes with two real operational headaches: helping users quickly discover items that match their room layout and budget without endless scrolling, "
        "and spotting when existing renters are about to cancel their subscriptions so customer support can step in. "
        "In this paper, we present Rentora, an end-to-end web platform developed at Keshav Memorial Institute of Technology (KMIT) that integrates recommendation and churn-risk prediction directly into everyday rental operations. "
        "We built the platform using React 19 on Vite, a Node.js Express API with role-based access control, a MongoDB database with atomic stock updates, and a background Python machine learning pipeline. "
        "Our recommendation service ranks catalog items using sublinear TF-IDF text similarity with room-category boosting, co-rental patterns, Bayesian-smoothed user ratings (prior C=4.30, m=12), energy-efficiency bonuses, and budget fit. "
        "For churn prediction, we trained a LightGBM gradient-boosted tree model alongside a Random Forest baseline on an engineered dataset of 10,000 customer records mapped from the public Bank Customer Churn benchmark. "
        "On our 2,000-customer held-out test split, LightGBM achieved an ROC-AUC of 0.833 and an F1-score of 0.590 (catching 49.6% of churners with 72.7% precision), outperforming Random Forest (ROC-AUC 0.819, F1 0.532). "
        "Stratified 5-fold cross-validation confirmed consistent results (0.833 ± 0.012 vs. 0.824 ± 0.011). We also used TreeSHAP to give support agents clear, log-odds feature explanations for each customer's risk score. "
        "Evaluating our recommender on our 164-item appliance catalog showed 59.3% precision at top-5 for specific sub-categories compared to 4.2% random chance (a 14.1× improvement), with 96.3% catalog coverage. "
        "All code, seed datasets, and reproducibility scripts are available in our open repository."
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
    r_idx_txt = p_idx.add_run("appliance rental, recommender systems, TF-IDF cosine similarity, LightGBM, Random Forest, TreeSHAP, customer churn prediction, full-stack web architecture.")
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
        "Buying major home appliances like refrigerators, washing machines, and air conditioners requires a lot of money upfront. "
        "For university students, working professionals moving between cities, and newly formed households, buying appliances outright rarely makes sense. "
        "Renting offers a practical alternative: customers get the appliances they need on flexible monthly leases without taking on debt or worrying about moving heavy machines later. "
        "Renting also fits well into the circular economy. Instead of sitting idle or being dumped in landfills when someone moves, a well-built appliance can be collected, serviced, "
        "cleaned, and re-rented to someone else, extending its working life and reducing manufacturing waste [1], [2]."
    )
    add_body_p(
        "While basic rental websites let customers browse products and pay online, operating an appliance rental business in the real world reveals two big bottlenecks. "
        "First, catalog discovery is harder than on ordinary e-commerce sites. Appliances have specific room pairings (a fridge naturally pairs with a water purifier or microwave, not another fridge), "
        "power ratings, and monthly rent brackets that regular search bars do not handle well. Second, rental businesses make their revenue through recurring monthly subscriptions, but they spend "
        "heavy capital upfront on buying inventory, running warehouse inspections, and paying delivery technicians. When a customer cancels their subscription early—what the industry calls churn—the business "
        "loses future rental income and cannot recover those upfront onboarding and logistics costs."
    )
    add_body_p(
        "What Churn Means in Appliance Rentals: In simple terms, a customer churns when they stop renting from the platform: they cancel their active order, schedule an item pickup, "
        "and stop paying monthly fees. Because sending a delivery team to pick up a washer and finding a replacement renter is expensive, rental companies need early warning signs. "
        "By tracking signals like how long an account has been active, whether payments are on time, how many days since the user last logged in, and how they rate customer support, "
        "a machine learning model can estimate churn risk before the lease is actually cancelled. This allows staff to reach out with helpful offers, such as a rent discount or free maintenance visit, to keep the account active."
    )
    add_body_p(
        "Background and What Rentora Adds: We started with the foundational rental platform concept introduced in the 'Just Rent It' project [3], which handled the basics of online appliance rentals: "
        "viewing products, placing booking requests, making payments, tracking orders, and managing user accounts. While that provided a solid baseline, it left out data-driven recommendation, automated customer retention, "
        "and identity checks. In Rentora, we expanded that foundation in two clear steps (Table I):"
    )
    add_body_p(
        "1. Platform Engineering: We built a multi-role web platform with separate portals for renters, appliance owners, and administrators; added client-side optical character recognition (OCR) via Tesseract.js "
        "to check identity documents right inside the browser; set up a software escrow ledger with an optional damage waiver; and added live order tracking using WebSockets via Socket.io."
    )
    add_body_p(
        "2. Machine Learning Pipeline: We built an asynchronous Python pipeline that runs separately from the main web server. It handles hybrid catalog recommendations and trains a LightGBM classifier with TreeSHAP explanations "
        "to flag at-risk subscribers without slowing down checkout or payments."
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
        ["Feature Area", "Base Framework [3]", "Rentora (Our Implementation)", "Status in Repo"],
        ["Web Architecture", "Standard client-server REST API", "React 19 SPA, Express gateway, MongoDB, decoupled Python ML", "Fully Built"],
        ["User Accounts & Roles", "Basic username/password sessions", "JWT authentication with RBAC across customer, owner, and admin roles", "Fully Built"],
        ["Identity Verification (KYC)", "Manual document submission", "Client-side Tesseract.js OCR reading Aadhaar text directly in browser", "Built (Simulated backend)"],
        ["Payments & Deposits", "Direct digital payment capture", "Razorpay test mode; software escrow reserve ledger & optional damage waiver", "Built (Sandbox mode)"],
        ["Stock & Concurrency", "Static product count", "Multi-city inventory with atomic decrement ($inc) and restitution on cancel", "Fully Built"],
        ["Delivery Tracking", "Status checked on page reload", "Live full-duplex WebSocket event updates via Socket.io", "Fully Built"],
        ["Catalog Suggestions", "Static catalog list; no AI", "Hybrid recommender using TF-IDF, co-rental, ratings, energy, and budget", "Fully Built"],
        ["Customer Retention", "Not included", "LightGBM churn prediction with TreeSHAP feature explanations", "Fully Built"]
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
    add_subsec_heading("A. Product-Service Systems and Appliance Rental")
    add_body_p(
        "Appliance rental is a real-world example of Product-Service Systems (PSS). In a comprehensive review of over 100 PSS studies, Koide et al. [1] showed that sharing and leasing "
        "consumer durables can substantially lower life-cycle carbon emissions compared to traditional linear buying and discarding. But they also noted that these environmental gains depend on good logistics "
        "and maintenance; if machines break early or get discarded after one user, the benefits disappear. Looking specifically at washing machine leasing in Europe, Sigüenza et al. [2] found that circular rental models "
        "cut raw material consumption by up to 34%, provided the business has reliable tracking, regular refurbishing, and active customer management."
    )
    add_subsec_heading("B. Earlier Rental Platform Studies")
    add_body_p(
        "Digital platforms for rental services have grown steadily. Earlier papers, such as the digital appliance rental framework described in 'Just Rent It' [3], showed how client-server web apps "
        "can replace paper-based rental bookings with digital catalogs, online payments, and order tracking. However, those earlier systems focused strictly on transaction processing and left data-driven features—like "
        "recommendation engines and customer retention models—for unspecified future work."
    )
    add_subsec_heading("C. Recommendation in Rental Contexts")
    add_body_p(
        "Most e-commerce recommenders rely on collaborative filtering (CF) and matrix factorization [10]. Satapathy et al. [4] used collaborative filtering with cosine similarity for a rental property portal. "
        "However, applying standard collaborative filtering to appliance rentals hits an immediate wall: data sparsity. While e-commerce shoppers buy dozens of books or clothes, an appliance renter typically leases only 1 to 4 "
        "items over several years. With so few interactions per user, user-item rating matrices are nearly empty. In this sparse setting, content-based matching using text descriptions [11] and item co-occurrence rules [14] "
        "offer much more dependable recommendations, especially when augmented with domain heuristics like room pairing and power ratings."
    )
    add_subsec_heading("D. Churn Prediction in Subscription Businesses")
    add_body_p(
        "Customer churn has been widely studied in banking and telecom. In home appliance rental specifically, Suh [5] tested several machine learning models on rental contract histories in South Korea, "
        "finding that gradient-boosted decision trees outperformed Random Forests [7], logistic regression, and neural networks when analyzing contract terms, service visits, and payment records. "
        "LightGBM [6] has become a popular gradient-boosting tool because it uses histogram binning and leaf-wise splitting to train fast on tabular data with low memory usage."
    )
    add_subsec_heading("E. Making Predictions Understandable with TreeSHAP")
    add_body_p(
        "In customer support, giving staff a raw risk percentage like '78% churn risk' is not enough; staff need to know why. Shapley Additive exPlanations (SHAP) [8], based on cooperative game theory [12], "
        "calculates the exact marginal contribution of each feature to a specific prediction. Lundberg et al. [9] introduced TreeSHAP, an exact algorithm that computes Shapley values for tree ensembles in polynomial time "
        "O(TLD^2) instead of exponential time. This makes it practical to show support staff plain-language explanations of what is driving a customer's churn risk directly in the dashboard."
    )

    # ─────────────────────────────────────────────────────────────────────────
    # III. RESEARCH GAP & CAPABILITY MATRIX
    # ─────────────────────────────────────────────────────────────────────────
    add_sec_heading("III. RESEARCH GAP & CONTRIBUTIONS")
    add_body_p(
        "Looking across existing work shows a clear divide: commercial web platforms handle rental transactions but lack analytical intelligence, while academic research papers analyze machine learning algorithms "
        "on isolated CSV files without building a working software system. Table II compares what earlier studies provided against what we implemented in Rentora."
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
        "We designed Rentora as a four-part system: a client single-page app, an API gateway, a transactional database, and a decoupled Python machine learning pipeline (Fig. 1). "
        "Separating the machine learning pipeline from the web server was a deliberate architectural choice: model training, batch scoring, or unexpected Python errors never slow down "
        "customer browsing, cart checkout, or payment capture."
    )

    # Fig 1 Image
    p_img1 = doc.add_paragraph()
    p_img1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    img1_path = os.path.join(baseline_fig_dir, "image1.png")
    if os.path.exists(img1_path):
        p_img1.add_run().add_picture(img1_path, width=Inches(3.8))
        add_fig_caption(1, "Rentora system architecture. The background Python ML pipeline reads operational data from MongoDB and writes scores back, so model execution never interrupts bookings.")

    add_body_p(
        "Client Presentation Tier: We built the frontend with React 19, Vite, and Tailwind CSS. The app provides three dedicated interfaces: (1) a Customer Portal where users browse items, "
        "select lease terms (3, 6, or 12 months with automatic tenure discounts), complete KYC document verification, and manage active rentals; (2) an Owner Portal where peer hosts list appliances, "
        "view inspection reports, and track monthly payouts; and (3) an Admin Portal where operations staff manage KYC approvals, inventory counts, and customer churn-risk alerts. "
        "For identity verification, we implemented client-side OCR using Tesseract.js in WebAssembly. When a user uploads an identity document (such as an Aadhaar card), an HTML5 canvas pre-processes "
        "the image (converting to grayscale and normalizing contrast) and extracts the 12-digit number locally in the user's browser. The number is validated against the UIDAI Verhoeff checksum algorithm before submission, "
        "preventing raw identity images from ever leaking to external servers."
    )
    add_body_p(
        "API Gateway Tier: The backend runs on Node.js and Express, organized into 15 route modules (including auth, appliances, rentals, cart, payments, kyc, recommendations, and admin). "
        "Routes are protected by JSON Web Tokens (JWT) and role-based access control (RBAC) middleware: for instance, administrative routes reject tokens belonging to standard customers. "
        "We also integrated Socket.io for live delivery tracking, allowing renters to see real-time status updates as technicians dispatch and deliver appliances. A rule-based concierge chatbot answers "
        "common customer questions about security deposits, damage waivers, and relocation policies using fixed JSON lookup tables without calling external LLM APIs."
    )
    add_body_p(
        "Database Tier: MongoDB serves as our primary datastore. When a customer checks out, the backend updates stock counts using an atomic conditional update ($inc: { stock: -qty }, stock >= qty); "
        "if an order fails or is cancelled, stock is restored automatically, preventing race conditions during simultaneous bookings. We also built a software-managed security deposit ledger that holds deposits "
        "in escrow until returned machines pass inspection, alongside an optional Rentora Care damage protection plan (₹149/mo) that caps renter liability at ₹10,000 for minor scratches and accidental spills."
    )
    add_body_p(
        "Python Machine Learning Tier: Standalone Python jobs handle data extraction, feature transformation, model scoring, and recommendations. The jobs query MongoDB, process behavioral features, "
        "run inference using saved LightGBM and recommender joblib artifacts, and write updated scores back into specialized collections (user_churn_scores and appliance_recommendations) for fast API reads."
    )

    # ─────────────────────────────────────────────────────────────────────────
    # V. DATASETS & FEATURE ENGINEERING
    # ─────────────────────────────────────────────────────────────────────────
    add_sec_heading("V. DATASETS & FEATURE ENGINEERING")
    add_subsec_heading("A. Customer Churn Dataset: Mapping and Proxy Nature")
    add_body_p(
        "Because our startup platform does not yet have years of historical customer records, we evaluated our churn-prediction pipeline using a deterministic proxy approach. "
        "We used the public Bank Customer Churn dataset [15], which contains 10,000 customer records and an actual churn rate of 20.37% (2,037 customers left, 7,963 stayed). "
        "We wrote deterministic mathematical rules in evaluate_models.py to map each bank record into 15 rental-domain operational features (Table III). "
        "Importantly, we kept the original churn label exactly as-is and added zero random noise. Every single value is calculated directly from source fields like tenure, salary, balance, credit score, and membership activity. "
        "We want to be completely clear: bank customers are not appliance renters, and these features are proxy stand-ins rather than observed rental behavior. This experiment verifies that our data pipeline, model training, "
        "latency, and feature-explanation workflows function properly before we collect longitudinal data from live appliance renters."
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
        ["Rental Feature Name", "True Range [Min, Max]", "How It Is Calculated from Bank Data", "Operational Meaning & Data Status"],
        ["tenure_months", "1 – 120 mo", "(raw['Tenure'] * 12 + (raw['Age'] % 12)).clip(1, 120)", "Months user has had an account; Proxy"],
        ["monthly_spend", "₹2.25 – ₹5,349.27", "round(raw['EstimatedSalary']/40 + (raw['Balance']>0)*350, 2)", "Estimated monthly rental bill; Proxy"],
        ["active_rentals", "1 – 4 units", "raw['NumOfProducts'].clip(1, 5) [bank max is 4]", "Number of active leased items; Proxy"],
        ["credit_score", "350 – 850", "raw['CreditScore']", "Financial credit standing; Proxy"],
        ["customer_age", "18 – 92 yrs", "raw['Age']", "Tenant age; Proxy"],
        ["is_active_member", "{0, 1}", "raw['IsActiveMember']", "Active platform engagement flag; Proxy"],
        ["late_payments", "0 – 5 events", "round(((850 - CreditScore)/85) + (1-IsActive)*1.5 + (Bal==0)*0.5).clip(0, 5)", "Overdue payment count; Heuristic proxy"],
        ["early_returns", "0 – 2 events", "(1 - IsActive)*(Tenure <= 2) + (CreditScore < 520)", "Early lease termination count; Heuristic proxy"],
        ["cart_abandonment", "{0, 2, 4} events", "(1 - IsActiveMember)*2 + (NumOfProducts == 1)*2", "Items left in cart without checkout; Heuristic proxy"],
        ["days_inactive", "0.0 – 55.0 days", "round((1 - IsActiveMember)*35 + (10 - Tenure)*2, 1).clip(0, 90)", "Days since last platform login; Heuristic proxy"],
        ["avg_rating", "2.60 – 5.00 ★", "round(IsActiveMember*0.8 + (CreditScore / 250) + 1.2, 2).clip(1, 5)", "Feedback rating given by user; Heuristic proxy"],
        ["spend_per_rental", "₹1.07 – ₹4,862.97", "round(monthly_spend / (active_rentals + 0.1), 2)", "Average monthly rent per leased item; Derived ratio"],
        ["delinquency_rate", "0.00 – 2.50", "round(late_payments / (active_rentals + 1.0), 4)", "Overdue bills per active subscription; Derived ratio"],
        ["inactivity_rate", "0.00 – 1.77", "round(days_inactive / (tenure_months * 30 + 1.0), 4)", "Fraction of account tenure spent inactive; Derived ratio"],
        ["engagement_score", "1.011 – 5.000", "round(avg_rating * (1.0 - min(1.0, days_inactive / 90.0)), 3)", "Composite rating and activity score; Derived index"]
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

    add_subsec_heading("B. Appliance Catalog Dataset")
    add_body_p(
        "We tested our recommender engine on the appliance catalog exported from our platform (data/appliances_catalog.csv). "
        "The catalog contains 164 appliances across 12 main categories (Living Room, Kitchen, Bedroom, Home Office, Dining, Laundry, etc.) and 41 sub-categories "
        "(Double-door Refrigerators, Front-load Washing Machines, Ergonomic Chairs, Microwave Ovens, Water Purifiers, etc.). "
        "Of these, 162 items have explicit sub-category labels, allowing us to test how accurately the system matches related appliances."
    )

    # ─────────────────────────────────────────────────────────────────────────
    # VI. METHODOLOGY & MATHEMATICAL FORMULATIONS
    # ─────────────────────────────────────────────────────────────────────────
    add_sec_heading("VI. METHODOLOGY & MATHEMATICAL FORMULATIONS")
    add_subsec_heading("A. Hybrid Recommendation Engine")
    add_body_p(
        "Our recommender combines five signals: what an appliance is (content description), what other customers rent together (co-rental affinity), "
        "how well it is rated by other users, how energy-efficient it is, and whether the monthly rent fits the user's budget."
    )
    add_body_p(
        "1. Content Similarity: For each appliance, we build a text description from its name, specifications, category, and sub-category. "
        "To ensure appliances stay coherent with their room context, we boost category terms by 3× and sub-category terms by 2×. We vectorize these texts using sublinear TF-IDF "
        "(unigrams and bigrams, max 2,500 features). The similarity between two appliances i and j is calculated using the cosine of their TF-IDF feature vectors ti and tj:"
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
        "where q_j is the user rating smoothed toward the platform average C = 4.30 across review count v_j: q_j = (v_j · r_j + 12 × 4.30)/(v_j + 12), ensuring an item with only one 5-star review does not unfairly top the list; "
        "e_j is an eco-bonus (0.15 for 4-star or 5-star inverter appliances, 0.05 otherwise); and π_j is a Gaussian price-fit term: π_j = exp(-0.5 ((p_j - B_u) / σ_B)^2), where B_u is the customer's median monthly rental spend "
        "(default ₹1,200 for new users) and budget spread is σ_B = max(0.8 B_u, 600.0). Items the customer already rents are excluded. The top 6 items are saved to appliance_recommendations with at most 2 per sub-category for variety."
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
        ["Random Forest Baseline", "0.824 ± 0.011", "0.643 ± 0.018", "0.535 ± 0.012"],
        ["Genuine LightGBM (Our Work)", "0.833 ± 0.012", "0.661 ± 0.018", "0.572 ± 0.017"]
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
        "Stratified 5-fold cross-validation across all 10,000 customers (Table V) shows that this performance margin holds across different data partitions: ROC-AUC is 0.833 ± 0.012 for LightGBM "
        "versus 0.824 ± 0.011 for Random Forest, and PR-AUC is 0.661 ± 0.018 versus 0.643 ± 0.018. Figure 3 shows the confusion matrix at the standard 0.50 threshold: LightGBM correctly catches "
        "202 of 407 churners while generating only 76 false alarms out of 1,593 retained customers."
    )
    add_body_p(
        "Practical Threshold Tuning for Customer Retention: In real rental operations, the cost of an automated retention offer (like a 15% discount on next month's lease) is tiny compared to losing a customer's monthly rental income. "
        "Because of this, an operator might prefer higher recall over high precision. In our tests, lowering the decision threshold to 0.32 boosted recall from 49.6% to 65.6% (catching 267 of 407 churners, a 32% increase in detected churners) "
        "with 53.1% precision (236 false alarms) and a peak F2-score of 0.627 (Confusion Matrix: TN=1357, FP=236, FN=140, TP=267). This shows how the model can be tuned to match different business priorities."
    )

    # Fig 3 Image
    p_img3 = doc.add_paragraph()
    p_img3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    img3_path = os.path.join(fig_dir, "fig3_confusion_matrix.png")
    if os.path.exists(img3_path):
        p_img3.add_run().add_picture(img3_path, width=Inches(2.8))
        add_fig_caption(3, "LightGBM confusion matrix on the held-out test split at standard threshold 0.50 (202 churners caught, 76 false alarms).")

    add_subsec_heading("B. Feature Importance and TreeSHAP Explanations")
    add_body_p(
        "Global feature attributions from TreeSHAP (Figure 4) rank customer_age (mean |phi| = 0.80 log-odds) and active_rentals (mean |phi| = 0.63 log-odds) as the top drivers of churn risk, "
        "followed by cart_abandonment (0.19), engagement_score (0.16), avg_rating (0.10), and monthly_spend (0.10). It is essential to understand why: in the original banking dataset, "
        "customer age and the number of bank products had the largest variance, and our mapping formulas copied those values across. This ranking reflects the structure of the proxy data, not an empirical discovery "
        "about appliance renters. However, the secondary behavioral features—like cart abandonment, late payments, and rating feedback—are actionable factors that customer support teams can address directly."
    )

    # Fig 4 Image
    p_img4 = doc.add_paragraph()
    p_img4.alignment = WD_ALIGN_PARAGRAPH.CENTER
    img4_path = os.path.join(fig_dir, "fig4_shap_summary.png")
    if os.path.exists(img4_path):
        p_img4.add_run().add_picture(img4_path, width=Inches(4.2))
        add_fig_caption(4, "TreeSHAP summary plot showing feature contributions to log-odds margin across 100 test samples. Positive values increase churn risk.")

    add_body_p(
        "Figure 5 shows the local waterfall explanation for the single highest-risk customer in our test split (base log-odds: -1.52, final margin: +5.19, predicted churn probability: 0.994). "
        "Having 4 active rentals added +4.77 to the log-odds score, older age added +1.04, and credit score added +0.39, while longer tenure (-1.36) helped anchor retention. "
        "Displaying this breakdown on the admin dashboard gives staff concrete context before reaching out to the customer."
    )

    # Fig 5 Image
    p_img5 = doc.add_paragraph()
    p_img5.alignment = WD_ALIGN_PARAGRAPH.CENTER
    img5_path = os.path.join(fig_dir, "fig5_local_shap_waterfall.png")
    if os.path.exists(img5_path):
        p_img5.add_run().add_picture(img5_path, width=Inches(4.2))
        add_fig_caption(5, "Local TreeSHAP waterfall explanation for the highest-risk tenant (base log-odds -1.52, margin +5.19, prob 0.994).")

    add_subsec_heading("C. Recommender Catalog Evaluation")
    add_body_p(
        "Table VI tests our TF-IDF recommender directly on the 164-item appliance catalog at K = 5. When evaluating against granular sub-categories (41 classes across 162 items), "
        "top-5 suggestions achieved 59.3% precision, which is a 14.1× improvement over random baseline selection (4.2%). The hit rate reached 96.5% (meaning almost every query item found "
        "at least one companion in the same sub-category), and catalog coverage was 96.3%, showing that items across the entire catalog get recommended rather than concentrating on a few popular units."
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
        ["Catalog Evaluation Level", "Precision@5", "Random Chance", "Hit Rate@5", "Recall@5", "Catalog Coverage"],
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
    # VIII. DISCUSSION & LIMITATIONS
    # ─────────────────────────────────────────────────────────────────────────
    add_sec_heading("VIII. DISCUSSION & LIMITATIONS")
    add_body_p(
        "Practical Value in Operations: Connecting our machine learning pipelines directly to MongoDB makes real-time data actionable. Renters receive automated room bundle suggestions "
        "that simplify furnishing an apartment, while support staff receive early alerts about subscribers who might cancel, complete with TreeSHAP explanations of why."
    )
    add_body_p(
        "Explicit Research Limitations: To maintain academic honesty, we document seven limitations of this study: "
        "(1) Proxy Dataset Gap: Our churn model was evaluated on bank customer data mapped to rental features; while this proves the pipeline works, it is not a substitute for data from real appliance renters. "
        "(2) Modest Performance Difference: LightGBM leads Random Forest by roughly 0.01 in ROC-AUC, which is within one standard deviation of cross-validation; both tree models perform solidly. "
        "(3) SHAP Explains the Model, Not Human Intent: Shapley values describe feature weights inside the model, but changing an operational feature does not automatically guarantee a customer will change their mind. "
        "(4) Catalog Evaluation vs. User Acceptance: Table VI shows that TF-IDF successfully groups similar products together, but it does not measure whether real customers actually rent those suggested items. "
        "(5) Single Dataset Split: Results come from an 80/20 train/test split and 5-fold cross-validation on one benchmark. "
        "(6) Production Scoring Imputations: In our live ETL pipeline, customer age is currently defaulted to 32 and credit scores are estimated from payment timeliness, meaning deployed scores are heuristic risk indices rather than true calibrated probabilities. "
        "(7) Simulated Third-Party Integrations: Payments (Razorpay test mode), KYC document lookups, and delivery tracking currently run in a sandbox prototype rather than through production government or banking contracts."
    )
    add_body_p(
        "Privacy and Data Governance: Customer records must be anonymized before batch analytics. Our client-side Tesseract.js OCR processes identity documents directly in the browser and discards images immediately, "
        "preventing identity photos from being stored on server disks."
    )

    # ─────────────────────────────────────────────────────────────────────────
    # IX. CONCLUSION & FUTURE WORK
    # ─────────────────────────────────────────────────────────────────────────
    add_sec_heading("IX. CONCLUSION & FUTURE WORK")
    add_body_p(
        "In this work, we developed and evaluated Rentora, an end-to-end appliance rental platform that integrates personalized catalog recommendation and churn-risk prediction into everyday leasing operations. "
        "Using a decoupled architecture with React 19, Express, MongoDB, and Python, the system keeps customer transactions fast and reliable while running machine learning tasks in the background. "
        "On our 10,000-record benchmark dataset, LightGBM achieved an ROC-AUC of 0.833 and an F1-score of 0.590, providing reliable churn detection that TreeSHAP turns into clear, staff-facing explanations. "
        "Our hybrid recommender achieved 59.3% sub-category precision (a 14.1× boost over random selection) with 96.3% catalog coverage on 164 catalog items. "
        "For future work, we plan to: (1) gather longitudinal usage data from real Rentora users; (2) run live A/B tests to measure customer click-through and lease conversion rates; "
        "(3) replace proxy banking features with real IoT and rental payment data; and (4) measure the actual business impact of retention outreach in a controlled trial."
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
