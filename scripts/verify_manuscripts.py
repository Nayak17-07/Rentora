import docx
import os

files = [
    'final_submission/Rentora_Revised_Research_Paper.docx',
    'final_submission/Rentora_Anonymized_For_Review.docx'
]

for f in files:
    if not os.path.exists(f):
        print(f"File not found: {f}")
        continue
    doc = docx.Document(f)
    print("=" * 60)
    print(f"VERIFYING: {f}")
    
    # 1. Abstract word count
    for p in doc.paragraphs:
        if p.text.startswith("Abstract—"):
            words = p.text.replace("Abstract—", "").strip().split()
            print(f"Abstract Word Count: {len(words)} (Must be <= 200)")
            break
            
    # 2. Table count & Table III rows
    print(f"Total Tables in Document: {len(doc.tables)}")
    # Table 3 is index 2
    t3 = doc.tables[2]
    # Check Table III header or row count
    print(f"Table III Total Rows: {len(t3.rows)} (1 Header + 15 Features = 16 rows)")
    for i, row in enumerate(t3.rows):
        cells = [c.text.strip().replace('\n', ' ') for c in row.cells]
        if i in [1, 2, 8, 9, 12, 14, 15]:
            print(f"  Row {i:02d}: {cells[0]} | {cells[1]} | {cells[2]}")
            
    # 3. Check Figure 5 Caption and Mentions
    for p in doc.paragraphs:
        if "Fig. 5." in p.text:
            print(f"Fig. 5 Caption: {p.text}")
        if "predicted churn probability" in p.text.lower() and "0.989" in p.text:
            print(f"Text sync match: {p.text[:100]}...")

    # 4. Check Table numbering in document
    table_titles = []
    for p in doc.paragraphs:
        if p.text.strip().startswith("TABLE "):
            table_titles.append(p.text.strip())
    print(f"Table Titles Detected ({len(table_titles)}):")
    for t in table_titles:
        print(f"  {t}")
print("=" * 60)
