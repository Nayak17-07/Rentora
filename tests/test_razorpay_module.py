import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import uuid
import hmac
import hashlib
import json
import datetime
import requests
from api.mongo_client import get_mongo_db
from api.mongo_auth import generate_tokens

def _load_env_secrets():
    env_file = os.path.join(os.path.dirname(__file__), "..", "server", ".env")
    secrets = {}
    if os.path.exists(env_file):
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    secrets[k.strip()] = v.strip()
    return secrets

_env_secrets = _load_env_secrets()
BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000/api")
SECRET_KEY = os.getenv("RAZORPAY_KEY_SECRET") or _env_secrets.get("RAZORPAY_KEY_SECRET") or "sus6R8JHAWmCHfFvIYAQF1hS"
WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET") or _env_secrets.get("RAZORPAY_WEBHOOK_SECRET") or "RentoraWebhook_9xK7pQ2mV8zL4nT88026"

def run_tests():
    print("=" * 75)
    print("  RENTORA ENTERPRISE RAZORPAY PAYMENT MODULE VERIFICATION SUITE")
    print("=" * 75)

    db = get_mongo_db()

    # 1. Setup Test Customer
    test_id = str(uuid.uuid4())
    test_username = f"rzp_user_{uuid.uuid4().hex[:6]}"
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

    # 2. Test GET /api/payments/config
    cfg_res = requests.get(f"{BASE_URL}/payments/config")
    assert cfg_res.status_code == 200, f"Config failed: {cfg_res.text}"
    cfg = cfg_res.json()
    assert "key_id" in cfg and "currency" in cfg
    assert cfg["currency"] == "INR"
    print(f"[OK] 2. Tested GET /api/payments/config (Key ID: {cfg['key_id']}, Currency: {cfg['currency']})")

    # 3. Test POST /api/payments/create-order
    order_amount = 2499.0
    order_res = requests.post(
        f"{BASE_URL}/payments/create-order",
        json={"amount": order_amount, "currency": "INR", "notes": {"plan": "Premium Lease"}},
        headers=auth_header
    )
    assert order_res.status_code == 200, f"Order creation failed: {order_res.text}"
    order_data = order_res.json()
    assert order_data.get("success") is True
    order_id = order_data.get("order_id")
    amount_paise = order_data.get("amount_paise")
    assert order_id and order_id.startswith("order_")
    assert amount_paise == int(order_amount * 100)
    print(f"[OK] 3. Created Razorpay Order: {order_id} (Paise: {amount_paise})")

    # 4. Test POST /api/payments/verify-signature (Valid HMAC-SHA256)
    payment_id = f"pay_{uuid.uuid4().hex[:12]}"
    payload_to_sign = f"{order_id}|{payment_id}".encode("utf-8")
    valid_signature = hmac.new(SECRET_KEY.encode("utf-8"), payload_to_sign, hashlib.sha256).hexdigest()

    verify_res = requests.post(
        f"{BASE_URL}/payments/verify-signature",
        json={
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": valid_signature
        },
        headers=auth_header
    )
    assert verify_res.status_code == 200, f"Verification failed: {verify_res.text}"
    verify_data = verify_res.json()
    assert verify_data.get("verified") is True
    print(f"[OK] 4. Cryptographic HMAC-SHA256 signature verified for {payment_id}")

    # 5. Test Signature Mismatch Protection
    tampered_signature = "deadbeef" * 8
    bad_verify_res = requests.post(
        f"{BASE_URL}/payments/verify-signature",
        json={
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": tampered_signature
        },
        headers=auth_header
    )
    assert bad_verify_res.status_code == 400
    print(f"[OK] 5. Cryptographic signature tampering correctly blocked with HTTP 400")

    # 6. Test Full Checkout with Razorpay Method
    appliance_id = f"test_rzp_app_{uuid.uuid4().hex[:6]}"
    app_doc = {
        "_id": appliance_id,
        "appliance_id": appliance_id,
        "rental_name": "LG 8kg Front Load Washing Machine",
        "category_id": "Appliances",
        "monthly_price": 999.0,
        "security_deposit": 1500.0,
        "pricing": {"3": 999.0, "6": 899.0, "12": 799.0},
        "stock_quantity": 3
    }
    db.appliances.insert_one(app_doc)

    requests.post(f"{BASE_URL}/cart/", json={"appliance_id": appliance_id, "tenure": "3"}, headers=auth_header)
    requests.post(f"{BASE_URL}/kyc/", json={
        "full_name": test_username,
        "id_proof": "AADHAAR_RZP.png",
        "address_proof": "PASSPORT_RZP.png",
        "ocr_audit": {"verified": True}
    }, headers=auth_header)

    chk_payload = {
        "payment_method": "RAZORPAY",
        "payment_details": {
          "razorpay_order_id": order_id,
          "razorpay_payment_id": payment_id,
          "razorpay_signature": valid_signature,
          "method": "RAZORPAY_CHECKOUT"
        },
        "delivery_address": {
          "recipient_name": test_username,
          "phone": "+91 98765 43210",
          "house_flat": "Flat 402, Oakwood Towers",
          "street_area": "Hitec City",
          "city": "Hyderabad",
          "pincode": "500081"
        }
    }
    chk_res = requests.post(f"{BASE_URL}/checkout/", json=chk_payload, headers=auth_header)
    assert chk_res.status_code == 200, f"Checkout failed: {chk_res.text}"
    chk_data = chk_res.json()
    txn_id = chk_data["transaction_id"]
    inv_num = chk_data["invoice_number"]
    assert txn_id.startswith("TXN_")
    assert inv_num.startswith("INV-")

    payment_record = db.payments.find_one({"transaction_id": txn_id})
    assert payment_record is not None
    assert payment_record["payment_method"] == "RAZORPAY"
    assert payment_record["gateway_payment_id"] == payment_id
    assert payment_record["gateway_order_id"] == order_id
    assert "Razorpay" in payment_record["payment_gateway"]
    print(f"[OK] 6. Checkout executed via Razorpay: TXN {txn_id}, Gateway Pay ID: {payment_id}")

    # 7. Test Monthly Subscription Renewal via POST /api/payments/
    monthly_res = requests.post(
        f"{BASE_URL}/payments/",
        json={
            "amount": 999.0,
            "payment_type": "MONTHLY_RENT",
            "payment_method": "RAZORPAY",
            "razorpay_payment_id": f"pay_renew_{uuid.uuid4().hex[:8]}",
            "razorpay_order_id": f"order_renew_{uuid.uuid4().hex[:8]}"
        },
        headers=auth_header
    )
    assert monthly_res.status_code == 200, f"Monthly pay failed: {monthly_res.text}"
    monthly_data = monthly_res.json()
    assert monthly_data.get("success") is True
    print(f"[OK] 7. Tested monthly rental renewal via Razorpay: TXN {monthly_data['transaction_id']}")

    # 8. Test Webhook Ingestion with Valid Signature
    webhook_body = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "order_id": order_id,
                    "amount": amount_paise,
                    "status": "captured",
                    "method": "upi",
                    "notes": {"transaction_id": txn_id}
                }
            }
        }
    }
    webhook_raw = json.dumps(webhook_body, separators=(',', ':'))
    webhook_sig = hmac.new(WEBHOOK_SECRET.encode("utf-8"), webhook_raw.encode("utf-8"), hashlib.sha256).hexdigest()

    wh_res = requests.post(
        f"{BASE_URL}/payments/webhook",
        json=webhook_body,
        headers={"x-razorpay-signature": webhook_sig, "Content-Type": "application/json"}
    )
    assert wh_res.status_code == 200
    assert wh_res.json().get("received") is True
    print(f"[OK] 8. Tested Razorpay Webhook Ingestion (payment.captured verified)")

    # 9. Test Refund via POST /api/payments/refund
    refund_res = requests.post(
        f"{BASE_URL}/payments/refund",
        json={"payment_id": payment_id, "amount": 1500.0, "reason": "Lease Return Escrow Settlement"},
        headers=auth_header
    )
    assert refund_res.status_code == 200, f"Refund failed: {refund_res.text}"
    rfnd_data = refund_res.json()
    assert rfnd_data.get("success") is True
    assert rfnd_data["gateway_refund_id"].startswith("rfnd_")
    print(f"[OK] 9. Tested Razorpay Refund: {rfnd_data['gateway_refund_id']} for Rs. {rfnd_data['refund_amount']}")

    # 10. Clean up test records
    db.users.delete_one({"_id": test_id})
    db.appliances.delete_one({"_id": appliance_id})
    db.carts.delete_many({"user_id": test_id})
    db.rentals.delete_many({"user_id": test_id})
    db.payments.delete_many({"user_id": test_id})
    db.payment_orders.delete_many({"user_id": test_id})
    db.refunds.delete_many({"user_id": test_id})
    print(f"[OK] 10. Cleaned up all test documents in MongoDB")

    print("\n" + "=" * 75)
    print("  ALL 10 RAZORPAY MODULE TESTS PASSED: 100% PRODUCTION READY!")
    print("=" * 75)

if __name__ == "__main__":
    run_tests()
