import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import uuid
import datetime
import requests
from api.mongo_client import get_mongo_db
from api.mongo_auth import generate_tokens

BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000/api")

def run_tests():
    print("=" * 70)
    print("  RENTORA MODULE 4: PAYMENT & ASSET RETURN VERIFICATION")
    print("=" * 70)
    
    db = get_mongo_db()
    
    # 1. Setup Test User
    test_id = str(uuid.uuid4())
    test_username = f"pay_tester_{uuid.uuid4().hex[:6]}"
    test_email = f"{test_username}@rentora.com"
    user_doc = {
        "_id": test_id,
        "username": test_username,
        "email": test_email,
        "role": "customer",
        "created_at": datetime.datetime.utcnow()
    }
    db.users.insert_one(user_doc)
    tokens = generate_tokens(test_id)
    auth_header = {"Authorization": f"Bearer {tokens['access']}"}
    print(f"[OK] 1. Created test customer in MongoDB: {test_username}")

    # 2. Setup Test Appliance
    appliance_id = f"test_app_{uuid.uuid4().hex[:6]}"
    app_doc = {
        "_id": appliance_id,
        "appliance_id": appliance_id,
        "rental_name": "Samsung 4K Crystal UHD TV",
        "category_id": "Electronics",
        "monthly_price": 899.0,
        "security_deposit": 1500.0,
        "pricing": {"3": 899.0, "6": 799.0, "12": 699.0},
        "stock_quantity": 5
    }
    db.appliances.insert_one(app_doc)
    print(f"[OK] 2. Seeded test inventory item: {app_doc['rental_name']} (Stock: 5)")

    # 3. Add to Cart (6-Month Tenure)
    cart_res = requests.post(f"{BASE_URL}/cart/", json={"appliance_id": appliance_id, "tenure": "6"}, headers=auth_header)
    assert cart_res.status_code in [200, 201], f"Cart post failed: {cart_res.text}"
    print(f"[OK] 3. Added to cart with 6-month plan (Rent: Rs. 799/mo, Deposit: Rs. 1500)")

    # 4. KYC Approval
    kyc_res = requests.post(f"{BASE_URL}/kyc/", json={
        "full_name": test_username,
        "id_proof": "AADHAAR_9988.png",
        "address_proof": "PASSPORT_4455.png",
        "ocr_audit": {"verified": True}
    }, headers=auth_header)
    assert kyc_res.status_code == 200 and kyc_res.json().get("status") == "approved"
    print(f"[OK] 4. KYC verification approved for checkout")

    # 5. Execute Checkout with Simulated UPI Payment
    checkout_payload = {
        "payment_method": "UPI",
        "payment_details": {
            "upi_id": "tester@okaxis",
            "type": "UPI_COLLECT"
        }
    }
    chk_res = requests.post(f"{BASE_URL}/checkout/", json=checkout_payload, headers=auth_header)
    assert chk_res.status_code == 200, f"Checkout failed: {chk_res.text}"
    
    chk_data = chk_res.json()
    txn_id = chk_data.get("transaction_id")
    inv_num = chk_data.get("invoice_number")
    total_paid = chk_data.get("total_paid")
    assert txn_id and txn_id.startswith("TXN_"), f"Invalid txn_id: {txn_id}"
    assert inv_num and inv_num.startswith("INV-"), f"Invalid inv_num: {inv_num}"
    
    # 799 rent + 1500 deposit (Mandatory KYC, standard refundable deposit) + 143.82 GST (18% on rent) = 2442.82
    expected_tax = round(799.0 * 0.18, 2)
    expected_deposit = 1500.0 # Full standard refundable deposit (KYC mandatory for all customers)
    expected_total = round(799.0 + expected_deposit + expected_tax, 2)
    assert total_paid == expected_total, f"Expected total {expected_total}, got {total_paid}"
    print(f"[OK] 5. Checkout payment processed successfully!")
    print(f"       |-- Transaction ID : {txn_id}")
    print(f"       |-- Invoice Number : {inv_num}")
    print(f"       |-- Amount Breakdown: Rent Rs. 799 + Deposit Rs. {expected_deposit} (Refundable Deposit) + 18% GST Rs. {expected_tax} = Rs. {total_paid}")

    # 6. Verify MongoDB Payments Collection
    payment_doc = db.payments.find_one({"transaction_id": txn_id})
    assert payment_doc is not None, "Payment record not found in MongoDB!"
    assert payment_doc["payment_method"] == "UPI"
    assert payment_doc["status"] == "SUCCESS"
    print(f"[OK] 6. Verified immutable payment record in MongoDB `payments` collection")

    # 7. Verify Inventory Decrement
    updated_app = db.appliances.find_one({"$or": [{"appliance_id": appliance_id}, {"_id": appliance_id}]})
    assert updated_app["stock_quantity"] == 4, f"Stock should be 4, got {updated_app['stock_quantity']}"
    print(f"[OK] 7. Inventory stock decremented from 5 -> 4")

    # 8. Verify Payment History API (/api/payments/)
    hist_res = requests.get(f"{BASE_URL}/payments/", headers=auth_header)
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert len(hist_data) >= 1
    assert hist_data[0]["transaction_id"] == txn_id
    print(f"[OK] 8. Tested GET /api/payments/ endpoint (Returned {len(hist_data)} ledger record(s))")

    # 9. Verify Single Invoice API (/api/payments/<txn_id>/)
    inv_res = requests.get(f"{BASE_URL}/payments/{txn_id}/", headers=auth_header)
    assert inv_res.status_code == 200
    assert inv_res.json()["invoice_number"] == inv_num
    print(f"[OK] 9. Tested GET /api/payments/<txn_id>/ invoice retrieval")

    # 10. Verify Active Rental & Escrow Deposit
    rent_res = requests.get(f"{BASE_URL}/rentals/", headers=auth_header)
    assert rent_res.status_code == 200
    active_rentals = rent_res.json()
    assert len(active_rentals) >= 1
    rental_record = active_rentals[0]
    rental_id = rental_record["rental_id"]
    assert rental_record["deposit_status"] == "HELD"
    assert rental_record["security_deposit"] == expected_deposit
    print(f"[OK] 10. Active rental contract confirmed. Deposit status: HELD IN ESCROW (Rs. {expected_deposit})")

    # 11. Asset Return & Deposit Refund Workflow (Module 4)
    patch_res = requests.patch(f"{BASE_URL}/rentals/", json={"rental_id": rental_id}, headers=auth_header)
    assert patch_res.status_code == 200
    patch_data = patch_res.json()
    assert patch_data.get("deposit_refunded") == expected_deposit
    refund_txn = patch_data.get("refund_transaction_id")
    assert refund_txn and refund_txn.startswith("REF_")
    print(f"[OK] 11. Asset return processed & Deposit Refund executed!")
    print(f"       |-- Deposit Refunded   : Rs. {patch_data.get('deposit_refunded')}")
    print(f"       |-- Refund Reference ID: {refund_txn}")

    # 12. Verify Stock Replenished
    replenished_app = db.appliances.find_one({"$or": [{"appliance_id": appliance_id}, {"_id": appliance_id}]})
    assert replenished_app["stock_quantity"] == 5, f"Stock should be 5, got {replenished_app['stock_quantity']}"
    print(f"[OK] 12. Stock replenished in real time from 4 -> 5")

    # 13. Clean up test records
    db.users.delete_one({"_id": test_id})
    db.appliances.delete_one({"_id": appliance_id})
    db.carts.delete_many({"user_id": test_id})
    db.rentals.delete_many({"user_id": test_id})
    db.payments.delete_many({"user_id": test_id})
    db.refunds.delete_many({"user_id": test_id})
    print(f"[OK] 13. Test data cleaned up successfully")

    print("\n" + "=" * 70)
    print("  ALL 13 TESTS PASSED: Payment Gateway & Return Ledger are 100% Operational!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
