# 🌟 Rentora (RentAI) — Next-Gen AI & IoT Household Appliance Rental Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-v5.2-lightgrey.svg)](https://expressjs.com/)
[![React 19](https://img.shields.io/badge/React-v19-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-v8-646CFF.svg)](https://vitejs.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-NoSQL-47A248.svg)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-v4.8-black.svg)](https://socket.io/)
[![Machine Learning](https://img.shields.io/badge/ML%20Pipeline-LightGBM%20%7C%20TreeSHAP-orange.svg)](https://lightgbm.readthedocs.io/)

> **Rentora** is a full-stack, enterprise-grade appliance rental and circular-economy subscription ecosystem. Designed for urban professionals, students, and nomadic households, Rentora replaces traditional, adversarial rental models with **Fintech Escrow transparency, OCR-based KYC compliance, real-time IoT health telemetry, and Rent-to-Own asset equity accumulation.**

---

## 🚀 Key Architectural Innovations

### 1. 🛡️ Mandatory Tenant KYC & RBI-Compliant Escrow Protection
* **Client-Side Document OCR**: Powered by Tesseract.js for client-side Aadhaar & residence document verification.
* **Mandatory Universal KYC**: All customers complete automated digital verification prior to checkout, ensuring trust, fraud elimination, and verified doorstep fulfillment.
* **Segregated RBI-Compliant Escrow**: Every lease is allocated a unique Escrow Custody Account ID (`ESC-BLR-xxxxxx`), protecting 100% of customer deposits from arbitrary vendor withholding.

### 2. 🏛️ Interactive Escrow Ledger & Rentora Shield
* **Rentora Shield Damage Waiver**: Built-in **₹10,000 accidental protection policy** that absorbs ordinary cosmetic wear, voltage surges, and transit scuffs with **₹0 deposit forfeiture**.
* **Live Interactive Refund Stepper**: Transparent 4-stage lifecycle timeline (*Zero-Risk Hold $\rightarrow$ Segregated Custody $\rightarrow$ Inspection & Waiver $\rightarrow$ 100% Instant Doorstep Refund* via UPI/IMPS rails).

### 3. ⚡ Smart Appliance IoT Telemetry & Fleet Hub
* **Live Operational Telemetry**: Real-time simulation of temperature, power consumption (kWh), vibration frequencies, and filter degradation.
* **Predictive Maintenance Dispatch**: Automatically generates preventive maintenance tickets and alerts technicians before catastrophic appliance motor breakdown.

### 4. 💎 Rent-to-Own Equity Accumulation & Legal Certificates
* **Lease-to-Own Equity**: Up to 70% of monthly subscription rentals accrue directly towards outright appliance asset purchase.
* **Cryptographic Title Transfer**: Generates an official, printable **Digital Certificate of Ownership** with non-judicial deed reference upon buyout.

### 5. 🤖 AI Concierge & Intelligent Recommendation Engine
* **Contextual Natural Language Concierge**: Interactive chatbot answering product inquiries, tenure comparisons, and maintenance scheduling.
* **Machine Learning Recommender**: Sublinear TF-IDF vectorization and cosine similarity matrix matching appliances to user preferences and apartment floor plans.
* **Predictive Churn Engine**: LightGBM classifier with TreeSHAP feature explanations identifying customer friction points.

### 6. 👥 Multi-Role Role-Based Access Control (RBAC)
* **Customer Portal**: Catalog exploration, flexible cart tenure pricing, delivery tracker with live driver GPS and handover OTP, service requests, and invoice downloads.
* **Peer-to-Peer Owner Dashboard**: Asset monetization portal for appliance owners to list units, track utilization, and view payout ledgers.
* **Enterprise Admin Dashboard**: Real-time business intelligence, order lifecycle management, KYC approval console, IoT fleet health radar, and CSV exports.

---

## 🛠️ System Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────┐
│               React 19 + Vite Frontend SPA             │
│   (Glassmorphic UI, Lucide Icons, Recharts, Socket.io) │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS REST / WebSockets
┌──────────────────────────▼─────────────────────────────┐
│             Node.js + Express.js API Gateway           │
│   (JWT Auth, RBAC Middleware, Atomic Mongo Pipeline)   │
└──────────────┬───────────────────────────┬─────────────┘
               │ Native Pool               │ Async Batch
┌──────────────▼────────────┐ ┌────────────▼─────────────┐
│     MongoDB NoSQL Database│ │ Python ML Pipeline (Async)│
│ (Users, Rentals, Escrow,  │ │ (LightGBM, TreeSHAP,     │
│  Appliances, Payments)    │ │  TF-IDF Recommendations) │
└───────────────────────────┘ └──────────────────────────┘
```

* **Frontend**: React 19, Vite 8, React Router 7, Lucide Icons, Recharts, Tesseract.js, Socket.io-client.
* **Backend**: Node.js v20+, Express.js 5.2, Socket.io, JSONWebToken, Multer, CORS.
* **Database**: MongoDB (Native MongoDB Driver with connection pooling and atomic transactions).
* **Machine Learning**: Python 3.10+, LightGBM, TreeSHAP, Scikit-learn, Pandas, NumPy.

> [!NOTE]
> **Academic Simulation & Architecture Scope**:
> Rentora is an academic capstone platform developed to demonstrate enterprise software engineering patterns, explainable AI, and reactive architectures. Payment processing (UPI/Razorpay rails), Escrow custody IDs, and IoT sensor streams are simulated within software data pipelines to demonstrate real-world domain workflows without requiring live third-party merchant accounts or physical IoT hardware.

---

## 📦 Getting Started & Local Installation

### Prerequisites
* [Node.js](https://nodejs.org/) (v20 or higher)
* [MongoDB](https://www.mongodb.com/) (running locally on port 27017 or a cloud MongoDB Atlas URI)

### 1. Clone the Repository
```bash
git clone https://github.com/Nayak17-07/Rentora.git
cd Rentora
```

### 2. Configure Environment Variables
In the `server/` directory, create `.env` from `.env.example`:
```bash
cd server
cp .env.example .env
```
Ensure your configuration keys are set:
```env
PORT=8000
MONGO_URI=mongodb://127.0.0.1:27017/rentora_db
JWT_SECRET=your_cryptographically_secure_256_bit_jwt_secret
ADMIN_PASSCODE=1707
```

### 3. Start Backend Server
```bash
cd server
npm install
npm run dev # Or: node index.js
```
*Backend will be running on `http://127.0.0.1:8000` with WebSocket support.*

### 4. Start Frontend Client
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*Frontend will be running on `http://localhost:5173`.*

---

## 📂 Project Directory Structure

```
Rentora/
├── frontend/               # Vite + React 19 Client Application
│   ├── src/
│   │   ├── HomePage.jsx             # Catalog, Combos, Rent-vs-Buy Calculator
│   │   ├── CartPage.jsx             # Dynamic Tenure Checkout & Escrow Deposits
│   │   ├── MyRentalsPage.jsx        # Leases, Relocation, Service & Return Hub
│   │   ├── EscrowLedgerModal.jsx    # Escrow Ledger & Damage Waiver
│   │   ├── RentToOwnModal.jsx       # Equity Buyout & Tenure Extension
│   │   ├── KYCPage.jsx              # OCR Identity & Document Verification
│   │   ├── AdminDashboard.jsx       # Operations, BI Analytics & Fleet Hub
│   │   ├── OwnerDashboard.jsx       # Peer Asset Lessor Monetization
│   │   └── RentoraConcierge.jsx     # AI Natural Language Assistant
├── server/                 # Node.js & Express REST + WebSocket Server
│   ├── src/
│   │   ├── routes/                  # Express Router Modules (16 endpoints)
│   │   ├── db/                      # MongoDB Connection Pool & Collections
│   │   └── app.js                   # Express Middleware & Mounts
├── ml_pipeline/            # Asynchronous Python ETL & Churn/Recommender Models
└── ARCHITECTURE.md         # In-Depth System Engineering Specification
```

---

## 🎓 Academic / SDC-II Capstone Project
* **Project Name**: Rentora (AI-Enabled Smart Household Appliance Rental System)
* **Curriculum**: Software Development Cell - II (SDC-II) Capstone Project
* **Repository**: [https://github.com/Nayak17-07/Rentora](https://github.com/Nayak17-07/Rentora)

> [!IMPORTANT]
> **Production Integration & Simulation Disclosure**:
> - **Production-Ready & Fully Verifiable**: Core application workflows, including PBKDF2 password derivation, JWT sessions, MongoDB persistence, Verhoeff mathematical checksums, XML-DSig signature verification, LightGBM churn classification with TreeSHAP explanations, and TF-IDF cosine recommendations are fully implemented and execute against live data.
> - **Simulated / Sandbox Modules**: In accordance with academic capstone prototyping guidelines, third-party payment rails (Razorpay sandbox with HMAC-SHA256 verification), RBI escrow custody banking accounts, physical IoT hardware telemetry streams, and UIDAI live Aadhaar server connectivity operate in software-simulated sandbox environments without requiring commercial banking licenses or live government server connectivity.
