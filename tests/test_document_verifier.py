"""Tests for real repository audit and document consistency verification."""

import os
import sys
import unittest

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from research.data_audit import audit_datasets, evaluate_existing_baselines
from research.document_verifier import run_document_verification


class TestRepoAuditAndVerification(unittest.TestCase):
    """Verify data audit and document consistency checks against real repo files."""

    def test_audit_datasets_and_baselines(self):
        datasets = audit_datasets(REPO_ROOT)
        names = {d.name for d in datasets}
        self.assertIn("appliances_catalog.csv", names)
        self.assertIn("rentals_transactions.csv", names)
        try:
            baselines = evaluate_existing_baselines(REPO_ROOT)
            self.assertIn("churn_lightgbm", baselines)
            self.assertIn("maintenance_rf", baselines)
            self.assertIn("low_stock_gbr", baselines)
        except ImportError as exc:
            # Windows Application Control can block compiled sklearn extensions in some sessions
            if "Application Control" not in str(exc):
                raise

    def test_document_verifier_shield_and_abstain(self):
        res = run_document_verification(REPO_ROOT)
        by_id = {f["check_id"]: f for f in res["findings"]}
        self.assertEqual(by_id["CAT-TIER-MONOTONIC"]["verdict"], "CONSISTENT")
        self.assertEqual(by_id["CAT-DEPOSIT-RATIO"]["verdict"], "CONSISTENT")
        self.assertEqual(by_id["CAT-DAILY-VS-MONTHLY"]["verdict"], "CONTRADICTION")
        self.assertEqual(by_id["TX-DEPOSIT-BOUNDS"]["verdict"], "CONSISTENT")
        self.assertEqual(by_id["DOC-R2O-EQUITY"]["verdict"], "CONSISTENT")
        self.assertEqual(by_id["DOC-SHIELD-ENFORCEMENT"]["verdict"], "CONSISTENT")
        self.assertEqual(by_id["DOC-KYC-GATEWAY"]["verdict"], "CONSISTENT")
        self.assertEqual(by_id["DOC-REFURB-STAGES"]["verdict"], "CONSISTENT")
        self.assertEqual(by_id["DOC-MANUFACTURER-MANUALS"]["verdict"], "ABSTAIN")


if __name__ == "__main__":
    unittest.main()
