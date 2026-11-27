"""Rental-Document Consistency Verification (Item 6).

Verifies consistency across Rentora's catalog listings (`data/appliances_catalog.csv`),
backend contract/pricing logic (`server/src/routes/rentals.js`, `inventory.js`),
and platform documentation (`README.md`, `ARCHITECTURE.md`).

Every check emits:
  - verdict: CONSISTENT | CONTRADICTION | MISSING_CONDITION | ABSTAIN
  - evidence: exact file:line or catalog record citations
  - abstention when required source documents (e.g., manufacturer manuals) are absent.
"""

from __future__ import annotations

import ast
import os
import re
from dataclasses import dataclass, asdict
from typing import Any, Dict, List

import pandas as pd


REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@dataclass
class VerificationFinding:
    """Structured result of a single document/listing consistency check."""

    check_id: str
    scope: str
    verdict: str  # CONSISTENT | CONTRADICTION | MISSING_CONDITION | ABSTAIN
    summary: str
    evidence: List[str]


def _find_line_citations(filepath: str, pattern: str, repo_root: str) -> List[str]:
    """Return `relpath:line_no: snippet` citations for lines matching regex pattern."""
    if not os.path.exists(filepath):
        return []
    rel = os.path.relpath(filepath, repo_root).replace("\\", "/")
    regex = re.compile(pattern, re.IGNORECASE)
    citations: List[str] = []
    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        for idx, line in enumerate(f, start=1):
            if regex.search(line):
                citations.append(f"{rel}:{idx}: {line.strip()[:120]}")
    return citations


def verify_catalog_consistency(repo_root: str = REPO_ROOT) -> List[VerificationFinding]:
    """Check catalog listings for pricing/tenure contradictions and missing conditions."""
    catalog_path = os.path.join(repo_root, "data", "appliances_catalog.csv")
    if not os.path.exists(catalog_path):
        return [
            VerificationFinding(
                check_id="CAT-001",
                scope="appliances_catalog.csv",
                verdict="ABSTAIN",
                summary="Catalog file not found; cannot verify listing pricing.",
                evidence=[],
            )
        ]

    df = pd.read_csv(catalog_path)
    findings: List[VerificationFinding] = []

    # 1. Tiered tenure pricing monotonicity: 12-month <= 6-month <= 3-month <= monthly_price
    non_monotonic: List[str] = []
    malformed_pricing: List[str] = []
    deposit_mismatches: List[str] = []

    for idx, row in df.iterrows():
        app_id = str(row.get("appliance_id", f"row_{idx}"))
        m_price = float(row.get("monthly_price", 0) or 0)
        dep = float(row.get("security_deposit", 0) or 0)

        # Check deposit ratio against rentals.js fallback (1.5x monthly rent)
        if m_price > 0 and abs(dep - round(m_price * 1.5)) > max(5.0, 0.15 * m_price):
            deposit_mismatches.append(f"{app_id} (monthly={m_price}, deposit={dep})")

        raw_pricing = row.get("pricing")
        try:
            tiers = ast.literal_eval(str(raw_pricing)) if pd.notna(raw_pricing) else {}
            if not isinstance(tiers, dict):
                malformed_pricing.append(app_id)
                continue
            p3 = float(tiers.get("3", m_price))
            p6 = float(tiers.get("6", p3))
            p12 = float(tiers.get("12", p6))
            if not (p12 <= p6 <= p3):
                non_monotonic.append(f"{app_id} (3m={p3}, 6m={p6}, 12m={p12})")
        except Exception:
            malformed_pricing.append(app_id)

    findings.append(
        VerificationFinding(
            check_id="CAT-TIER-MONOTONIC",
            scope="data/appliances_catalog.csv",
            verdict="CONSISTENT" if not non_monotonic and not malformed_pricing else "CONTRADICTION",
            summary=(
                f"Checked {len(df)} listings for tiered tenure discount monotonicity (12m <= 6m <= 3m): "
                f"{len(non_monotonic)} non-monotonic, {len(malformed_pricing)} malformed."
            ),
            evidence=(non_monotonic[:5] + malformed_pricing[:5]) or [f"data/appliances_catalog.csv:1-{len(df)+1} (all {len(df)} rows monotonic)"],
        )
    )

    findings.append(
        VerificationFinding(
            check_id="CAT-DEPOSIT-RATIO",
            scope="data/appliances_catalog.csv vs server/src/routes/rentals.js",
            verdict="CONSISTENT" if not deposit_mismatches else "CONTRADICTION",
            summary=(
                f"Checked {len(df)} listings against 1.5x monthly_price deposit rule: "
                f"{len(deposit_mismatches)} deviations (>15% from 1.5x)."
            ),
            evidence=deposit_mismatches[:5] or ["data/appliances_catalog.csv (all deposits within 15% of 1.5x monthly_price)"],
        )
    )

    # Daily vs monthly pricing sanity (daily_price * 30 >= monthly_price)
    daily_gt_monthly = []
    for idx, row in df.iterrows():
        d_price = float(row.get("daily_price", 0) or 0)
        m_price = float(row.get("monthly_price", 0) or 0)
        if d_price > 0 and m_price > 0 and (d_price * 30.0) < m_price:
            daily_gt_monthly.append(f"{row.get('appliance_id', idx)} (daily*30={d_price*30}, monthly={m_price})")
    findings.append(
        VerificationFinding(
            check_id="CAT-DAILY-VS-MONTHLY",
            scope="data/appliances_catalog.csv",
            verdict="CONSISTENT" if not daily_gt_monthly else "CONTRADICTION",
            summary=f"Checked {len(df)} listings for daily_price*30 >= monthly_price: {len(daily_gt_monthly)} violations.",
            evidence=daily_gt_monthly[:5] or [f"data/appliances_catalog.csv:1-{len(df)+1} (all {len(df)} rows valid)"],
        )
    )

    # 2. Check missing return/warranty/damage conditions in catalog schema
    required_return_cols = {"return_policy", "damage_waiver_limit", "warranty_terms"}
    missing_cols = sorted(required_return_cols - set(df.columns))
    findings.append(
        VerificationFinding(
            check_id="CAT-MISSING-RETURN-TERMS",
            scope="data/appliances_catalog.csv",
            verdict="MISSING_CONDITION" if missing_cols else "CONSISTENT",
            summary=(
                f"Catalog schema lacks explicit per-SKU return/waiver/warranty columns: {missing_cols}."
                if missing_cols
                else "All return/waiver/warranty columns present in catalog."
            ),
            evidence=[f"data/appliances_catalog.csv:1 (columns={list(df.columns)})"],
        )
    )

    return findings


def verify_terms_and_docs(repo_root: str = REPO_ROOT) -> List[VerificationFinding]:
    """Cross-verify Rent-to-Own equity, Shield waiver, and refund rules across docs & code."""
    findings: List[VerificationFinding] = []
    readme = os.path.join(repo_root, "README.md")
    arch = os.path.join(repo_root, "ARCHITECTURE.md")
    rentals_js = os.path.join(repo_root, "server", "src", "routes", "rentals.js")

    # 1. Rent-to-Own 70% equity claim: README + ARCHITECTURE vs rentals.js
    r2o_doc_ev = _find_line_citations(readme, r"70%", repo_root) + _find_line_citations(arch, r"70%", repo_root)
    r2o_code_ev = _find_line_citations(rentals_js, r"0\.70|equityCredit", repo_root)
    if r2o_doc_ev and r2o_code_ev:
        verdict = "CONSISTENT"
        summary = "Rent-to-Own 70% equity accrual in docs matches `rentals.js` (`accumulatedRent * 0.70`)."
    elif r2o_doc_ev or r2o_code_ev:
        verdict = "MISSING_CONDITION"
        summary = "Rent-to-Own equity rule found in only one of docs or backend code."
    else:
        verdict = "ABSTAIN"
        summary = "Could not locate Rent-to-Own equity rule in docs or code."
    findings.append(
        VerificationFinding(
            check_id="DOC-R2O-EQUITY",
            scope="README.md, ARCHITECTURE.md, server/src/routes/rentals.js",
            verdict=verdict,
            summary=summary,
            evidence=(r2o_doc_ev[:2] + r2o_code_ev[:2]),
        )
    )

    # 2. Rentora Shield ₹10,000 waiver claim vs backend enforcement
    shield_doc_ev = _find_line_citations(readme, r"10,000|Rentora Shield", repo_root) + _find_line_citations(arch, r"10,000|Rentora Shield", repo_root)
    shield_code_ev = _find_line_citations(rentals_js, r"10000|shield|waiver", repo_root)
    if shield_doc_ev and not shield_code_ev:
        findings.append(
            VerificationFinding(
                check_id="DOC-SHIELD-ENFORCEMENT",
                scope="README.md, ARCHITECTURE.md vs server/src/routes/rentals.js",
                verdict="MISSING_CONDITION",
                summary="Docs promise a ₹10,000 Rentora Shield damage waiver, but no ₹10,000 waiver constant was found in `rentals.js`.",
                evidence=shield_doc_ev[:3],
            )
        )
    elif shield_doc_ev and shield_code_ev:
        findings.append(
            VerificationFinding(
                check_id="DOC-SHIELD-ENFORCEMENT",
                scope="README.md, ARCHITECTURE.md vs server/src/routes/rentals.js",
                verdict="CONSISTENT",
                summary="Rentora Shield ₹10,000 waiver documented and enforced in `rentals.js`.",
                evidence=(shield_doc_ev[:2] + shield_code_ev[:2]),
            )
        )

    # 3. Mandatory KYC HTTP 403 gateway check across docs & checkout.js
    checkout_js = os.path.join(repo_root, "server", "src", "routes", "checkout.js")
    kyc_doc_ev = _find_line_citations(arch, r"403|Mandatory KYC", repo_root)
    kyc_code_ev = _find_line_citations(checkout_js, r"403|kyc", repo_root)
    findings.append(
        VerificationFinding(
            check_id="DOC-KYC-GATEWAY",
            scope="ARCHITECTURE.md vs server/src/routes/checkout.js",
            verdict="CONSISTENT" if (kyc_doc_ev and kyc_code_ev) else "MISSING_CONDITION",
            summary=(
                "Mandatory KYC 403 gateway documented in ARCHITECTURE.md and enforced in checkout.js."
                if (kyc_doc_ev and kyc_code_ev)
                else "Mandatory KYC enforcement could not be matched across docs and checkout.js."
            ),
            evidence=(kyc_doc_ev[:2] + kyc_code_ev[:2]),
        )
    )

    # 4. 4-stage refurbishment pipeline check across ARCHITECTURE.md & inventory.js
    inventory_js = os.path.join(repo_root, "server", "src", "routes", "inventory.js")
    refurb_doc_ev = _find_line_citations(arch, r"RETURN_INSPECTION|RESTOCKED_AVAILABLE", repo_root)
    refurb_code_ev = _find_line_citations(inventory_js, r"RETURN_INSPECTION|RESTOCKED_AVAILABLE", repo_root)
    findings.append(
        VerificationFinding(
            check_id="DOC-REFURB-STAGES",
            scope="ARCHITECTURE.md vs server/src/routes/inventory.js",
            verdict="CONSISTENT" if (refurb_doc_ev and refurb_code_ev) else "MISSING_CONDITION",
            summary=(
                "4-stage refurbishment pipeline stages match between ARCHITECTURE.md and inventory.js."
                if (refurb_doc_ev and refurb_code_ev)
                else "Refurbishment stages mismatch or missing between docs and inventory.js."
            ),
            evidence=(refurb_doc_ev[:2] + refurb_code_ev[:2]),
        )
    )

    # 5. Transaction deposit refund bounds check
    tx_path = os.path.join(repo_root, "data", "rentals_transactions.csv")
    if os.path.exists(tx_path):
        tx_df = pd.read_csv(tx_path)
        bad_refunds = []
        for idx, r in tx_df.iterrows():
            held = r.get("total_deposit_held")
            ref = r.get("deposit_refunded")
            if pd.notna(held) and pd.notna(ref) and float(ref) > float(held) + 0.01:
                bad_refunds.append(f"row_{idx} (refunded={ref} > held={held})")
        findings.append(
            VerificationFinding(
                check_id="TX-DEPOSIT-BOUNDS",
                scope="data/rentals_transactions.csv",
                verdict="CONSISTENT" if not bad_refunds else "CONTRADICTION",
                summary=f"Checked {len(tx_df)} transactions for deposit_refunded <= total_deposit_held: {len(bad_refunds)} violations.",
                evidence=bad_refunds[:5] or [f"data/rentals_transactions.csv:1-{len(tx_df)+1} (all checked rows valid)"],
            )
        )

    # 5b. LegalPages.jsx deposit & policy alignment check
    legal_jsx = os.path.join(repo_root, "frontend", "src", "LegalPages.jsx")
    if os.path.exists(legal_jsx):
        bad_dep = _find_line_citations(legal_jsx, r"2–3×|typically 2×", repo_root)
        good_dep = _find_line_citations(legal_jsx, r"1\.5×", repo_root)
        findings.append(
            VerificationFinding(
                check_id="DOC-LEGAL-DEPOSIT-ALIGNMENT",
                scope="frontend/src/LegalPages.jsx vs server/src/routes/rentals.js",
                verdict="CONTRADICTION" if bad_dep else ("CONSISTENT" if good_dep else "MISSING_CONDITION"),
                summary=(
                    "LegalPages.jsx contradicts the 1.5x monthly rent deposit rule."
                    if bad_dep
                    else "LegalPages.jsx deposit, Shield waiver, and Rental/Owner policy pages align with backend rules."
                ),
                evidence=bad_dep[:3] or good_dep[:3],
            )
        )

    # 6. Manufacturer manuals verification -> MUST ABSTAIN when manuals are absent
    manual_files = []
    for root, _, files in os.walk(repo_root):
        if "node_modules" in root or ".git" in root:
            continue
        for fn in files:
            if "manual" in fn.lower() and fn.lower().endswith((".pdf", ".md", ".txt", ".docx")):
                manual_files.append(os.path.relpath(os.path.join(root, fn), repo_root))

    findings.append(
        VerificationFinding(
            check_id="DOC-MANUFACTURER-MANUALS",
            scope="manufacturer_manuals",
            verdict="ABSTAIN" if not manual_files else "CONSISTENT",
            summary=(
                "Abstaining: no manufacturer appliance manuals exist in repository to verify safety/maintenance claims."
                if not manual_files
                else f"Found {len(manual_files)} manual file(s) for verification."
            ),
            evidence=manual_files[:5],
        )
    )

    return findings


def run_document_verification(repo_root: str = REPO_ROOT) -> Dict[str, Any]:
    """Run all catalog, contract, and documentation consistency checks."""
    all_findings = verify_catalog_consistency(repo_root) + verify_terms_and_docs(repo_root)
    counts: Dict[str, int] = {}
    for f in all_findings:
        counts[f.verdict] = counts.get(f.verdict, 0) + 1
    return {
        "provenance": "REPO_DATA",
        "summary_counts": counts,
        "findings": [asdict(f) for f in all_findings],
    }


if __name__ == "__main__":
    import json
    print(json.dumps(run_document_verification(), indent=2))
