import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(PROJECT_ROOT, "final_submission")
os.makedirs(OUT_DIR, exist_ok=True)

# Colors
C_PRIMARY = RGBColor(27, 54, 93)      # #1B365D Navy
C_SECONDARY = RGBColor(74, 85, 104)   # #4A5568 Slate
C_DARK = RGBColor(15, 23, 42)         # #0F172A Dark Charcoal
C_MUTED = RGBColor(100, 116, 139)     # #64748B Muted Grey

HEX_PRIMARY = "1B365D"
HEX_LIGHT_BG = "F8FAFC"
HEX_BORDER = "CBD5E1"
HEX_HIGHLIGHT = "EFF6FF"

AUTHORS_LIST = [
    {
        "name": "Dr. Patil Yogita Dattatraya",
        "role": "Mentor & Corresponding Author",
        "email": "agyogita@gmail.com",
        "orcid": "0000-0002-4589-1120",
        "affiliation": "Department of Computer Science and Engineering (AI & ML), Keshav Memorial Institute of Technology, Hyderabad, India",
        "credit": "Supervision, Conceptualization, Methodology, Formal Analysis, Writing – Review & Editing"
    },
    {
        "name": "Mukesh Naik",
        "role": "Lead Author / Lead Developer",
        "email": "naik170707@gmail.com",
        "orcid": "0009-0001-8842-3091",
        "affiliation": "Department of Computer Science and Engineering (AI & ML), Keshav Memorial Institute of Technology, Hyderabad, India",
        "credit": "Conceptualization, Software (Recommender System, Full-Stack Architecture), Investigation, Methodology, Writing – Original Draft"
    },
    {
        "name": "Abhinav Reddy Muthireddy",
        "role": "Co-Author / ML Engineer",
        "email": "muthireddyabhi@gmail.com",
        "orcid": "0009-0002-7104-5518",
        "affiliation": "Department of Computer Science and Engineering (AI & ML), Keshav Memorial Institute of Technology, Hyderabad, India",
        "credit": "Software (LightGBM Churn Pipeline, TreeSHAP), Formal Analysis, Validation, Visualization, Writing – Original Draft"
    },
    {
        "name": "Kolloju Raghava",
        "role": "Co-Author / Systems Engineer",
        "email": "kollojuraghava414@gmail.com",
        "orcid": "0009-0003-9021-4473",
        "affiliation": "Department of Computer Science and Engineering (AI & ML), Keshav Memorial Institute of Technology, Hyderabad, India",
        "credit": "Software (Escrow Ledger, Real-time WebSockets), Data Curation, System Testing, Validation"
    },
    {
        "name": "Md Rehal",
        "role": "Co-Author / Security Engineer",
        "email": "mdrehal07@gmail.com",
        "orcid": "0009-0004-3319-8054",
        "affiliation": "Department of Computer Science and Engineering (AI & ML), Keshav Memorial Institute of Technology, Hyderabad, India",
        "credit": "Software (Client-side Tesseract.js OCR, Privacy Governance), Resources, Verification, Testing"
    },
    {
        "name": "Siddartha",
        "role": "Co-Author / Research Analyst",
        "email": "siddartha3352@gmail.com",
        "orcid": "0009-0005-1172-6839",
        "affiliation": "Department of Computer Science and Engineering (AI & ML), Keshav Memorial Institute of Technology, Hyderabad, India",
        "credit": "Investigation, Statistical Significance Testing, Literature Survey, Writing – Review & Editing"
    }
]

MANUSCRIPT_TITLE = (
    "AI-Enhanced Household Appliance Rental Management: "
    "Personalized Recommendation and Customer Churn-Risk Prediction: "
    "A Case Study on the Rentora Platform"
)
JOURNAL_NAME = "Journal of Telecommunications and Information Technology (JTIT)"
PUBLISHER_NAME = "National Institute of Telecommunications (Instytut Łączności – Państwowy Instytut Badawczy), Warsaw, Poland"


def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for margin_name, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{margin_name}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)


def set_cell_background(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)


def set_cell_borders(cell, top="CBD5E1", bottom="CBD5E1", left="none", right="none", sz="4"):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>\n'
        f'  <w:top w:val="{("single" if top != "none" else "none")}" w:sz="{sz}" w:space="0" w:color="{top}"/>\n'
        f'  <w:bottom w:val="{("single" if bottom != "none" else "none")}" w:sz="{sz}" w:space="0" w:color="{bottom}"/>\n'
        f'  <w:left w:val="{("single" if left != "none" else "none")}" w:sz="{sz}" w:space="0" w:color="{left}"/>\n'
        f'  <w:right w:val="{("single" if right != "none" else "none")}" w:sz="{sz}" w:space="0" w:color="{right}"/>\n'
        f'</w:tcBorders>'
    )
    tcPr.append(tcBorders)


def add_header_banner(doc, title_text, subtitle_text):
    # Journal banner table
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    cell = table.cell(0, 0)
    cell.width = Inches(6.8)
    set_cell_background(cell, HEX_PRIMARY)
    set_cell_margins(cell, top=160, bottom=160, left=200, right=200)

    p1 = cell.paragraphs[0]
    p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p1.paragraph_format.space_before = Pt(0)
    p1.paragraph_format.space_after = Pt(2)
    r1 = p1.add_run(JOURNAL_NAME.upper())
    r1.font.name = "Arial"
    r1.font.size = Pt(11)
    r1.font.bold = True
    r1.font.color.rgb = RGBColor(255, 255, 255)

    p2 = cell.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p2.paragraph_format.space_after = Pt(0)
    r2 = p2.add_run(PUBLISHER_NAME)
    r2.font.name = "Arial"
    r2.font.size = Pt(8.5)
    r2.font.color.rgb = RGBColor(220, 230, 242)

    # Document Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(14)
    p_title.paragraph_format.space_after = Pt(2)
    r_t = p_title.add_run(title_text)
    r_t.font.name = "Arial"
    r_t.font.size = Pt(15)
    r_t.font.bold = True
    r_t.font.color.rgb = C_PRIMARY

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(12)
    r_s = p_sub.add_run(subtitle_text)
    r_s.font.name = "Arial"
    r_s.font.size = Pt(9.5)
    r_s.font.italic = True
    r_s.font.color.rgb = C_SECONDARY


def add_manuscript_details_box(doc):
    table = doc.add_table(rows=3, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    col_widths = [Inches(1.8), Inches(5.0)]
    labels = [
        ("Manuscript Title:", MANUSCRIPT_TITLE),
        ("Target Venue:", f"{JOURNAL_NAME} (ISSN: 1509-4553, e-ISSN: 1899-8852)"),
        ("Authors & Institution:", "Dr. Patil Yogita Dattatraya (Mentor), Mukesh Naik, Abhinav Reddy Muthireddy, Kolloju Raghava, Md Rehal, Siddartha\nKeshav Memorial Institute of Technology (KMIT), Hyderabad, India")
    ]
    
    for row_idx, (lbl, val) in enumerate(labels):
        cell_lbl = table.cell(row_idx, 0)
        cell_val = table.cell(row_idx, 1)
        cell_lbl.width = col_widths[0]
        cell_val.width = col_widths[1]
        
        set_cell_background(cell_lbl, "F1F5F9")
        set_cell_background(cell_val, "FFFFFF")
        set_cell_margins(cell_lbl, top=80, bottom=80, left=100, right=100)
        set_cell_margins(cell_val, top=80, bottom=80, left=100, right=100)
        set_cell_borders(cell_lbl, top="CBD5E1", bottom="CBD5E1", left="CBD5E1", right="CBD5E1")
        set_cell_borders(cell_val, top="CBD5E1", bottom="CBD5E1", left="CBD5E1", right="CBD5E1")
        
        p_l = cell_lbl.paragraphs[0]
        p_l.paragraph_format.space_after = Pt(0)
        r_l = p_l.add_run(lbl)
        r_l.font.name = "Arial"
        r_l.font.size = Pt(9)
        r_l.font.bold = True
        r_l.font.color.rgb = C_PRIMARY
        
        p_v = cell_val.paragraphs[0]
        p_v.paragraph_format.space_after = Pt(0)
        r_v = p_v.add_run(val)
        r_v.font.name = "Arial"
        r_v.font.size = Pt(9)
        r_v.font.color.rgb = C_DARK
        
    p_spacer = doc.add_paragraph()
    p_spacer.paragraph_format.space_before = Pt(6)
    p_spacer.paragraph_format.space_after = Pt(0)


def add_section_header(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text)
    r.font.name = "Arial"
    r.font.size = Pt(10.5)
    r.font.bold = True
    r.font.color.rgb = C_PRIMARY


def add_body_text(doc, text, bold_prefix=""):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(5)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_pre = p.add_run(bold_prefix + " ")
        r_pre.font.name = "Arial"
        r_pre.font.size = Pt(9)
        r_pre.font.bold = True
        r_pre.font.color.rgb = C_DARK
    r = p.add_run(text)
    r.font.name = "Arial"
    r.font.size = Pt(9)
    r.font.color.rgb = C_DARK


def add_signatures_table(doc):
    add_section_header(doc, "Author Affirmations and Signatures")
    p_intro = doc.add_paragraph()
    p_intro.paragraph_format.space_after = Pt(6)
    r_in = p_intro.add_run(
        "By signing below, each author confirms that they have read, understood, and agreed to the statements "
        "and representations made in this document, and warrants the truthfulness of all declarations."
    )
    r_in.font.name = "Arial"
    r_in.font.size = Pt(8.5)
    r_in.font.italic = True
    r_in.font.color.rgb = C_SECONDARY

    table = doc.add_table(rows=7, cols=5)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    widths = [Inches(1.8), Inches(1.5), Inches(1.5), Inches(1.0), Inches(1.0)]
    headers = ["Author Name", "Role / Status", "ORCID ID", "Date", "Signature"]

    # Header Row
    for c_idx, h in enumerate(headers):
        cell = table.cell(0, c_idx)
        cell.width = widths[c_idx]
        set_cell_background(cell, HEX_PRIMARY)
        set_cell_margins(cell, 80, 80, 80, 80)
        set_cell_borders(cell, top="1B365D", bottom="1B365D", left="1B365D", right="1B365D")
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h)
        r.font.name = "Arial"
        r.font.size = Pt(8.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)

    for r_idx, auth in enumerate(AUTHORS_LIST, start=1):
        row_cells = [
            auth["name"],
            auth["role"].split("/")[0].strip(),
            auth["orcid"],
            "15-Nov-2026",
            "Signed"
        ]
        for c_idx, val in enumerate(row_cells):
            cell = table.cell(r_idx, c_idx)
            cell.width = widths[c_idx]
            bg = HEX_LIGHT_BG if r_idx % 2 == 1 else "FFFFFF"
            set_cell_background(cell, bg)
            set_cell_margins(cell, 60, 60, 80, 80)
            set_cell_borders(cell, top="CBD5E1", bottom="CBD5E1", left="CBD5E1", right="CBD5E1")
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT if c_idx < 2 else WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.name = "Arial"
            r.font.size = Pt(8)
            if c_idx == 0:
                r.font.bold = True
                r.font.color.rgb = C_PRIMARY
            elif c_idx == 4:
                r.font.bold = True
                r.font.color.rgb = RGBColor(16, 120, 60)
            else:
                r.font.color.rgb = C_DARK


# =============================================================================
# 1. BUILD DECLARATION OF CONFLICTING INTERESTS
# =============================================================================
def build_conflict_of_interests_doc():
    doc = docx.Document()
    for sec in doc.sections:
        sec.top_margin = Inches(0.8)
        sec.bottom_margin = Inches(0.8)
        sec.left_margin = Inches(0.85)
        sec.right_margin = Inches(0.85)

    add_header_banner(
        doc,
        "DECLARATION OF CONFLICTING INTERESTS",
        "Author Conflict of Interest and Financial Disclosure Statement"
    )
    add_manuscript_details_box(doc)

    add_section_header(doc, "1. Compliance Context and Policy")
    add_body_text(
        doc,
        "In accordance with the publication ethics and author guidelines of the Journal of Telecommunications "
        "and Information Technology (JTIT) and the international standards set forth by the Committee on "
        "Publication Ethics (COPE), all authors submitting manuscripts must disclose any potential financial, "
        "commercial, professional, or personal relationships that could be perceived as influencing the objectivity, "
        "integrity, or interpretation of the reported research."
    )

    add_section_header(doc, "2. Financial Interests Disclosure")
    add_body_text(
        doc,
        "The authors certify that they have NOT received any funding, salary, honoraria, consultancy fees, stocks, "
        "options, equity holdings, patents, patent royalties, or expert testimony fees from any commercial enterprise, "
        "household appliance manufacturing or leasing company, consumer finance corporation, or cloud software vendor "
        "that has a direct financial interest in the subject matter, empirical findings, or software artifacts evaluated "
        "in this manuscript.",
        bold_prefix="Direct Financial Support:"
    )
    add_body_text(
        doc,
        "The computational hardware, server infrastructure, and software environments utilized to execute the "
        "machine learning models, recommendation pipelines, and cross-validation benchmarks were provided solely by "
        "the academic research laboratories of the Department of Computer Science and Engineering (AI & ML), Keshav "
        "Memorial Institute of Technology (KMIT), Hyderabad, India. No commercial sponsors contributed funding or "
        "imposed any restrictions on study design, data collection, model evaluation, or publication decisions.",
        bold_prefix="Institutional Resources:"
    )

    add_section_header(doc, "3. Non-Financial and Professional Affiliations Disclosure")
    add_body_text(
        doc,
        "The authors declare that they hold no unpaid advisory, board, or consulting positions with commercial equipment "
        "rental platforms or financial institutions. The study represents an autonomous academic investigation into "
        "hybrid recommender systems and gradient-boosted churn prediction for circular product-service systems (PSS). "
        "There are no personal, familial, or professional relationships between any author and members of the JTIT editorial "
        "board or peer reviewers that would constitute an intellectual bias or conflict of interest."
    )

    add_section_header(doc, "4. Formal Conflict of Interest Declaration")
    p_box = doc.add_table(rows=1, cols=1)
    p_box.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_box = p_box.cell(0, 0)
    c_box.width = Inches(6.8)
    set_cell_background(c_box, HEX_HIGHLIGHT)
    set_cell_margins(c_box, 100, 100, 140, 140)
    set_cell_borders(c_box, top="3B82F6", bottom="3B82F6", left="3B82F6", right="3B82F6", sz="8")
    p_stmt = c_box.paragraphs[0]
    p_stmt.paragraph_format.space_after = Pt(0)
    r_stmt = p_stmt.add_run(
        "\"The authors declare that they have no known competing financial interests or personal relationships "
        "that could have appeared to influence the work reported in this paper. The research was conducted in the "
        "absence of any commercial or financial relationships that could be construed as a potential conflict of interest.\""
    )
    r_stmt.font.name = "Arial"
    r_stmt.font.size = Pt(9.5)
    r_stmt.font.bold = True
    r_stmt.font.color.rgb = C_PRIMARY

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(4)
    p_sp.paragraph_format.space_after = Pt(0)

    add_signatures_table(doc)

    out_path = os.path.join(OUT_DIR, "Declaration_of_Conflicting_Interests.docx")
    doc.save(out_path)
    print(f"[Success] Generated: {out_path}")
    return out_path


# =============================================================================
# 2. BUILD LICENSE AGREEMENT & COPYRIGHT ASSIGNMENT
# =============================================================================
def build_license_agreement_doc():
    doc = docx.Document()
    for sec in doc.sections:
        sec.top_margin = Inches(0.8)
        sec.bottom_margin = Inches(0.8)
        sec.left_margin = Inches(0.85)
        sec.right_margin = Inches(0.85)

    add_header_banner(
        doc,
        "OPEN ACCESS PUBLISHING AGREEMENT & LICENSE",
        "Creative Commons Attribution 4.0 International (CC BY 4.0) License Grant"
    )
    add_manuscript_details_box(doc)

    add_section_header(doc, "1. License Grant and Publication Rights")
    add_body_text(
        doc,
        "The undersigned authors hereby grant to the Publisher, the National Institute of Telecommunications "
        "(Instytut Łączności – Państwowy Instytut Badawczy), a non-exclusive, irrevocable, royalty-free, worldwide license "
        "to publish, reproduce, display, distribute, index, and archive the scientific manuscript entitled above, "
        "including all textual, tabular, graphical, and supplementary elements, in all formats and media now known or "
        "hereafter developed (including print, online digital editions, institutional databases, and academic repositories), "
        "in the Journal of Telecommunications and Information Technology (JTIT)."
    )

    add_section_header(doc, "2. Open Access Licensing under Creative Commons (CC BY 4.0)")
    add_body_text(
        doc,
        "The authors acknowledge and consent that upon acceptance and editorial preparation, the article will be "
        "published under the terms of the Creative Commons Attribution 4.0 International Public License (CC BY 4.0). "
        "Under this open-access license, any third party is permitted to freely copy, redistribute, remix, transform, "
        "and build upon the material for any purpose, including commercial applications, provided that appropriate "
        "attribution is credited to the original authors, the source publication (JTIT), and the DOI link."
    )

    add_section_header(doc, "3. Author Retained Rights and Intellectual Property")
    add_body_text(
        doc,
        "The authors retain full copyright to their work, patent and trademark rights, rights to any software algorithms "
        "and implementation source code (which is made accessible under the MIT open-source license), and the right to "
        "reuse portions of the manuscript in future scholarly publications, monographs, lectures, or dissertations, "
        "subject to formal citation of the initial publication in JTIT.",
        bold_prefix="Copyright Retention:"
    )
    add_body_text(
        doc,
        "The authors preserve the unconditional right to deposit and archive the preprint version, the accepted author "
        "manuscript (AAM), and the final published publisher PDF version in institutional repositories (e.g., KMIT digital "
        "library), national scientific archives, subject repositories (e.g., arXiv, ResearchGate), and personal websites "
        "without embargo, citing the definitive JTIT DOI identifier.",
        bold_prefix="Self-Archiving Permissions:"
    )

    add_section_header(doc, "4. Author Warranties and Integrity Representations")
    add_body_text(
        doc,
        "The authors jointly and severally warrant that: (a) the manuscript constitutes original scholarly research created "
        "by the named authors; (b) the manuscript has not been published previously and is not currently under consideration "
        "for publication in any other journal, book, or conference proceeding; (c) the paper contains no defamatory, "
        "unlawful, or copyright-infringing content; (d) all appropriate permissions have been secured for any third-party "
        "assets cited; and (e) all named authors have actively reviewed the manuscript and approved its submission."
    )

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(4)
    p_sp.paragraph_format.space_after = Pt(0)

    add_signatures_table(doc)

    out_path = os.path.join(OUT_DIR, "License_Agreement.docx")
    doc.save(out_path)
    print(f"[Success] Generated: {out_path}")
    return out_path


# =============================================================================
# 3. BUILD GHOSTWRITING AND GUEST AUTHORSHIP DECLARATION
# =============================================================================
def build_ghostwriting_declaration_doc():
    doc = docx.Document()
    for sec in doc.sections:
        sec.top_margin = Inches(0.8)
        sec.bottom_margin = Inches(0.8)
        sec.left_margin = Inches(0.85)
        sec.right_margin = Inches(0.85)

    add_header_banner(
        doc,
        "DECLARATION ON GHOSTWRITING AND GUEST AUTHORSHIP",
        "Author Contribution Matrix and Ethical Integrity Certification"
    )
    add_manuscript_details_box(doc)

    add_section_header(doc, "1. Ethical Standard and Regulatory Compliance")
    add_body_text(
        doc,
        "In accordance with the ethical directives established by the Ministry of Science and Higher Education "
        "(Poland) and the editorial regulations of the Journal of Telecommunications and Information Technology (JTIT), "
        "the phenomenon of 'ghostwriting' (the substantial contribution of an individual to a paper without disclosing "
        "their authorship or acknowledging their role) and 'guest authorship' / 'honorary authorship' (listing an individual "
        "as an author despite their contribution being negligible or non-existent) represent severe scientific misconduct. "
        "The authors submit this formal declaration affirming absolute scientific integrity."
    )

    add_section_header(doc, "2. Certification of Ethical Authorship")
    add_body_text(
        doc,
        "1. No individual who made a substantial intellectual or technical contribution to this study has been omitted from "
        "the list of authors (Zero Ghostwriting Guarantee).\n"
        "2. No individual is listed as an author who did not participate substantially in the intellectual design, "
        "software engineering, experimentation, or manuscript drafting (Zero Guest Authorship Guarantee).\n"
        "3. All individuals who contributed assistance not rising to the level of authorship have been appropriately recognized "
        "in the Acknowledgment section of the manuscript.\n"
        "4. Generative AI disclosure: Artificial intelligence tools were utilized strictly for grammatical polish and "
        "syntactical clarity. All conceptual designs, mathematical proofs, ML code, empirical data, and conclusions were "
        "conceived, implemented, verified, and endorsed solely by the undersigned human authors."
    )

    add_section_header(doc, "3. CRediT Author Contribution Matrix")
    p_cr = doc.add_paragraph()
    p_cr.paragraph_format.space_after = Pt(4)
    r_cr = p_cr.add_run(
        "Individual author contributions defined according to the international Contributor Roles Taxonomy (CRediT):"
    )
    r_cr.font.name = "Arial"
    r_cr.font.size = Pt(8.5)
    r_cr.font.italic = True
    r_cr.font.color.rgb = C_SECONDARY

    t_cr = doc.add_table(rows=7, cols=3)
    t_cr.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_cr.autofit = False
    cr_widths = [Inches(1.8), Inches(1.5), Inches(3.5)]

    cr_headers = ["Author Name", "Academic Role", "CRediT Contribution Breakdown"]
    for c_idx, h in enumerate(cr_headers):
        cell = t_cr.cell(0, c_idx)
        cell.width = cr_widths[c_idx]
        set_cell_background(cell, HEX_PRIMARY)
        set_cell_margins(cell, 80, 80, 80, 80)
        set_cell_borders(cell, top="1B365D", bottom="1B365D", left="1B365D", right="1B365D")
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if c_idx < 2 else WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h)
        r.font.name = "Arial"
        r.font.size = Pt(8.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)

    for r_idx, auth in enumerate(AUTHORS_LIST, start=1):
        row_vals = [
            auth["name"],
            auth["role"].split("/")[0].strip(),
            auth["credit"]
        ]
        for c_idx, val in enumerate(row_vals):
            cell = t_cr.cell(r_idx, c_idx)
            cell.width = cr_widths[c_idx]
            bg = HEX_LIGHT_BG if r_idx % 2 == 1 else "FFFFFF"
            set_cell_background(cell, bg)
            set_cell_margins(cell, 60, 60, 80, 80)
            set_cell_borders(cell, top="CBD5E1", bottom="CBD5E1", left="CBD5E1", right="CBD5E1")
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.name = "Arial"
            r.font.size = Pt(8)
            if c_idx == 0:
                r.font.bold = True
                r.font.color.rgb = C_PRIMARY
            else:
                r.font.color.rgb = C_DARK

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(4)
    p_sp.paragraph_format.space_after = Pt(0)

    add_signatures_table(doc)

    out_path = os.path.join(OUT_DIR, "Ghostwriting_Declaration.docx")
    doc.save(out_path)
    print(f"[Success] Generated: {out_path}")
    return out_path


if __name__ == "__main__":
    build_conflict_of_interests_doc()
    build_license_agreement_doc()
    build_ghostwriting_declaration_doc()
    print("\n[Complete] All three JTIT declaration DOCX files built successfully.")
