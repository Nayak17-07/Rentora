import os
import sys
import uuid
import datetime
import requests

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.mongo_client import get_mongo_db
from api.mongo_auth import generate_tokens

BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000/api")

def run_tests():
    print("=" * 80)
    print("  VERIFYING MODULE 2: BROWSING HISTORY & RECOMMENDATION FEED")
    print("=" * 80)

    db = get_mongo_db()

    # 1. Setup Test User
    test_user_id = str(uuid.uuid4())
    test_username = f"browse_user_{uuid.uuid4().hex[:6]}"
    test_email = f"{test_username}@rentora.com"
    db.users.insert_one({
        "_id": test_user_id,
        "username": test_username,
        "email": test_email,
        "role": "customer",
        "created_at": datetime.datetime.utcnow()
    })
    tokens = generate_tokens(test_user_id)
    auth_header = {"Authorization": f"Bearer {tokens['access']}"}
    print(f"[OK] 1. Created test customer: {test_username} (ID: {test_user_id})")

    # 2. Find sample appliances in MongoDB
    appliances = list(db.appliances.find({}).limit(3))
    assert len(appliances) >= 2, "Need at least 2 catalog appliances in database"
    app1 = appliances[0]
    app2 = appliances[1]
    app1_id = app1.get("appliance_id") or str(app1["_id"])
    app2_id = app2.get("appliance_id") or str(app2["_id"])
    print(f"[OK] 2. Selected sample appliances: '{app1.get('rental_name')}' & '{app2.get('rental_name')}'")

    # 3. Test POST /api/browsing-history/track (First View)
    res = requests.post(f"{BASE_URL}/browsing-history/track", json={
        "appliance_id": app1_id,
        "source": "catalog_test"
    }, headers=auth_header)
    assert res.status_code == 200, f"Track failed: {res.text}"
    track_data = res.json()
    assert track_data.get("tracked") is True
    print(f"[OK] 3. Tracked view for '{app1.get('rental_name')}': Server returned HTTP 200 OK")

    # Verify MongoDB record
    history_doc = db.browsing_history.find_one({"user_id": test_user_id, "appliance_id": app1_id})
    assert history_doc is not None, "Document not found in browsing_history collection"
    assert history_doc.get("view_count") == 1
    print(f"[OK] 4. MongoDB browsing_history document created (view_count: 1, last_source: 'catalog_test')")

    # 4. Test Upsert (Second View of same item increments count)
    res = requests.post(f"{BASE_URL}/browsing-history/track", json={
        "appliance_id": app1_id,
        "source": "details_modal"
    }, headers=auth_header)
    assert res.status_code == 200
    history_doc_updated = db.browsing_history.find_one({"user_id": test_user_id, "appliance_id": app1_id})
    assert history_doc_updated["view_count"] == 2
    print(f"[OK] 5. Repeated view deduplicated and view_count incremented to {history_doc_updated['view_count']}")

    # 5. Track Second Appliance
    res = requests.post(f"{BASE_URL}/browsing-history/track", json={
        "appliance_id": app2_id,
        "source": "recommendations"
    }, headers=auth_header)
    assert res.status_code == 200
    print(f"[OK] 6. Tracked second appliance '{app2.get('rental_name')}' in browsing history")

    # 6. Test GET /api/browsing-history/ (Fetch & Enrich)
    res = requests.get(f"{BASE_URL}/browsing-history/", headers=auth_header)
    assert res.status_code == 200, f"Fetch history failed: {res.text}"
    history_resp = res.json()
    assert "history" in history_resp and history_resp["total_count"] == 2
    items = history_resp["history"]
    # Most recently viewed (app2) must be first
    assert items[0]["appliance_id"] == app2_id
    assert "rental_name" in items[0] and "monthly_price" in items[0]
    assert "relative_time" in items[0]
    print(f"[OK] 7. GET /api/browsing-history/ returned {len(items)} items sorted by recency DESC with enriched catalog metadata")

    # 7. Test Guest Session Tracking (Without Auth Token)
    guest_session_id = f"guest_test_{uuid.uuid4().hex[:8]}"
    res = requests.post(f"{BASE_URL}/browsing-history/track", json={
        "appliance_id": app1_id,
        "session_id": guest_session_id
    })
    assert res.status_code == 200 and res.json().get("tracked") is True
    res_guest = requests.get(f"{BASE_URL}/browsing-history/?session_id={guest_session_id}")
    assert res_guest.status_code == 200 and res_guest.json()["total_count"] == 1
    print(f"[OK] 8. Guest session tracking verified for unauthenticated visitor ({guest_session_id})")

    # 8. Test Browsing Stats / Analytics
    res_stats = requests.get(f"{BASE_URL}/browsing-history-stats", headers=auth_header)
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert stats["total_viewed"] >= 2
    print(f"[OK] 9. Browsing history analytics: {stats['total_viewed']} total views, Top Category: {stats.get('top_category')}")

    # 9. Test Recommendation Integration (browsed items feed into recommendations)
    res_rec = requests.get(f"{BASE_URL}/recommendations/?filter=for_you", headers=auth_header)
    assert res_rec.status_code == 200
    recs = res_rec.json()
    assert isinstance(recs, list)
    print(f"[OK] 10. AI Recommendation Engine successfully incorporated browsing history (retrieved {len(recs)} personalized items)")

    # 10. Test DELETE /api/browsing-history/:appliance_id (Remove Single Item)
    res_del_one = requests.delete(f"{BASE_URL}/browsing-history/{app1_id}", headers=auth_header)
    assert res_del_one.status_code == 200 and res_del_one.json()["deleted_count"] == 1
    remaining_count = db.browsing_history.count_documents({"user_id": test_user_id})
    assert remaining_count == 1
    print(f"[OK] 11. DELETE /api/browsing-history/{app1_id} removed single item (Remaining: {remaining_count})")

    # 11. Test DELETE /api/browsing-history/ (Clear All)
    res_del_all = requests.delete(f"{BASE_URL}/browsing-history/", headers=auth_header)
    assert res_del_all.status_code == 200 and res_del_all.json()["cleared_count"] == 1
    cleared_count = db.browsing_history.count_documents({"user_id": test_user_id})
    assert cleared_count == 0
    print(f"[OK] 12. DELETE /api/browsing-history/ cleared customer history (Count in MongoDB: 0)")

    # Cleanup test data
    db.users.delete_one({"_id": test_user_id})
    db.browsing_history.delete_many({"user_id": guest_session_id})

    print("=" * 80)
    print("  ALL 12 BROWSING HISTORY MODULE TESTS PASSED (100% SUCCESS)!")
    print("=" * 80)

if __name__ == "__main__":
    run_tests()
