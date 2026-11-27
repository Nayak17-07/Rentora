# Rentora — Trust-First Appliance & High-Value Rental Marketplace

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-v5.2-lightgrey.svg)](https://expressjs.com/)
[![React 19](https://img.shields.io/badge/React-v19-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-v8-646CFF.svg)](https://vitejs.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-NoSQL-47A248.svg)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-v4.8-black.svg)](https://socket.io/)

> **Rentora** is a secure appliance and high-value product rental marketplace that focuses on **user verification, refundable security deposits, owner approval workflows, reviews, and rental history** so owners and renters can transact with confidence.

---

## Core Features

### 1. Multi-Level Identity Verification System
* **Gmail-Only OTP Sign-Up**: New user registration requires verifying a `@gmail.com` address via a 6-digit SMTP OTP.
* **Phone Verification**: Users verify their 10-digit mobile number from their Trust Profile.
* **Manual Government ID + Selfie Verification**: Users upload a Government ID (Aadhaar Card, Driving License, or Passport) and a Selfie holding the ID. Administrators review both images side-by-side and click **Approve** or **Reject** to award the **ID Verified** badge. *(In production, this can integrate with third-party KYC providers such as HyperVerge, Signzy, or IDfy.)*

### 2. Trust Profile & Rental History
Every renter has a transparent **Trust Profile** (`0–100` Trust Score) visible on their profile and to owners before booking approval:
* **Email Verified** (`+25` pts)
* **Phone Verified** (`+25` pts)
* **Government ID Verified** (`+20` pts)
* **Completed Rentals** (up to `+15` pts)
* **Reviews & Rating** (up to `+15` pts)
* Displays **Member Since**, **Rentals Completed**, **Average Rating**, and **Verification Status**.

### 3. Security Deposit Management
* High-value items require a clear **refundable security deposit** alongside the rental rate (e.g., high-value electronics or appliances), settled back to the customer after return inspection.
* Razorpay checkout integration with server-side order calculation and webhook/signature verification.

### 4. Owner Approval Workflow
For owner-listed and high-value products:
1. Customer submits a **Rental Request**.
2. Status starts as **Pending Approval** (`pending_approval`).
3. Owner reviews the renter's **Trust Score, Verification Badges, and Rental History** in the Owner Dashboard.
4. Owner clicks **Approve** (activates lease) or **Reject** (declines request and restores inventory stock).

### 5. Role-Based Portals (RBAC)
* **Customer Portal**: Catalog search & city/category filters, cart with 3/6/12-month tenure pricing, Razorpay checkout, My Rentals (delivery OTP, service requests, returns), Digital Lease Agreement, and Identity Verification (`/kyc`).
* **Owner Dashboard (`/owner`)**: List and manage appliances, review renter Trust Profiles, approve/reject booking requests, and track payouts.
* **Admin Dashboard (`/admin`)**: Clean operational overview with **Total Users**, **Total Rentals**, **Total Revenue**, **Flagged Users**, and **Pending Verifications**, plus manual ID + Selfie review, user flagging, rental management, and catalog inventory controls.

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
└──────────────────────────┬─────────────────────────────┘
                           │ Native Driver
┌──────────────────────────▼─────────────────────────────┐
│                    MongoDB Database                    │
│  (Users, Appliances, Rentals, Carts, Payments, KYC)    │
└────────────────────────────────────────────────────────┘
```

* **Frontend**: React 19, Vite 8, React Router 7, Lucide Icons, Socket.io-client.
* **Backend**: Node.js v20+, Express.js 5.2, Socket.io, JSONWebToken, Nodemailer (Gmail SMTP), Razorpay SDK.
* **Database**: MongoDB (Native MongoDB Driver with atomic stock decrements).

---

## Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v20 or higher)
* [MongoDB](https://www.mongodb.com/) (running locally on port `27017` or a MongoDB Atlas URI)

### 1. Clone the Repository
```bash
git clone https://github.com/Nayak17-07/Rentora.git
cd Rentora
```

### 2. Configure Environment Variables
In `server/`, copy `.env.example` to `.env` and configure your keys:
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

### 3. Start Backend Server
```bash
cd server
npm install
npm run dev
```
*Backend runs on `http://127.0.0.1:8000`.*

### 4. Start Frontend Client
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## Project Structure

```
Rentora/
├── frontend/                  # Vite + React 19 Client Application
│   ├── src/
│   │   ├── HomePage.jsx               # Catalog, Search, Filters & Product Details
│   │   ├── CartPage.jsx               # Tenure Checkout, Addresses & Security Deposits
│   │   ├── MyRentalsPage.jsx          # Active Leases, Trust Profile, Service & Returns
│   │   ├── KYCPage.jsx                # Identity Verification (Manual ID + Selfie)
│   │   ├── TrustProfileCard.jsx       # Trust Score, Verifications & Rental History
│   │   ├── OwnerDashboard.jsx         # Listings, Renter Trust Review & Approvals
│   │   ├── AdminDashboard.jsx         # 5-KPI Overview, ID Approvals & Flagged Users
│   │   ├── LoginPage.jsx              # JWT Login & Password Reset
│   │   └── RegisterPage.jsx           # Gmail-Only OTP Registration
│   └── vite.config.js                 # Vite Dev Proxy (/api, /uploads, /socket.io)
└── server/                    # Node.js & Express REST + WebSocket Server
    ├── src/
    │   ├── routes/                    # Auth, Appliances, Cart, Checkout, Trust, KYC, Owner, Admin
    │   ├── utils/trust.js             # Trust Score & Rental History Calculator
    │   └── app.js                     # Express Middleware & Route Mounts
    └── index.js
```
