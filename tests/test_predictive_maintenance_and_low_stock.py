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
    print("  VERIFYING MODULE 13 & 14: PREDICTIVE MAINTENANCE & LOW-STOCK PREDICTOR (ML)")
    print("=" * 80)

    db = get_mongo_db()

    # Create authorized Admin user for inventory and operations endpoints
    admin_id = str(uuid.uuid4())
    admin_uname = f"admin_ml_{uuid.uuid4().hex[:6]}"
    db.users.insert_one({
        "_id": admin_id,
        "username": admin_uname,
        "email": f"{admin_uname}@rentora.com",
        "role": "admin",
        "created_at": datetime.datetime.now(datetime.timezone.utc)
    })
    tokens = generate_tokens(admin_id)
    admin_header = {"Authorization": f"Bearer {tokens['access']}"}
    print(f"[AUTH] Created test administrator: {admin_uname} (ID: {admin_id})")

    try:
        # ---------------------------------------------------------
        # PART 1: MODULE 13 - PREDICTIVE MAINTENANCE (ML RANDOM FOREST)
        # ---------------------------------------------------------
        print("\n--- [PART 1] MODULE 13: PREDICTIVE MAINTENANCE (ML & IoT SENSORS) ---")

        # 1. Verify model artifact exists
        model_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml_pipeline", "maintenance_rf_model.joblib")
        assert os.path.exists(model_path), f"Random Forest model artifact missing at {model_path}"
        model_size_kb = os.path.getsize(model_path) / 1024
        print(f"[OK] 1. ML Model Artifact verified: 'maintenance_rf_model.joblib' ({model_size_kb:.1f} KB)")

        # 2. Check GET /api/maintenance/fleet-health
        res = requests.get(f"{BASE_URL}/maintenance/fleet-health")
        assert res.status_code == 200, f"Fleet health endpoint failed: {res.status_code} - {res.text}"
        health_data = res.json()
        assert "total_devices" in health_data
        assert "average_health_score" in health_data
        assert health_data["total_devices"] >= 80, f"Expected >= 80 devices, got {health_data['total_devices']}"
        assert 50 <= health_data["average_health_score"] <= 100, f"Health score out of range: {health_data['average_health_score']}"
        print(f"[OK] 2. GET /api/maintenance/fleet-health: Tracked {health_data['total_devices']} units, Avg Health: {health_data['average_health_score']}%")

        # 3. Check GET /api/maintenance/telemetry
        res_tele = requests.get(f"{BASE_URL}/maintenance/telemetry?limit=10")
        assert res_tele.status_code == 200, f"Telemetry endpoint failed: {res_tele.status_code}"
        tele_data = res_tele.json()
        assert "telemetry" in tele_data
        assert len(tele_data["telemetry"]) > 0
        sample_device = tele_data["telemetry"][0]
        assert "motor_temp_c" in sample_device
        assert "vibration_amplitude_mms" in sample_device
        assert "failure_risk_score" in sample_device
        assert "health_score" in sample_device
        assert "remaining_useful_life_days" in sample_device
        print(f"[OK] 3. GET /api/maintenance/telemetry: Device {sample_device.get('device_id')} - Temp: {sample_device.get('motor_temp_c')}°C, Vib: {sample_device.get('vibration_amplitude_mms')} mm/s, Failure Risk: {sample_device.get('failure_risk_score') * 100:.1f}%")

        # 4. Check GET /api/maintenance/alerts
        res_alerts = requests.get(f"{BASE_URL}/maintenance/alerts")
        assert res_alerts.status_code == 200, f"Alerts endpoint failed: {res_alerts.status_code}"
        alerts_data = res_alerts.json()
        assert "alerts" in alerts_data
        alerts = alerts_data["alerts"]
        print(f"[OK] 4. GET /api/maintenance/alerts: Found {len(alerts)} telemetry alerts")

        # 5. Test POST /api/maintenance/dispatch-service/:alert_id
        if len(alerts) > 0:
            target_alert = alerts[0]
            alert_id = target_alert["alert_id"]
            res_dispatch = requests.post(
                f"{BASE_URL}/maintenance/dispatch-service/{alert_id}",
                json={"assigned_engineer": "Senior Field Specialist Rajesh Patil"},
                headers=admin_header
            )
            assert res_dispatch.status_code == 200, f"Dispatch failed: {res_dispatch.text}"
            dispatch_json = res_dispatch.json()
            assert dispatch_json.get("success") is True
            print(f"[OK] 5. POST /api/maintenance/dispatch-service/{alert_id}: Dispatched technician with admin authorization")
        else:
            print("[SKIP] 5. No open alerts to dispatch")

        # ---------------------------------------------------------
        # PART 2: MODULE 14 - LOW-STOCK PREDICTOR (ML GRADIENT BOOSTING)
        # ---------------------------------------------------------
        print("\n--- [PART 2] MODULE 14: LOW-STOCK DEPLETION PREDICTOR (ML REGRESSION) ---")

        # 6. Verify low-stock regressor model artifact exists
        reg_model_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml_pipeline", "low_stock_predictor_model.joblib")
        assert os.path.exists(reg_model_path), f"Gradient Boosting regressor artifact missing at {reg_model_path}"
        reg_size_kb = os.path.getsize(reg_model_path) / 1024
        print(f"[OK] 6. ML Model Artifact verified: 'low_stock_predictor_model.joblib' ({reg_size_kb:.1f} KB)")

        # 7. Check GET /api/inventory/low-stock-predictions
        res_pred = requests.get(f"{BASE_URL}/inventory/low-stock-predictions?limit=30", headers=admin_header)
        assert res_pred.status_code == 200, f"Low-stock predictions endpoint failed: {res_pred.status_code} - {res_pred.text}"
        pred_data = res_pred.json()
        assert "predictions" in pred_data
        assert "summary" in pred_data
        assert "model_metadata" in pred_data
        predictions = pred_data["predictions"]
        assert len(predictions) > 0, "No predictions returned from low-stock endpoint"
        print(f"[OK] 7. GET /api/inventory/low-stock-predictions: Returned {len(predictions)} SKU forecasts (Total tracked: {pred_data.get('total_skus_tracked')})")

        # 8. Verify Model Metadata & Accuracy
        meta = pred_data["model_metadata"]
        assert meta["algorithm"] == "GradientBoostingRegressor (ML)"
        assert meta["mae_days"] <= 1.5, f"MAE expected <= 1.5 days, got {meta['mae_days']}"
        assert any(v in meta["r2_variance"] for v in ["98", "99"]), f"Expected R² >= 98%, got {meta['r2_variance']}"
        print(f"[OK] 8. ML Accuracy Metrics: MAE = {meta['mae_days']} days, R² Variance = {meta['r2_variance']} (Dataset: {meta.get('dataset_source', 'Kaggle')})")

        # 9. Verify fields on individual SKU prediction
        sample_sku = predictions[0]
        required_fields = [
            "appliance_id", "rental_name", "category_id", "current_stock",
            "weekly_rental_velocity", "reorder_lead_time_days",
            "predicted_days_to_stockout", "reorder_urgency", "recommended_reorder_units"
        ]
        for field in required_fields:
            assert field in sample_sku, f"Missing field '{field}' in prediction record: {sample_sku}"
        print(f"[OK] 9. SKU Forecast Schema verified: '{sample_sku['rental_name']}' - Stock: {sample_sku['current_stock']}, Velocity: {sample_sku['weekly_rental_velocity']}/wk, Days to Stockout: {sample_sku['predicted_days_to_stockout']:.1f} days, Urgency: {sample_sku['reorder_urgency']}")

        # 10. Verify Urgency Filtering: CRITICAL_REORDER_REQUIRED
        res_crit = requests.get(f"{BASE_URL}/inventory/low-stock-predictions?urgency=CRITICAL_REORDER_REQUIRED", headers=admin_header)
        assert res_crit.status_code == 200
        crit_data = res_crit.json()
        for item in crit_data["predictions"]:
            assert item["reorder_urgency"] == "CRITICAL_REORDER_REQUIRED"
        print(f"[OK] 10. Filter by Urgency (?urgency=CRITICAL_REORDER_REQUIRED): Filtered correctly ({len(crit_data['predictions'])} items)")

        # 11. Verify Urgency Filtering: STOCK_HEALTHY
        res_healthy = requests.get(f"{BASE_URL}/inventory/low-stock-predictions?urgency=STOCK_HEALTHY", headers=admin_header)
        assert res_healthy.status_code == 200
        healthy_data = res_healthy.json()
        for item in healthy_data["predictions"]:
            assert item["reorder_urgency"] == "STOCK_HEALTHY"
        print(f"[OK] 11. Filter by Urgency (?urgency=STOCK_HEALTHY): Filtered correctly ({len(healthy_data['predictions'])} items)")

        # 12. Verify Summary Statistics
        summary = pred_data["summary"]
        assert "critical_reorder_count" in summary
        assert "recommended_reorder_count" in summary
        assert "healthy_stock_count" in summary
        total_in_summary = summary["critical_reorder_count"] + summary["recommended_reorder_count"] + summary["healthy_stock_count"]
        assert total_in_summary == pred_data["total_skus_tracked"]
        print(f"[OK] 12. Summary Counters verified: Critical: {summary['critical_reorder_count']}, Recommended: {summary['recommended_reorder_count']}, Healthy: {summary['healthy_stock_count']} (Total: {total_in_summary})")

        print("\n" + "=" * 80)
        print("  ALL 12 TESTS PASSED! MODULE 13 & 14 FULLY VERIFIED!")
        print("=" * 80)

    finally:
        # Always clean up test admin
        db.users.delete_one({"_id": admin_id})

if __name__ == "__main__":
    run_tests()
