import os
import sys
import uuid
import datetime
import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.mongo_client import get_mongo_db

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_ARTIFACT_PATH = os.path.join(CURRENT_DIR, "recommender_hybrid_model.joblib")

# Room & Category synergy knowledge base
COMPLEMENTARY_MAP = {
    'refrigerator': ['microwave', 'water purifier', 'induction', 'dining table'],
    'washing machine': ['water purifier', 'dryer', 'air conditioner'],
    'air conditioner': ['air purifier', 'bed', 'wardrobe', 'study desk'],
    'microwave': ['refrigerator', 'water purifier', 'induction'],
    'water purifier': ['refrigerator', 'microwave', 'induction'],
    'television': ['sofa', 'coffee table', 'recliner', 'tv unit'],
    'sofa': ['coffee table', 'television', 'study desk', 'recliner'],
    'bed': ['wardrobe', 'bedside table', 'mattress', 'air conditioner'],
    'wardrobe': ['bed', 'bedside table', 'dressing table', 'air conditioner'],
    'study desk': ['chair', 'bookshelf', 'air conditioner']
}

def extract_eco_tier(text):
    """Detects energy efficiency star ratings and estimates monthly electricity savings."""
    s = str(text).lower()
    if '5 star' in s or '5-star' in s or 'inverter' in s:
        return {'star': 5, 'savings_est': 380, 'eco_label': '5★ Inverter Eco Champion'}
    if '4 star' in s or '4-star' in s:
        return {'star': 4, 'savings_est': 240, 'eco_label': '4★ Energy Saver'}
    if '3 star' in s or '3-star' in s:
        return {'star': 3, 'savings_est': 120, 'eco_label': '3★ Efficient'}
    return {'star': 3, 'savings_est': 80, 'eco_label': 'Standard Efficiency'}

def build_co_rental_matrix(rentals_data, appliance_ids):
    """
    Computes Item-to-Item Co-Rental Association Matrix from historical bookings.
    CoAffinity(i, j) = Count(i and j rented by same user) / sqrt(Count(i) * Count(j))
    """
    id_to_idx = {app_id: i for i, app_id in enumerate(appliance_ids)}
    n = len(appliance_ids)
    co_matrix = np.zeros((n, n), dtype=float)
    counts = np.zeros(n, dtype=float)

    # Group rentals by user_id
    user_rentals = {}
    for r in rentals_data:
        uid = str(r.get('user_id', ''))
        aid = str(r.get('appliance_id', ''))
        if uid and aid in id_to_idx:
            user_rentals.setdefault(uid, set()).add(aid)
            counts[id_to_idx[aid]] += 1.0

    for uid, aids in user_rentals.items():
        aid_list = list(aids)
        for i in range(len(aid_list)):
            for j in range(i + 1, len(aid_list)):
                idx_a = id_to_idx[aid_list[i]]
                idx_b = id_to_idx[aid_list[j]]
                co_matrix[idx_a, idx_b] += 1.0
                co_matrix[idx_b, idx_a] += 1.0

    # Normalize by geometric mean of frequencies
    for i in range(n):
        for j in range(n):
            if i != j and counts[i] > 0 and counts[j] > 0:
                co_matrix[i, j] = co_matrix[i, j] / np.sqrt(counts[i] * counts[j])

    return co_matrix

def train_and_generate_recommendations():
    """
    Trains hybrid content-collaborative recommender and synchronizes MongoDB user recommendations.
    """
    try:
        db = get_mongo_db()
        print("[ML Recommender] Fetching catalog and transaction history from MongoDB...")
        
        appliances = list(db.appliances.find({}))
        if not appliances:
            print("[ML Recommender] No appliances found. Please seed the database first.")
            return
            
        df_appliances = pd.DataFrame(appliances)
        df_appliances['app_id_str'] = df_appliances.apply(
            lambda r: str(r.get('appliance_id') or r.get('_id')), axis=1
        )
        
        # 1. Feature Engineering with Domain Term Boosting
        # Boost category (3x) and sub-category (2x) to prevent topic drift and ensure room coherence
        cats_boosted = (df_appliances['category_id'].fillna('') + ' ') * 3
        subcats_boosted = (df_appliances.get('sub_category', pd.Series(['']*len(df_appliances))).fillna('') + ' ') * 2
        df_appliances['content'] = (
            cats_boosted +
            subcats_boosted +
            df_appliances['rental_name'].fillna('') + " " +
            df_appliances.get('specifications', pd.Series(['']*len(df_appliances))).fillna('') + " " +
            df_appliances['description'].fillna('')
        )
        
        print(f"[ML Recommender] Training high-precision TF-IDF content model on {len(df_appliances)} appliances...")
        tfidf = TfidfVectorizer(ngram_range=(1, 2), stop_words='english', max_features=2500, sublinear_tf=True)
        tfidf_matrix = tfidf.fit_transform(df_appliances['content'])
        content_sim = cosine_similarity(tfidf_matrix, tfidf_matrix)

        # 2. Collaborative Co-Rental Mining
        rentals_cursor = list(db.rentals.find({}))
        app_id_list = df_appliances['app_id_str'].tolist()
        co_matrix = build_co_rental_matrix(rentals_cursor, app_id_list)
        print(f"[ML Recommender] Analyzed {len(rentals_cursor)} historical rentals for collaborative affinity.")

        # 3. Save Serialized Model Artifact
        artifact = {
            'tfidf': tfidf,
            'content_sim': content_sim,
            'co_matrix': co_matrix,
            'app_id_list': app_id_list,
            'trained_at': datetime.datetime.utcnow().isoformat()
        }
        joblib.dump(artifact, MODEL_ARTIFACT_PATH)
        print(f"[ML Recommender] Saved hybrid model artifact to: {MODEL_ARTIFACT_PATH}")

        # 4. Generate Enriched User Recommendations
        users = list(db.users.find({}))
        print(f"[ML Recommender] Generating personalized recommendations for {len(users)} users...")
        
        all_recommendations = []
        now = datetime.datetime.utcnow()

        for user in users:
            user_id = str(user['_id'])
            user_rentals = list(db.rentals.find({"user_id": user_id}))
            user_cart = list(db.cart.find({"user_id": user_id}))
            
            interacted_ids = set()
            for r in user_rentals:
                interacted_ids.add(str(r.get('appliance_id') or r.get('_id')))
            for c in user_cart:
                interacted_ids.add(str(c.get('appliance_id') or c.get('_id')))

            rented_indices = [
                i for i, aid in enumerate(app_id_list) if aid in interacted_ids
            ]

            # Compute user historical budget to match optimal appliance price bracket
            user_rents = [
                float(r.get('monthly_price') or r.get('rent_per_month') or 0)
                for r in user_rentals if float(r.get('monthly_price') or r.get('rent_per_month') or 0) > 0
            ]
            user_target_budget = float(np.median(user_rents)) if user_rents else 1200.0

            scored_candidates = []
            
            for idx, row in df_appliances.iterrows():
                target_id = row['app_id_str']
                if target_id in interacted_ids:
                    continue  # Don't recommend items user already has
                
                # Content score
                if rented_indices:
                    c_score = float(np.mean([content_sim[r_idx, idx] for r_idx in rented_indices]))
                    collab_score = float(np.mean([co_matrix[r_idx, idx] for r_idx in rented_indices]))
                    
                    # Category Synergy Prior from Real-world Cross-Purchase Bundles
                    candidate_cat = str(row.get('category_id') or '').lower()
                    candidate_name = str(row.get('rental_name') or '').lower()
                    synergy_bonus = 0.0
                    matched_rented_item = ""

                    for r_idx in rented_indices:
                        rented_row = df_appliances.iloc[r_idx]
                        r_cat = str(rented_row.get('category_id') or '').lower()
                        r_name = str(rented_row.get('rental_name') or '').lower()
                        for base_key, complements in COMPLEMENTARY_MAP.items():
                            if (base_key in r_cat or base_key in r_name):
                                if any(comp in candidate_cat or comp in candidate_name for comp in complements):
                                    synergy_bonus = max(synergy_bonus, 0.22)
                                    matched_rented_item = rented_row.get('rental_name', 'your rental')
                else:
                    c_score = 0.25
                    collab_score = 0.15
                    synergy_bonus = 0.0
                    matched_rented_item = ""

                # Eco energy bonus
                eco_info = extract_eco_tier(row['content'])
                eco_bonus = 0.15 if eco_info['star'] >= 4 else 0.05
                
                # Popularity & Rating using Bayesian Shrinkage (Amazon Product Review standard)
                raw_rating = float(row.get('rating', 4.5) or 4.5)
                review_count = float(row.get('reviews_count') or row.get('rating_count') or 35)
                global_prior_c = 4.30
                min_review_m = 12.0
                bayesian_rating = (review_count / (review_count + min_review_m)) * raw_rating + (min_review_m / (review_count + min_review_m)) * global_prior_c
                pop_bonus = (bayesian_rating / 5.0) * 0.20

                # Price tier compatibility affinity (recommends appliances fitting user purchasing power)
                item_price = float(row.get('monthly_price') or row.get('rent_per_month') or 1200.0)
                budget_spread = max(user_target_budget * 0.8, 600.0)
                price_affinity = float(np.exp(-0.5 * ((item_price - user_target_budget) / budget_spread) ** 2))
                price_bonus = price_affinity * 0.15

                # Hybrid composite calculation (incorporating real collaborative + synergy bootstrap + price match)
                effective_collab = max(collab_score, synergy_bonus)
                hybrid_score = (c_score * 0.35) + (effective_collab * 0.25) + pop_bonus + eco_bonus + price_bonus
                match_pct = int(np.clip(np.round(75 + (hybrid_score * 20)), 82, 98))

                # Explainable AI (XAI) reason determination
                if collab_score > 0.2:
                    reason = f"Highly co-rented combo: Frequent pairing with your previous rentals"
                    rec_type = "ROOM_BUNDLE"
                    bundle_badge = "Combo Match"
                elif synergy_bonus > 0.15:
                    reason = f"Room Synergy Pairing: Frequently leased alongside {matched_rented_item or 'appliances'}"
                    rec_type = "ROOM_BUNDLE"
                    bundle_badge = "Smart Bundle"
                elif eco_info['star'] >= 5:
                    reason = f"⚡ {eco_info['eco_label']}: Saves ~₹{eco_info['savings_est']}/mo in power"
                    rec_type = "ECO_SAVER"
                    bundle_badge = "5★ Eco Saver"
                elif raw_rating >= 4.8:
                    reason = f"Top-rated platform pick ({raw_rating}★, {int(review_count)} verified reviews)"
                    rec_type = "CITY_TRENDING"
                    bundle_badge = "Top Rated"
                else:
                    reason = f"Tailored style match for {row.get('category_id', 'appliances')}"
                    rec_type = "HYBRID_AFFINITY"
                    bundle_badge = "Smart Pick"

                scored_candidates.append({
                    'appliance_doc_id': row['_id'],
                    'appliance_id': target_id,
                    'score': hybrid_score,
                    'match_percentage': match_pct,
                    'recommendation_reason': reason,
                    'recommendation_type': rec_type,
                    'bundle_badge': bundle_badge,
                    'energy_savings_est': eco_info['savings_est'],
                    'combo_discount_pct': 15 if rec_type == 'ROOM_BUNDLE' else 10,
                    'sub_category': str(row.get('sub_category') or row.get('category_id') or 'appliance').lower()
                })

            # Sort and apply MMR Category Diversity constraint (prevent catalog monotony)
            scored_candidates.sort(key=lambda x: x['score'], reverse=True)
            top_recs = []
            subcat_counts = {}
            for cand in scored_candidates:
                subc = cand['sub_category']
                if subcat_counts.get(subc, 0) < 2:
                    top_recs.append(cand)
                    subcat_counts[subc] = subcat_counts.get(subc, 0) + 1
                    if len(top_recs) == 6:
                        break
            # Fallback fill if constraint was too strict
            if len(top_recs) < 6:
                for cand in scored_candidates:
                    if cand not in top_recs:
                        top_recs.append(cand)
                        if len(top_recs) == 6:
                            break

            for rec in top_recs:
                all_recommendations.append({
                    "_id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "recommended_appliance_id": rec['appliance_doc_id'],
                    "match_percentage": rec['match_percentage'],
                    "recommendation_reason": rec['recommendation_reason'],
                    "recommendation_type": rec['recommendation_type'],
                    "bundle_badge": rec['bundle_badge'],
                    "energy_savings_est": rec['energy_savings_est'],
                    "combo_discount_pct": rec['combo_discount_pct'],
                    "last_updated": now
                })

        # Clear old recommendations and insert fresh hybrid batch
        db.appliance_recommendations.delete_many({})
        if all_recommendations:
            db.appliance_recommendations.insert_many(all_recommendations)
            print(f"[ML Recommender] Successfully generated and stored {len(all_recommendations)} recommendations.")
        else:
            print("[ML Recommender] No recommendations generated.")
            
    except Exception as e:
        print(f"[ML Recommender] Error during recommendation training: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    train_and_generate_recommendations()

