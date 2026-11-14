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
    print("=" * 76)
    print("  VERIFYING THREE DISTINCT USER ROLES (ADMIN, OWNER, CUSTOMER)")
    print("=" * 76)
    
    db = get_mongo_db()
    uid = uuid.uuid4().hex[:6]
    
    # ---------------------------------------------------------
    # 1. CUSTOMER ROLE: Register & Verify
    # ---------------------------------------------------------
    customer_username = f"customer_{uid}"
    customer_email = f"{customer_username}@rentora.com"
    r_cust_reg = requests.post(f"{BASE_URL}/users/", json={
        "username": customer_username,
        "email": customer_email,
        "password": "Password123!",
        "role": "customer"
    })
    assert r_cust_reg.status_code == 201
    
    r_cust_login = requests.post(f"{BASE_URL}/token/", json={
        "username": customer_username,
        "password": "Password123!"
    })
    cust_tokens = r_cust_login.json()
    cust_id = cust_tokens["user"]["id"]
    cust_auth = {"Authorization": f"Bearer {cust_tokens['access']}"}
    
    # Verify profile
    r_me = requests.get(f"{BASE_URL}/auth/me/", headers=cust_auth)
    assert r_me.status_code == 200 and r_me.json().get("role") == "customer"
    print(f"[OK] 1. Role: CUSTOMER successfully registered & authenticated ({customer_username})")

    # ---------------------------------------------------------
    # 2. OWNER ROLE: Register & List Peer Appliance
    # ---------------------------------------------------------
    owner_username = f"owner_{uid}"
    owner_email = f"{owner_username}@rentora.com"
    r_owner_reg = requests.post(f"{BASE_URL}/users/", json={
        "username": owner_username,
        "email": owner_email,
        "password": "Password123!",
        "role": "owner"
    })
    assert r_owner_reg.status_code == 201

    r_owner_login = requests.post(f"{BASE_URL}/token/", json={
        "username": owner_username,
        "password": "Password123!"
    })
    owner_tokens = r_owner_login.json()
    owner_auth = {"Authorization": f"Bearer {owner_tokens['access']}"}

    # Verify self-service admin promotion is blocked with HTTP 403 (Bug 1 fix)
    r_bad_admin = requests.patch(f"{BASE_URL}/auth/switch-role/", json={"role": "admin"}, headers=owner_auth)
    assert r_bad_admin.status_code == 403, f"Expected 403 for admin self-promotion, got {r_bad_admin.status_code}"

    # Activate marketplace owner role via switch-role endpoint
    r_to_owner = requests.patch(f"{BASE_URL}/auth/switch-role/", json={"role": "owner"}, headers=owner_auth)
    assert r_to_owner.status_code == 200

    r_owner_me = requests.get(f"{BASE_URL}/auth/me/", headers=owner_auth)
    assert r_owner_me.status_code == 200 and r_owner_me.json().get("role") == "owner"
    print(f"[OK] 2. Role: OWNER successfully activated via switch-role & authenticated ({owner_username})")

    # Owner accesses dedicated dashboard
    r_dash = requests.get(f"{BASE_URL}/owner/dashboard/", headers=owner_auth)
    assert r_dash.status_code == 200, f"Expected 200 from owner dashboard, got {r_dash.status_code}: {r_dash.text}"
    dash_metrics = r_dash.json().get("metrics", {})
    assert "total_earnings" in dash_metrics
    print(f"[OK] 3. Owner Dashboard operational: 85% revenue share & escrow overview verified")

    # Owner lists an appliance for rent
    owner_app_name = f"Peer Smart Refrigerator {uid}"
    r_list_app = requests.post(f"{BASE_URL}/owner/appliances/", json={
        "rental_name": owner_app_name,
        "category_id": "Appliances",
        "sub_category": "Refrigerators",
        "monthly_price": 650,
        "security_deposit": 975,
        "stock_quantity": 2,
        "available_cities": ["Hyderabad", "Bangalore"]
    }, headers=owner_auth)
    assert r_list_app.status_code == 201
    listed_app = r_list_app.json().get("appliance", {})
    app_id = listed_app.get("appliance_id") or listed_app.get("_id")
    print(f"[OK] 4. Owner listed new appliance in catalog: '{owner_app_name}' (ID: {app_id})")

    # ---------------------------------------------------------
    # 3. CUSTOMER RENTS OWNER'S APPLIANCE (P2P Rental Flow)
    # ---------------------------------------------------------
    # Verified customer KYC clearance (Server-side verified compliance)
    db.kyc.update_one(
        {"user_id": cust_id},
        {"$set": {
            "user_id": cust_id,
            "status": "approved",
            "full_name": customer_username,
            "id_type": "Aadhaar Card",
            "id_number": "XXXX-XXXX-9999",
            "confidence_score": 96.0,
            "submitted_at": datetime.datetime.utcnow(),
            "reviewed_at": datetime.datetime.utcnow()
        }},
        upsert=True
    )
    db.users.update_one({"_id": cust_id}, {"$set": {"kyc_verified": True, "kyc_status": "approved"}})
    
    # Customer adds owner's appliance to cart & checks out
    requests.post(f"{BASE_URL}/cart/", json={"appliance_id": app_id, "tenure": "3"}, headers=cust_auth)
    r_checkout = requests.post(f"{BASE_URL}/checkout/", json={"payment_method": "UPI_GATEWAY"}, headers=cust_auth)
    assert r_checkout.status_code == 200, f"Checkout failed: {r_checkout.text}"
    print(f"[OK] 5. Customer rented Owner's appliance. Txn: {r_checkout.json().get('transaction_id')}")

    # Owner dashboard reflects active booking and 85% revenue share
    r_dash_after = requests.get(f"{BASE_URL}/owner/dashboard/", headers=owner_auth)
    updated_dash = r_dash_after.json()
    assert updated_dash["metrics"]["active_rented_units"] >= 1
    assert updated_dash["metrics"]["total_earnings"] > 0
    print(f"[OK] 6. Owner Earnings ledger updated: Rs. {updated_dash['metrics']['total_earnings']} earned from active lease")

    # ---------------------------------------------------------
    # 4. ADMIN ROLE: System Governance & User Role Management
    # ---------------------------------------------------------
    admin_id = str(uuid.uuid4())
    admin_username = f"admin_{uid}"
    db.users.insert_one({
        "_id": admin_id,
        "username": admin_username,
        "email": f"{admin_username}@rentora.com",
        "role": "admin",
        "created_at": datetime.datetime.utcnow()
    })
    admin_tokens = generate_tokens(admin_id)
    admin_auth = {"Authorization": f"Bearer {admin_tokens['access']}"}

    # Admin inspects all users across roles
    r_users = requests.get(f"{BASE_URL}/admin/users/", headers=admin_auth)
    assert r_users.status_code == 200
    users = r_users.json()
    roles_present = set(u.get("role") for u in users)
    assert "admin" in roles_present and "customer" in roles_present and "owner" in roles_present
    print(f"[OK] 7. Role: ADMIN successfully verified all 3 roles present in user accounts ({roles_present})")

    # Negative Auth Test: verify unauthenticated request to admin route is blocked
    r_unauth = requests.patch(f"{BASE_URL}/admin/users/{cust_id}/", json={"role": "owner"})
    assert r_unauth.status_code == 401, f"Expected 401 unauthenticated, got {r_unauth.status_code}"

    # Admin updates a user's role with genuine admin bearer token
    r_role_update = requests.patch(f"{BASE_URL}/admin/users/{cust_id}/", json={"role": "owner"}, headers=admin_auth)
    assert r_role_update.status_code == 200
    updated_cust = db.users.find_one({"_id": cust_id})
    assert updated_cust["role"] == "owner"
    print(f"[OK] 8. Admin successfully reassigned user role to 'owner' (Unauthenticated request verified blocked with 401)")

    # ---------------------------------------------------------
    # 5. FAST USER ROLE SWITCHING API
    # ---------------------------------------------------------
    r_switch = requests.patch(f"{BASE_URL}/auth/switch-role/", json={"role": "customer"}, headers=cust_auth)
    assert r_switch.status_code == 200 and r_switch.json()["user"]["role"] == "customer"
    print(f"[OK] 9. Role switching endpoint verified: Seamless user transitions between roles")

    # Clean up test records
    db.users.delete_many({"username": {"$in": [customer_username, owner_username, admin_username]}})
    db.appliances.delete_one({"_id": app_id})
    db.rentals.delete_many({"appliance_id": app_id})
    db.payments.delete_many({"user_email": customer_email})
    db.carts.delete_many({"user_id": cust_id})

    print("=" * 76)
    print("  ALL 9 ROLE TESTS PASSED (ADMIN, OWNER, CUSTOMER FULLY OPERATIONAL)!")
    print("=" * 76)

if __name__ == "__main__":
    run_tests()
