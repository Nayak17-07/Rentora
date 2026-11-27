# Rentora — AI-Powered Appliance Rental Marketplace

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-v5.2-lightgrey.svg)](https://expressjs.com/)
[![React 19](https://img.shields.io/badge/React-v19-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-v8-646CFF.svg)](https://vitejs.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-NoSQL-47A248.svg)](https://www.mongodb.com/)
[![Machine Learning](https://img.shields.io/badge/ML-LightGBM%20%7C%20TF--IDF-orange.svg)](https://lightgbm.readthedocs.io/)

> **Rentora** is an AI-powered rental marketplace that uses **recommendation systems** to personalize appliance suggestions and **churn prediction models** to identify at-risk customers and improve retention—backed by multi-level user verification, refundable security deposits, and owner approval workflows.

---

## Core Modules

### 1. AI Recommendation Engine
* **Personalized Appliance Suggestions**: Uses sublinear **TF-IDF vectorization** and cosine similarity combined with co-rental matching to recommend relevant appliances (`For You`, `Room Combos`, and `Popular by City`).
* **Cart & Product Companion Suggestions**: Surfaces complementary items (`Frequently Rented Together`) on product detail modals and checkout.

### 2. Customer Churn Prediction & Retention
* **LightGBM + TreeSHAP Pipeline**: Analyzes customer rental activity, tenure, and engagement to compute churn probability (`ml_pipeline/etl_pipeline.py`, `ml_pipeline/train_model.py`).
* **Explainable Churn Radar**: Surfaces at-risk subscribers and their primary SHAP drivers in the Admin Dashboard so support teams can dispatch targeted retention offers.

### 3. Trust, Verification & Rental Workflow
* **Gmail-Only OTP Sign-Up**: New user registration requires verifying a `@gmail.com` address via a 6-digit SMTP OTP.
* **Multi-Level Identity Verification**: Email verification, 10-digit phone verification, and manual Government ID (Aadhaar / Driving License / Passport) + Selfie upload reviewed by Admin (`Approve` / `Reject` → `ID Verified`).
* **Trust Profile & Rental History**: Displays each renter's Trust Score (`0–100`), verification badges, Member Since date, Completed Rentals, and Peer Reviews.
* **Security Deposit Management**: Refundable security deposits for high-value items alongside Razorpay checkout integration.
* **Owner Approval Workflow**: High-value and peer-listed bookings enter `pending_approval` so owners can review the renter's Trust Profile and rental history before approving or declining.

### 4. Role-Based Portals (RBAC)
* **Customer Portal**: Catalog search & filters, personalized recommendations, 3/6/12-month tenure pricing, Razorpay checkout, My Rentals (delivery OTP, service requests, returns), and Identity Verification (`/kyc`).
* **Owner Dashboard (`/owner`)**: List appliances, review renter Trust Profiles, approve/reject booking requests, and track payouts.
* **Admin Dashboard (`/admin`)**: Clean 5-KPI overview (**Total Users**, **Total Rentals**, **Total Revenue**, **Flagged Users**, **Pending Verifications**), **Churn Prediction Radar**, manual ID + Selfie moderation, user flagging, and inventory controls.

---

## System Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────┐
│               React 19 + Vite Frontend SPA             │
│        (React Router, Lucide Icons, Socket.io)         │
└──────────────────────────┬─────────────────────────────┘
                           │ REST API / WebSockets
┌──────────────────────────▼─────────────────────────────┐
│             Node.js + Express.js API Server            │
│   (JWT Auth, RBAC, Gmail OTP, Atomic Mongo Updates)    │
└──────────────┬───────────────────────────┬─────────────┘
               │ Native Driver             │ Async Python
┌──────────────▼────────────┐ ┌────────────▼─────────────┐
│     MongoDB Database      │ │   Python ML Pipeline     │
│ (Users, Appliances, Cart, │ │ (LightGBM Churn Model,   │
│  Rentals, Payments, KYC)  │ │  TreeSHAP, TF-IDF Recs)  │
└───────────────────────────┘ └──────────────────────────┘
```

* **Frontend**: React 19, Vite 8, React Router 7, Lucide Icons, Socket.io-client.
* **Backend**: Node.js v20+, Express.js 5.2, Socket.io, JSONWebToken, Nodemailer (Gmail SMTP), Razorpay SDK.
* **Database**: MongoDB (Native MongoDB Driver with atomic stock decrements).
* **Machine Learning**: Python 3.10+, LightGBM, SHAP (TreeSHAP), Scikit-learn, Pandas, NumPy.

---

## Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v20 or higher)
* [MongoDB](https://www.mongodb.com/) (running locally on port `27017` or a MongoDB Atlas URI)
* [Python](https://www.python.org/) (3.10+ for ML pipeline scripts)

### 1. Clone the Repository
```bash
git clone https://github.com/Nayak17-07/Rentora.git
cd Rentora
```

### 2. Configure Environment Variables
In `server/`, copy `.env.example` to `.env`:
```bash
cd server
cp .env.example .env
```
Key variables in `server/.env`:
```env
PORT=8000
MONGO_URI=mongodb://127.0.0.1:27017/
MONGO_DB_NAME=rentora_db
JWT_SECRET=your_secure_secret_key
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_16_character_app_password
```

### 3. Start Backend & Frontend
```bash
# Terminal 1 (Backend on port 8000)
cd server
npm install
npm run dev

# Terminal 2 (Frontend on port 5173)
cd frontend
npm install
npm run dev
```

---

## Project Structure

```
Rentora/
├── frontend/                  # Vite + React 19 Client Application
│   ├── src/
│   │   ├── HomePage.jsx               # Catalog, Search, Filters & Recommendations
│   │   ├── CartPage.jsx               # Tenure Checkout, Companion Recs & Deposits
│   │   ├── MyRentalsPage.jsx          # Leases, Trust Profile, Service & Returns
│   │   ├── KYCPage.jsx                # Identity Verification (Manual ID + Selfie)
│   │   ├── TrustProfileCard.jsx       # Trust Score, Verifications & Rental History
│   │   ├── OwnerDashboard.jsx         # Listings, Renter Trust Review & Approvals
│   │   ├── AdminDashboard.jsx         # 5-KPI Overview, Churn Radar & ID Moderation
│   │   ├── LoginPage.jsx              # JWT Login & Password Reset
│   │   └── RegisterPage.jsx           # Gmail-Only OTP Registration
│   └── vite.config.js                 # Vite Dev Proxy (/api, /uploads, /socket.io)
├── server/                    # Node.js & Express REST + WebSocket Server
│   ├── src/
│   │   ├── routes/                    # Auth, Appliances, Recommendations, Cart, Checkout, Trust, KYC, Owner, Admin
│   │   ├── utils/trust.js             # Trust Score & Rental History Calculator
│   │   ├── utils/pythonRunner.js      # Python ML Pipeline Runner
│   │   └── app.js                     # Express Middleware & Route Mounts
│   └── index.js
└── ml_pipeline/               # LightGBM Churn, TreeSHAP & Hybrid Recommender
```
