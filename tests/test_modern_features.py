import os
import requests
import uuid
import datetime
from pymongo import MongoClient

BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000/api")
client = MongoClient("mongodb://127.0.0.1:27017")
db = client["rentora_db"]

def test_modern_features():
    print("=" * 70)
    print("  VERIFYING MODERN INDUSTRY-STANDARD FEATURES")
    print("=" * 70)

    # 1. Register test user
    uid = uuid.uuid4().hex[:6]
    username = f"mod_user_{uid}"
    email = f"mod_{uid}@rentora.com"
    pwd = "Password123!"

    reg_res = requests.post(f"{BASE_URL}/users/", json={
        "username": username,
        "email": email,
        "password": pwd
    })
    assert reg_res.status_code == 201, f"Reg failed: {reg_res.text}"

    # Login to get JWT
    login_res = requests.post(f"{BASE_URL}/token/", json={
        "username": username,
        "password": pwd
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    tokens = login_res.json()
    token = tokens.get("access") or tokens.get("token") or tokens.get("access_token")
    user_id = tokens["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"[OK] 1. Test user registered & authenticated ({username})")

    # Seed approved KYC in 'kyc' collection
    db.kyc.insert_one({
        "_id": str(uuid.uuid4()),
        "user_id": user_id,
        "full_name": "Modern User",
        "aadhaar_number": "XXXX-XXXX-9999",
        "pan_number": "ABCDE1234F",
        "status": "approved",
        "risk_tier": "LOW",
        "created_at": datetime.datetime.now(datetime.timezone.utc)
    })
    print("[OK] 2. KYC cleared for instant checkout")

    # Get an appliance
    appliance = db.appliances.find_one({"stock_quantity": {"$gt": 0}})
    assert appliance is not None, "No available appliances found"
    app_id = appliance.get("appliance_id") or str(appliance["_id"])

    # Add to cart
    cart_res = requests.post(f"{BASE_URL}/cart/", json={
        "appliance_id": app_id,
        "tenure": "6"
    }, headers=headers)
    assert cart_res.status_code in (200, 201), f"Cart add failed: {cart_res.text}"
    print(f"[OK] 3. Appliance added to cart ({appliance.get('rental_name', 'Appliance')})")

    # 4. Checkout with Rentora Care (+₹99) and 1-Click UPI AutoPay
    checkout_payload = {
        "payment_method": "UPI",
        "is_simulation": True,
        "rentora_care": True,
        "rentora_care_fee": 99,
        "auto_debit_enabled": True,
        "delivery_address": {
            "recipient_name": "Modern User",
            "phone": "9876543210",
            "house_flat": "402 Modern Tower",
            "street_area": "Indiranagar",
            "city": "Bengaluru",
            "pincode": "560038"
        }
    }
    co_res = requests.post(f"{BASE_URL}/checkout/", json=checkout_payload, headers=headers)
    assert co_res.status_code == 200, f"Checkout failed: {co_res.text}"
    co_data = co_res.json()
    txn_id = co_data.get("transaction_id")
    print(f"[OK] 4. Checkout successful with Rentora Care & UPI AutoPay! Txn: {txn_id}")

    # 5. Verify payment doc in MongoDB
    payment = db.payments.find_one({"transaction_id": txn_id})
    assert payment is not None, "Payment doc not found"
    assert payment.get("rentora_care") is True, "Payment rentora_care not true"
    assert payment.get("rentora_care_fee") == 99, "Payment rentora_care_fee != 99"
    assert payment.get("auto_debit_enabled") is True, "Payment auto_debit_enabled not true"
    assert payment.get("mandate_status") == "ACTIVE", "Payment mandate_status != ACTIVE"
    print("[OK] 5. Payment doc verified: Rentora Care & Active e-Mandate recorded")

    # 6. Verify rental doc in MongoDB
    rental = db.rentals.find_one({"transaction_id": txn_id})
    assert rental is not None, "Rental doc not found"
    assert rental.get("rentora_care") is True, "Rental rentora_care not true"
    assert rental.get("auto_debit_enabled") is True, "Rental auto_debit_enabled not true"
    rental_id = str(rental["_id"])
    print(f"[OK] 6. Rental doc verified: Rentora Care & AutoPay attached to #{rental_id[:8]}")

    # 7. Test Vacation Pause (Freeze Rent)
    pause_res = requests.post(f"{BASE_URL}/rentals/{rental_id}/pause", json={
        "pause_days": 30,
        "reason": "Family vacation in Goa"
    }, headers=headers)
    assert pause_res.status_code == 200, f"Pause failed: {pause_res.text}"
    pause_data = pause_res.json()
    assert pause_data.get("success") is True
    print(f"[OK] 7. Vacation Pause activated! Rent frozen for 30 days (Holding fee: Rs. 199)")

    # Verify status in DB
    rental_paused = db.rentals.find_one({"_id": rental["_id"]})
    assert rental_paused.get("status") == "PAUSED", f"Rental status is {rental_paused.get('status')}"
    assert rental_paused.get("holding_fee") == 199, "Holding fee not 199"
    assert rental_paused.get("pause_until") is not None, "pause_until not set"
    print(f"[OK] 8. Rental status in DB verified as PAUSED until {rental_paused.get('pause_until')[:10]}")

    # 8. Test Subscription Resume
    resume_res = requests.post(f"{BASE_URL}/rentals/{rental_id}/resume", headers=headers)
    assert resume_res.status_code == 200, f"Resume failed: {resume_res.text}"
    resume_data = resume_res.json()
    assert resume_data.get("success") is True
    print(f"[OK] 9. Subscription resumed! Full coverage restored")

    # Verify status in DB
    rental_resumed = db.rentals.find_one({"_id": rental["_id"]})
    assert rental_resumed.get("status") == "active", f"Rental status is {rental_resumed.get('status')}"
    assert rental_resumed.get("pause_until") is None, "pause_until not cleared"
    print(f"[OK] 10. Rental status in DB verified back to active")

    # Cleanup test data
    db.users.delete_one({"_id": user_id})
    db.kyc.delete_many({"user_id": user_id})
    db.payments.delete_one({"transaction_id": txn_id})
    db.rentals.delete_one({"_id": rental["_id"]})
    print("[OK] 11. Test data cleanly removed")

    print("=" * 70)
    print("  ALL 11 MODERN FEATURE TESTS PASSED (100% OPERATIONAL)!")
    print("=" * 70)

if __name__ == "__main__":
    test_modern_features()
