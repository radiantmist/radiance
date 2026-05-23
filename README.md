<<<<<<< HEAD
# Radiance — Website Setup Guide

## File Structure

```
radiance/
├── index.html          ← Homepage
├── product.html        ← Product detail page (shared, loads by ?id=)
├── login.html          ← User login (Google + email)
├── admin.html          ← Admin dashboard (you only)
├── css/
│   ├── base.css        ← Design tokens, reset, navbar, shared components
│   ├── home.css        ← Homepage styles
│   ├── product.css     ← Product detail + reviews
│   └── admin.css       ← Login + admin dashboard
├── js/
│   ├── firebase-config.js  ← ⚠️ FILL THIS IN FIRST
│   ├── auth.js             ← Login/logout/admin check
│   ├── home.js             ← Homepage logic + product cards
│   ├── product.js          ← Product page + reviews
│   └── admin.js            ← Admin dashboard logic
└── assets/
    ├── logo.svg            ← Temporary logo (replace when ready)
    ├── candle-hero.jpg     ← ⚠️ Add your photo here
    ├── candle-about.jpg    ← ⚠️ Add your photo here
    └── candle-contact.jpg  ← ⚠️ Add your photo here
```

---

## Step-by-Step Setup

### 1. Firebase Project
1. Go to https://console.firebase.google.com
2. Click **Add project** → name it `radiance` → Continue
3. Click the **</>** (Web) icon → Register app → name it `radiance`
4. Copy the `firebaseConfig` object shown

### 2. Fill in Firebase Config
Open `js/firebase-config.js` and replace the placeholder values:
```js
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_KEY",
  authDomain: "your-project.firebaseapp.com",
  // etc.
};
```

### 3. Enable Authentication
Firebase Console → **Build → Authentication → Get Started**
- Enable **Google** (required — main login method)
- Enable **Email/Password** (optional)

### 4. Create Firestore Database
Firebase Console → **Build → Firestore Database → Create database**
- Choose **Start in test mode** for now
- Pick the region closest to Pakistan (e.g. `asia-south1`)

### 5. Make Yourself Admin
This is how the site knows you're the admin:
1. Open the live site → click **Login** → sign in with Google
2. Go to Firebase Console → **Authentication → Users**
3. Copy your **User UID**
4. Go to **Firestore → + Start collection** → name it `admins`
5. Document ID = your UID → Add field: `admin` (boolean) = `true`
6. Now the **Admin** button will appear in the navbar when you're logged in

### 6. Seed Products
Once Firebase is working:
- Log in as admin → go to `yoursite.com/admin.html`
- Click **"Seed Initial Data"** in the Products tab
- This creates all 5 candles in Firestore

### 7. Add Your Photos
Drop images into the `assets/` folder with these exact names:
- `candle-hero.jpg` — hero section (the photo you already shared works great)
- `candle-about.jpg` — about section
- `candle-contact.jpg` — contact background

You can use the same photo for all three while you're getting started.

### 8. Update Contact Details
In `index.html`, find and replace:
- `YOUR_HANDLE` → your Instagram handle
- `hello@radiancecandles.com` → your actual email
- `92XXXXXXXXXX` → your WhatsApp number (country code + number, no +)

### 9. Deploy to Vercel
1. Go to https://github.com → Create new repo → name it `radiance` → Public
2. Upload ALL files (keep the folder structure exactly as-is)
3. Go to https://vercel.com → Sign in with GitHub
4. Click **Add New Project** → import your `radiance` repo
5. Hit **Deploy** — live in ~60 seconds

---

## Managing the Site (Daily Use)

### Update stock numbers
Admin dashboard → Products & Stock → change "Total Made" or "Total Sold" → Save

### Approve/delete reviews
Admin dashboard → Review Moderation → Approve or Delete

### Add a new candle
1. In Firestore, go to `products` collection → Add document
2. Document ID = candle slug (e.g. `velvet`)
3. Fields: `name`, `scent`, `description`, `notes` (array), `totalMade`, `totalSold`, `badge`, `badgeType`, `order`, `num`, `burnTime`, `wax`, `wick`, `weight`, `price`

---

## How Product Pages Work
All candles share the same `product.html` file.
Clicking a card on the homepage goes to:
```
product.html?id=bloom
product.html?id=sage
product.html?id=dusk
```
The JS reads the `?id=` from the URL, loads that product's data from Firestore (with fallback to built-in defaults), and renders everything dynamically.

---

## Firestore Structure

```
admins/
  {yourUID}/
    admin: true

products/
  bloom/
    name, scent, description, notes[], totalMade,
    totalSold, badge, badgeType, order, num,
    burnTime, wax, wick, weight, price

reviews/
  {autoId}/
    productId, userId, userName, userPhoto,
    rating, text, approved, createdAt
```

---

*Built for Radiance — Bahawalpur, Pakistan — 2025*
=======
# Radiance-Luxury-Candles
This is a fully functional, professional scale website, featuring luxury candles. The ownership of this website falls under the jurisdiction of the brand named 'Radiance'.
>>>>>>> eb9ee897b6599254ed5d4cd0d312fac2d2b3ace9
