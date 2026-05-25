// ============================================================
// firebase-adapter.js — Data Layer Abstraction
// 
// WHY THIS EXISTS:
// If you ever migrate from Firebase to Supabase (or any other backend),
// you only need to rewrite THIS file. All other files import from here.
// 
// CURRENT IMPLEMENTATION: Firebase Firestore + Auth
// ============================================================

import { db, auth } from './firebase-config.js';
import {
  collection, getDocs, doc, getDoc,
  updateDoc, deleteDoc, setDoc, addDoc,
  query, orderBy, where, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── PRODUCTS ─────────────────────────────────────────────────
export async function getAllProducts() {
  const snap = await getDocs(query(collection(db, 'products'), orderBy('order')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getProductById(id) {
  const snap = await getDoc(doc(db, 'products', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateProduct(id, data) {
  return updateDoc(doc(db, 'products', id), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function seedProducts(products) {
  for (const p of products) {
    await setDoc(doc(db, 'products', p.id), p, { merge: true });
  }
}

// ── REVIEWS ─────────────────────────────────────────────────
export async function getReviewsForProduct(productId, options = {}) {
  const { approvedOnly = true } = options;
  let q = query(
    collection(db, 'reviews'),
    where('productId', '==', productId),
    orderBy('createdAt', 'desc')
  );
  if (approvedOnly) {
    q = query(q, where('approved', '==', true));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAllReviews() {
  const snap = await getDocs(query(collection(db, 'reviews'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function submitReview(data) {
  return addDoc(collection(db, 'reviews'), {
    ...data,
    approved: false,
    createdAt: serverTimestamp()
  });
}

export async function approveReview(reviewId) {
  return updateDoc(doc(db, 'reviews', reviewId), { approved: true });
}

export async function deleteReview(reviewId) {
  return deleteDoc(doc(db, 'reviews', reviewId));
}

// ── AUTH / ADMIN ────────────────────────────────────────────
export async function isUserAdmin(uid) {
  const snap = await getDoc(doc(db, 'admins', uid));
  return snap.exists() && snap.data()?.admin === true;
}

// ── STATS ───────────────────────────────────────────────────
export async function getDashboardStats() {
  const [prodSnap, reviewSnap] = await Promise.all([
    getDocs(collection(db, 'products')),
    getDocs(collection(db, 'reviews')),
  ]);

  const products = prodSnap.docs.map(d => d.data());
  const reviews = reviewSnap.docs.map(d => d.data());

  return {
    productCount: products.length,
    totalMade: products.reduce((s, p) => s + (p.totalMade || 0), 0),
    totalSold: products.reduce((s, p) => s + (p.totalSold || 0), 0),
    pendingReviews: reviews.filter(r => !r.approved).length
  };
}
