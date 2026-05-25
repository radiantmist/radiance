// ============================================================
// auth.js — Authentication System
// Handles Google login, session state, admin role check
// ============================================================

import { auth, db }                          from './firebase-config.js';
import { GoogleAuthProvider, signInWithPopup,
         signOut, onAuthStateChanged }        from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { doc, getDoc }                        from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── State ────────────────────────────────────────────────────
let currentUser  = null;
let isAdmin      = false;
const listeners  = [];

// ── Google Provider ──────────────────────────────────────────
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ── Login ────────────────────────────────────────────────────
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    console.error('Google login error:', err.message);
    throw err;
  }
}

export async function logout() {
  await signOut(auth);
  currentUser = null;
  isAdmin     = false;
}

// ── Admin check ──────────────────────────────────────────────
async function checkAdmin(uid) {
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists() && snap.data()?.admin === true;
  } catch {
    return false;
  }
}

// ── Observer ─────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  isAdmin     = user ? await checkAdmin(user.uid) : false;
  listeners.forEach(fn => fn(user, isAdmin));

  // FIX: Wait for DOM to be ready before updating UI
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => updateNavUI(user, isAdmin));
  } else {
    updateNavUI(user, isAdmin);
  }
});

export function onAuthChange(fn) {
  listeners.push(fn);
}

// ── Getters ──────────────────────────────────────────────────
export function getUser()    { return currentUser; }
export function getIsAdmin() { return isAdmin; }

// ── Update navbar UI ─────────────────────────────────────────
function updateNavUI(user, admin) {
  const loginBtn = document.getElementById('nav-login-btn');
  const adminBtn = document.getElementById('nav-admin-btn');
  const userInfo = document.getElementById('nav-user-info');

  if (!loginBtn) return;

  if (user) {
    loginBtn.textContent   = 'Log Out';
    loginBtn.dataset.state = 'loggedIn';
    if (userInfo) {
      userInfo.textContent = user.displayName?.split(' ')[0] || '';
      userInfo.style.display = 'block';
    }
    if (adminBtn) adminBtn.style.display = admin ? 'inline-flex' : 'none';
  } else {
    loginBtn.textContent   = 'Login';
    loginBtn.dataset.state = 'loggedOut';
    if (userInfo) userInfo.style.display = 'none';
    if (adminBtn) adminBtn.style.display = 'none';
  }

  loginBtn.onclick = () => {
    if (loginBtn.dataset.state === 'loggedIn') {
      logout();
    } else {
      window.location.href = 'login.html';
    }
  };
}

// ── Require auth (redirect if not logged in) ─────────────────
export function requireAuth(redirectTo = 'login.html') {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      if (!user) {
        window.location.href = redirectTo;
      } else {
        resolve(user);
      }
    });
  });
}

// ── Require admin (redirect if not admin) ────────────────────
export async function requireAdmin(redirectTo = 'index.html') {
  const user = await requireAuth('login.html');
  const admin = await checkAdmin(user.uid);
  if (!admin) {
    showToast('Access denied — admin only.', 'error');
    setTimeout(() => { window.location.href = redirectTo; }, 1500);
    return null;
  }
  return user;
}
