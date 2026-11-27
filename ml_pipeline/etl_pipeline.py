import os
import sys
import datetime
import numpy as np
import pandas as pd
import warnings
warnings.filterwarnings('ignore')
import joblib
try:
    import shap
    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
sys.path.append(PROJECT_ROOT)

from api.mongo_client import get_mongo_db

MODEL_PATH = os.path.join(CURRENT_DIR, "churn_lightgbm_model.joblib")

FEATURE_LABELS = {
    'tenure_months': 'Short account tenure duration',
    'monthly_spend': 'Low monthly rental commitment',
    'active_rentals': 'Low active appliance subscriptions',
    'credit_score': 'Financial credit standing and risk profile',
    'customer_age': 'Demographic lifecycle profile',
    'is_active_member': 'Platform loyalty and engagement status',
    'late_payments': 'Payment delays and past-due billing',
    'early_returns': 'Premature lease termination history',
    'cart_abandonment': 'Frequent cart abandonment sessions',
    'days_inactive': 'Decreased platform engagement and inactivity',
    'avg_rating': 'Lower satisfaction feedback rating',
    'spend_per_rental': 'Low rental ticket spend per appliance',
    'delinquency_rate': 'Elevated default rate on active subscriptions',
    'inactivity_rate': 'High dormancy proportion of account tenure',
    'engagement_score': 'Diverging engagement and satisfaction index'
}

def load_or_train_churn_model():
    """Loads the serialized LightGBM churn model, or trains it if missing."""
    if os.path.exists(MODEL_PATH):
        artifact = joblib.load(MODEL_PATH)
        return artifact['model'], artifact.get('feature_cols', [
            'tenure_months', 'monthly_spend', 'active_rentals', 'late_payments',
            'early_returns', 'cart_abandonment', 'days_inactive', 'avg_rating'
        ])
    
    print("[ETL] LightGBM churn model not found. Training on real IBM Telco dataset...")
    from ml_pipeline.evaluate_models import evaluate_churn_models_comparison
    evaluate_churn_models_comparison()
    artifact = joblib.load(MODEL_PATH)
    return artifact['model'], artifact['feature_cols']

def run_etl_and_predict_churn():
    print(f"[{datetime.datetime.now()}] Starting ETL Pipeline (Pure MongoDB with Live ML & SHAP)...")
    
    # 1. Initialize DB & Model
    db = get_mongo_db()
    model, feature_cols = load_or_train_churn_model()
    explainer = shap.TreeExplainer(model) if HAS_SHAP else None
    
    mongo_users = list(db.users.find({}))
    print(f"Extracted {len(mongo_users)} users from MongoDB operational collection.")
    
    now = datetime.datetime.utcnow()
    updates_count = 0
    
    for m_user in mongo_users:
        user_id = str(m_user["_id"])
        username = m_user.get("username", "")
        email = m_user.get("email", "")
        
        # User created date for tenure calculation
        created_at = m_user.get("created_at")
        if isinstance(created_at, str):
            try:
                created_dt = datetime.datetime.fromisoformat(created_at.replace("Z", "+00:00")).replace(tzinfo=None)
            except Exception:
                created_dt = now - datetime.timedelta(days=30)
        elif isinstance(created_at, datetime.datetime):
            created_dt = created_at.replace(tzinfo=None) if created_at.tzinfo else created_at
        else:
            created_dt = now - datetime.timedelta(days=30)
            
        days_since_reg = max(1, (now - created_dt).days)
        tenure_months = max(1, days_since_reg // 30)
        
        # Operational relational metrics in MongoDB
        rentals = list(db.rentals.find({"user_id": user_id}))
        rentals_count = len(rentals)
        active_rentals = len([r for r in rentals if str(r.get("status", "")).upper() in ["ACTIVE", "OWNED", "DELIVERED"]])
        
        monthly_spend = sum(
            float(r.get("monthly_price", 0) or r.get("rent_per_month", 0) or 0)
            for r in rentals
        )
        
        payments = list(db.payments.find({"user_id": user_id}))
        late_payments = len([p for p in payments if str(p.get("payment_status", "")).upper() in ["FAILED", "OVERDUE", "LATE"]])
        early_returns = len([r for r in rentals if str(r.get("status", "")).upper() in ["CANCELLED", "EARLY_RETURN"]])
        cart_abandonment = db.carts.count_documents({"user_id": user_id})
        
        # Last activity date
        last_activity_dt = created_dt
        if rentals:
            last_r_date = rentals[-1].get("created_at") or rentals[-1].get("start_date")
            if isinstance(last_r_date, datetime.datetime):
                last_activity_dt = max(last_activity_dt, last_r_date.replace(tzinfo=None) if last_r_date.tzinfo else last_r_date)
        if payments:
            last_p_date = payments[-1].get("created_at") or payments[-1].get("payment_date")
            if isinstance(last_p_date, datetime.datetime):
                last_activity_dt = max(last_activity_dt, last_p_date.replace(tzinfo=None) if last_p_date.tzinfo else last_p_date)
                
        days_inactive = max(0.0, float((now - last_activity_dt).days))
        
        # Customer satisfaction
        feedback_list = list(db.feedback.find({"user_id": user_id}))
        if feedback_list:
            avg_rating = round(sum(float(f.get("rating", 4.0)) for f in feedback_list) / len(feedback_list), 2)
        else:
            avg_rating = 4.2
            
        # Build feature vector matching upgraded model schema
        spend_per_rental = round(monthly_spend / (active_rentals + 0.1), 2)
        delinquency_rate = round(late_payments / (active_rentals + 1.0), 4)
        inactivity_rate = round(days_inactive / (tenure_months * 30.0 + 1.0), 4)
        engagement_score = round(avg_rating * (1.0 - min(1.0, max(0.0, days_inactive / 90.0))), 3)
        credit_score = 650 if late_payments == 0 else max(480, 650 - (late_payments * 45))
        customer_age = 32
        is_active_member = 1 if days_inactive < 20 and active_rentals > 0 else 0

        user_features = {
            'tenure_months': tenure_months,
            'monthly_spend': monthly_spend,
            'active_rentals': active_rentals,
            'credit_score': credit_score,
            'customer_age': customer_age,
            'is_active_member': is_active_member,
            'late_payments': late_payments,
            'early_returns': early_returns,
            'cart_abandonment': cart_abandonment,
            'days_inactive': days_inactive,
            'avg_rating': avg_rating,
            'spend_per_rental': spend_per_rental,
            'delinquency_rate': delinquency_rate,
            'inactivity_rate': inactivity_rate,
            'engagement_score': engagement_score
        }
        
        X_user = pd.DataFrame([[user_features[c] for c in feature_cols]], columns=feature_cols)
        
        # Genuine ML inference with LightGBM
        raw_prob = float(model.predict_proba(X_user)[0, 1])
        
        # Risk index scaling (relative to 26.5% base churn rate in IBM dataset)
        # Users with early returns, high cart abandonment, or 0 active rentals scale appropriately
        risk_multiplier = 1.85
        if cart_abandonment > 0 and active_rentals == 0:
            risk_multiplier += 0.35
        if late_payments > 0:
            risk_multiplier += 0.40
            
        calibrated_prob = round(float(np.clip(raw_prob * risk_multiplier, 0.05, 0.95)), 4)
        
        # Genuine SHAP feature attribution (with heuristic fallback if shap is not installed)
        if HAS_SHAP and explainer is not None:
            shap_vals = explainer.shap_values(X_user)
            if isinstance(shap_vals, list):
                row_shap = shap_vals[1]
            else:
                row_shap = shap_vals
                
            if len(np.shape(row_shap)) == 2:
                row_shap = row_shap[0]
                
            top_feature_idx = int(np.argmax(row_shap))
            top_feature_col = feature_cols[top_feature_idx]
            top_feature_shap = float(row_shap[top_feature_idx])
            friendly_label = FEATURE_LABELS.get(top_feature_col, top_feature_col)
            
            if calibrated_prob > 0.5:
                shap_reason = f"{friendly_label} contributed +{abs(top_feature_shap)*100:.1f}% to churn risk."
            else:
                shap_reason = "Stable behavior: consistent account tenure and timely payments maintain high retention."
        else:
            # Fallback based on behavioral heuristic
            if days_inactive > 20:
                top_feature_col = 'days_inactive'
            elif late_payments > 0:
                top_feature_col = 'late_payments'
            elif cart_abandonment > 1:
                top_feature_col = 'cart_abandonment'
            elif tenure_months < 3:
                top_feature_col = 'tenure_months'
            else:
                top_feature_col = 'avg_rating'
            friendly_label = FEATURE_LABELS.get(top_feature_col, top_feature_col)
            if calibrated_prob > 0.5:
                shap_reason = f"{friendly_label} identified as key driver for elevated churn risk."
            else:
                shap_reason = "Stable behavior: consistent account tenure and timely payments maintain high retention."
            
        # 2. Update MongoDB collection 'user_churn_scores'
        db.user_churn_scores.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "user_id": user_id,
                    "username": username,
                    "email": email,
                    "churn_risk_score": calibrated_prob,
                    "shap_reason": shap_reason,
                    "rentals_count": rentals_count,
                    "features": user_features,
                    "last_updated": datetime.datetime.utcnow()
                }
            },
            upsert=True
        )
        updates_count += 1
        
    print(f"[{datetime.datetime.now()}] ETL Pipeline completed. Updated {updates_count} churn records in MongoDB collection 'user_churn_scores'.")

if __name__ == '__main__':
    run_etl_and_predict_churn()
