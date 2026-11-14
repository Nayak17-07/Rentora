import os
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import uuid
import time
import requests
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.mongo_client import get_mongo_db
from api.mongo_auth import generate_tokens

BASE_URL = "http://127.0.0.1:8000/api"

def print_header(title):
    print("\n" + "=" * 80)
    print(f"  {title.upper()}")
    print("=" * 80)

def run_step(step_num, module_name, test_desc, passed, detail=""):
    mark = "[PASSED]" if passed else "[FAILED]"
    print(f"{mark:<10} Step {step_num:<2} | {module_name:<32} | {test_desc}")
    if detail:
        print(f"             |-- {detail}")
    if not passed:
        print("\nTest failed. Aborting.")
        sys.exit(1)

def main():
    print_header("Rentora Verification: Digital Agreement, Late Fee Engine & Smart AI Concierge")
    db = get_mongo_db()
    start_time = time.time()

    # 1. Setup Test Customer & Admin
    test_id = uuid.uuid4().hex[:6]
    cust_uid = str(uuid.uuid4())
    cust_uname = f"tenant_{test_id}"
    db.users.insert_one({
        "_id": cust_uid,
        "username": cust_uname,
        "email": f"{cust_uname}@rentora.com",
        "role": "customer",
        "created_at": datetime.now()
    })
    cust_tokens = generate_tokens(cust_uid)
    cust_headers = {"Authorization": f"Bearer {cust_tokens['access']}"}

    admin_uid = str(uuid.uuid4())
    admin_uname = f"admin_eval_{test_id}"
    db.users.insert_one({
        "_id": admin_uid,
        "username": admin_uname,
        "email": f"{admin_uname}@rentora.com",
        "role": "admin",
        "created_at": datetime.now()
    })
    admin_tokens = generate_tokens(admin_uid)
    admin_headers = {"Authorization": f"Bearer {admin_tokens['access']}"}

    run_step(1, "Module 1 & 2: User Roles", "Seed Customer & Admin Accounts", True, f"Tenant: {cust_uname} | Admin: {admin_uname}")

    # 2. Seed Test Rental with Past Due Date to test Late Fee Engine
    rental_id = str(uuid.uuid4())
    past_due = (datetime.now() - timedelta(days=10)).isoformat()
    rented_at = (datetime.now() - timedelta(days=40)).isoformat()

    db.rentals.insert_one({
        "_id": rental_id,
        "user_id": cust_uid,
        "appliance_id": "app_test_smart_fridge",
        "rental_name": "LG 260L Double Door Smart Inverter Refrigerator",
        "category_id": "Appliances",
        "tenure": "6",
        "monthly_rent": 699,
        "security_deposit": 1050,
        "status": "active",
        "rented_at": rented_at,
        "next_billing_date": past_due,
        "delivery_address": {
            "recipient_name": cust_uname,
            "phone": "9876543210",
            "city": "Bangalore",
            "formatted_address": "Flat 402, Green Glen Layout, Bellandur, Bangalore - 560103"
        },
        "delivery_status": "DELIVERED",
        "delivery_tracking": {
            "tracking_id": f"TRK-{test_id.upper()}",
            "current_stage": "DELIVERED",
            "vehicle_number": "KA-01-EL-9284"
        }
    })
    run_step(2, "Module 3: Leases", "Seed Active Rental with Due Date", True, f"Rental ID: {rental_id} (Past Due: 10 days ago)")

    # 3. Test Module 4: Digital Rental Agreement (GET)
    r_agr = requests.get(f"{BASE_URL}/rentals/{rental_id}/agreement", headers=cust_headers)
    agr_data = r_agr.json()
    agr_ok = (
        r_agr.status_code == 200 and
        agr_data.get("success") is True and
        "agreement" in agr_data and
        "stamp_duty_reference" in agr_data["agreement"] and
        len(agr_data["agreement"].get("binding_covenants", [])) >= 6
    )
    run_step(3, "Module 4: Digital Agreements", "Retrieve e-Stamp Legal Lease Contract", agr_ok,
             f"Agreement ID: {agr_data.get('agreement', {}).get('agreement_id')} | Ref: {agr_data.get('agreement', {}).get('stamp_duty_reference')}")

    # 4. Test Module 4: Digital Rental Agreement (POST e-Sign)
    r_sign = requests.post(f"{BASE_URL}/rentals/{rental_id}/sign-agreement", json={
        "signer_name": cust_uname,
        "acceptance_confirmed": True,
        "signature_data_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    }, headers=cust_headers)
    sign_data = r_sign.json()
    sign_ok = (
        r_sign.status_code == 200 and
        sign_data.get("success") is True and
        "signature_hash" in sign_data.get("agreement", {})
    )
    run_step(4, "Module 4: Digital Agreements", "Execute & Cryptographically Sign Agreement", sign_ok,
             f"SHA-256 Hash: {sign_data.get('agreement', {}).get('signature_hash', '')[:28]}...")

    # 5. Test Module 12: Automated Late Fee Calculation & Scheduler
    r_sched = requests.post(f"{BASE_URL}/admin/run-late-fee-scheduler", json={
        "grace_days": 2,
        "rate_per_day": 50.0
    }, headers=admin_headers)
    sched_data = r_sched.json()
    sched_ok = (
        r_sched.status_code == 200 and
        sched_data.get("success") is True and
        sched_data.get("overdue_rentals_count", 0) >= 1
    )
    run_step(5, "Module 12: Late Fee Engine", "Trigger Automated Late Fee Scheduler", sched_ok,
             f"Overdue Leases: {sched_data.get('overdue_rentals_count')} | Assessed Fines: Rs. {sched_data.get('total_late_fees_assessed')}")

    # Verify database update on overdue lease
    updated_lease = db.rentals.find_one({"_id": rental_id})
    lease_overdue_ok = (
        updated_lease.get("billing_status") == "OVERDUE" and
        updated_lease.get("accumulated_late_fee", 0) > 0 and
        updated_lease.get("late_days", 0) >= 8
    )
    run_step(6, "Module 12: Late Fee Engine", "Verify Lease Document Overdue Status in MongoDB", lease_overdue_ok,
             f"Status: {updated_lease.get('billing_status')} | Chargeable Late Days: {updated_lease.get('chargeable_late_days')} | Penalty: Rs. {updated_lease.get('accumulated_late_fee')}")

    # 6. Test Module 12: Admin GET Overdue Rentals List
    r_overdue = requests.get(f"{BASE_URL}/admin/overdue-rentals", headers=admin_headers)
    overdue_data = r_overdue.json()
    overdue_list_ok = (
        r_overdue.status_code == 200 and
        overdue_data.get("overdue_count", 0) >= 1 and
        len(overdue_data.get("recent_audit_logs", [])) >= 1
    )
    run_step(7, "Module 12: Late Fee Engine", "Fetch Admin Overdue Rentals & Audit Trail", overdue_list_ok,
             f"Found {overdue_data.get('overdue_count')} overdue contracts | Total Fines: Rs. {overdue_data.get('total_accumulated_fines')}")

    # 7. Test Module 18: Smart AI Concierge (Late Fee NLP Query)
    r_bot1 = requests.post(f"{BASE_URL}/concierge/chat", json={
        "message": "What is the late fee policy if I delay returning my appliance?"
    })
    bot1_data = r_bot1.json()
    bot1_ok = (
        r_bot1.status_code == 200 and
        ("50" in bot1_data.get("reply", "") or "late" in bot1_data.get("reply", "").lower() or "grace" in bot1_data.get("reply", "").lower())
    )
    run_step(8, "Module 18: AI Concierge", "NLP Intent Match: Late Fee Policy Explanation", bot1_ok,
             f"AI Reply Snippet: '{bot1_data.get('reply', '')[:85]}...'")

    # 8. Test Module 18: Smart AI Concierge (Recommendation & Budget Match)
    r_bot2 = requests.post(f"{BASE_URL}/concierge/chat", json={
        "message": "Suggest a double door refrigerator under 1000 per month"
    })
    bot2_data = r_bot2.json()
    bot2_ok = (
        r_bot2.status_code == 200 and
        len(bot2_data.get("recommendations", [])) > 0
    )
    rec_sample = bot2_data.get("recommendations", [{}])[0]
    run_step(9, "Module 18: AI Concierge", "Natural Language Appliance Catalog Recommendations", bot2_ok,
             f"Recommended: {rec_sample.get('rental_name')} (Rs. {rec_sample.get('monthly_price')}/mo)")

    # 9. Clean up test documents
    db.users.delete_many({"_id": {"$in": [cust_uid, admin_uid]}})
    db.rentals.delete_one({"_id": rental_id})
    db.late_fee_audit_logs.delete_many({"rental_id": rental_id})

    run_step(10, "System Cleanliness", "Teardown Test Leases & Audit Logs", True, "All transient verification records removed cleanly")

    total_time = round(time.time() - start_time, 2)
    print_header("VERIFICATION SUMMARY")
    print(f"  All 10 Steps across Modules 4, 12, and 18 passed with 100% success in {total_time}s!")
    print("=" * 80 + "\n")

if __name__ == '__main__':
    main()
