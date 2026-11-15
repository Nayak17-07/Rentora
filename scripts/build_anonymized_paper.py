"""
Rentora: Anonymized Manuscript Generator for JTIT Double-Blind Peer Review
Generates the blinded version with all author names, institutional affiliations,
emails, KMIT references, and acknowledgments withheld.
"""

import os
from build_revised_paper import build_manuscript

if __name__ == "__main__":
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target = os.path.join(project_root, "final_submission", "Rentora_Anonymized_For_Review.docx")
    build_manuscript(target, anonymized=True)
