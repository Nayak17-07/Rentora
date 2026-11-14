import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import uuid
import requests
from api.mongo_client import get_mongo_db

BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000/api")

def test_stock_flow():
    print("=" * 70)
    print("  VERIFYING STOCK DECREMENT ON RENT & INCREMENT ON RETURN")
    print("=" * 70)
    
    db = get_mongo_db()
    uid = uuid.uuid4().hex[:6]
    
    # 1. Create a test appliance with initial stock of 3
    test_appliance_id = f"test_stock_app_{uid}"
    app_doc = {
        "_id": test_appliance_id,
        "appliance_id": test_appliance_id,
        "rental_name": f"Stock Test Appliance {uid}",
        "category_id": "Appliances",
        "sub_category": "Refrigerators",
        "monthly_price": 500,
        "pricing": {"3": 500, "6": 450, "12": 400},
        "security_deposit": 750,
        "stock_quantity": 3,
        "available_cities": ["Bangalore", "Hyderabad", "Mumbai", "Delhi", "Pune"],
        "description": "Stock verification unit",
        "image_url": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a"
    }
    db.appliances.insert_one(app_doc)
    print(f"[STEP 1] Created test appliance '{app_doc['rental_name']}' with initial stock = 3")

    # 2. Register & login a test customer
    cust_username = f"stock_user_{uid}"
    cust_email = f"{cust_username}@rentora.com"
    r_reg = requests.post(f"{BASE_URL}/users/", json={
        "username": cust_username,
        "email": cust_email,
        "password": "Password123!",
        "role": "customer"
    })
    assert r_reg.status_code == 201, f"Reg failed: {r_reg.text}"
    
    r_login = requests.post(f"{BASE_URL}/token/", json={
        "username": cust_username,
        "password": "Password123!"
    })
    assert r_login.status_code == 200, f"Login failed: {r_login.text}"
    token = r_login.json()["access"]
    auth_headers = {"Authorization": f"Bearer {token}"}
    print(f"[STEP 2] Registered & authenticated customer '{cust_username}'")

    # Complete KYC verification (Mandatory Security Gateway)
    r_kyc = requests.post(f"{BASE_URL}/kyc/", json={
        "full_name": cust_username,
        "id_proof": "AADHAAR_STOCK_TEST.png",
        "address_proof": "PASSPORT_STOCK_TEST.png",
        "ocr_audit": {"verified": True}
    }, headers=auth_headers)
    assert r_kyc.status_code == 200, f"KYC failed: {r_kyc.text}"
    print(f"[STEP 2b] Customer KYC verified successfully")

    # 3. Add to cart & checkout
    r_cart = requests.post(f"{BASE_URL}/cart/", json={
        "appliance_id": test_appliance_id,
        "tenure": "3"
    }, headers=auth_headers)
    assert r_cart.status_code in (200, 201), f"Cart add failed: {r_cart.text}"

    r_checkout = requests.post(f"{BASE_URL}/checkout/", json={
        "payment_method": "UPI_GATEWAY"
    }, headers=auth_headers)
    assert r_checkout.status_code == 200, f"Checkout failed: {r_checkout.text}"
    checkout_data = r_checkout.json()
    txn_id = checkout_data["transaction_id"]
    rental_doc = db.rentals.find_one({"transaction_id": txn_id})
    assert rental_doc is not None, "Rental document was not found in DB"
    rental_id = rental_doc["_id"]
    print(f"[STEP 3] Customer rented appliance! Lease ID: {rental_id}")

    # Verify Stock DECREMENT (3 -> 2)
    app_after_rent = db.appliances.find_one({"_id": test_appliance_id})
    assert app_after_rent["stock_quantity"] == 2, f"Expected stock 2, got {app_after_rent['stock_quantity']}"
    print(f"[SUCCESS] Stock decremented properly upon rent: 3 -> {app_after_rent['stock_quantity']} (-1)")

    # 4. Customer returns the appliance
    r_return = requests.patch(f"{BASE_URL}/rentals/", json={
        "rental_id": rental_id,
        "action": "return",
        "damage_level": "NONE",
        "late_days": 0
    }, headers=auth_headers)
    assert r_return.status_code == 200, f"Return failed: {r_return.text}"
    return_data = r_return.json()
    print(f"[STEP 4] Customer returned appliance! Refund Txn: {return_data.get('refund_transaction_id')}")

    # Verify Stock INCREMENT (2 -> 3)
    app_after_return = db.appliances.find_one({"_id": test_appliance_id})
    assert app_after_return["stock_quantity"] == 3, f"Expected stock 3, got {app_after_return['stock_quantity']}"
    print(f"[SUCCESS] Stock incremented properly upon return: 2 -> {app_after_return['stock_quantity']} (+1)")

    # 5. Test Out of Stock boundary enforcement
    # Set stock to 0
    db.appliances.update_one({"_id": test_appliance_id}, {"$set": {"stock_quantity": 0}})
    
    # Try adding to cart or renting
    r_cart_oofs = requests.post(f"{BASE_URL}/cart/", json={
        "appliance_id": test_appliance_id,
        "tenure": "3"
    }, headers=auth_headers)
    assert r_cart_oofs.status_code == 400, f"Expected 400 Out of Stock, got {r_cart_oofs.status_code}"
    print(f"[SUCCESS] Prevented adding out-of-stock item: {r_cart_oofs.json().get('error')}")

    # Clean up test records
    db.appliances.delete_one({"_id": test_appliance_id})
    db.users.delete_one({"username": cust_username})
    db.rentals.delete_one({"_id": rental_id})
    db.carts.delete_many({"user_id": r_login.json()["user"]["id"]})
    db.payments.delete_many({"user_email": cust_email})
    db.refunds.delete_many({"rental_id": rental_id})

    print("=" * 70)
    print("  ALL STOCK INCREMENT & DECREMENT TESTS PASSED PERFECTLY!")
    print("=" * 70)

if __name__ == "__main__":
    test_stock_flow()
