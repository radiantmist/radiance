// ============================================================
// firebase-config.js — Firebase Initialisation
//
// HOW TO SET THIS UP (5 min):
// 1. Go to https://console.firebase.google.com
// 2. Create a new project → name it "radiance"
// 3. Click the </> (Web) icon to add a web app
// 4. Copy the firebaseConfig object and paste it below
// 5. In Firebase console:
//    → Build > Authentication > Enable "Google" provider
//    → Build > Firestore Database > Create (start in test mode)
// ============================================================

import { initializeApp }         from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore }           from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth }                from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// ▼ REPLACE with your own Firebase project config ▼
const firebaseConfig = {
  apiKey: "AIzaSyCPwSZcaKqYVfpC3EgaKnI9r7GQeT_SIlo",
  authDomain: "radiance-9f44a.firebaseapp.com",
  projectId: "radiance-9f44a",
  storageBucket: "radiance-9f44a.firebasestorage.app",
  messagingSenderId: "94620162953",
  appId: "1:94620162953:web:dab7d04cbc651ddaf79f58",
};
// ▲ ─────────────────────────────────────────────── ▲

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };

// ============================================================
// FIRESTORE STRUCTURE (auto-created when you seed data):
//
// products/{productId}
//   name, scent, description, price, totalMade,
//   totalSold, badge, active
//
// reviews/{reviewId}
//   productId, userId, userName, userPhoto,
//   rating, text, approved, createdAt
//
// admins/{userId}   → { admin: true }
//   Add YOUR Firebase Auth UID here manually after first login
// ============================================================
