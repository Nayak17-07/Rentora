import docx

doc = docx.Document('final_submission/Rentora_Revised_Research_Paper.docx')
print("Rentora_Revised_Research_Paper.docx tables:")
for i, t in enumerate(doc.tables):
    first_cell = t.rows[0].cells[0].text.strip().replace('\n', ' ')
    print(f"Table {i}: rows={len(t.rows)}, cols={len(t.columns)}, first_cell={first_cell[:40]}")

doc2 = docx.Document('final_submission/Rentora_Anonymized_For_Review.docx')
print("\nRentora_Anonymized_For_Review.docx tables:")
for i, t in enumerate(doc2.tables):
    first_cell = t.rows[0].cells[0].text.strip().replace('\n', ' ')
    print(f"Table {i}: rows={len(t.rows)}, cols={len(t.columns)}, first_cell={first_cell[:40]}")
