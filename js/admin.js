// ============================================================
// admin.js — Admin Dashboard
// Manage products (stock/sold), moderate reviews
// ============================================================

import { db }                       from './firebase-config.js';
import { requireAdmin }             from './auth.js';
import {
  collection, getDocs, doc,
  updateDoc, deleteDoc,
  query, orderBy, where,
  setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAdmin();
  if (!user) return;

  document.getElementById('admin-user-name').textContent = user.displayName || 'Admin';

  initTabs();
  await Promise.all([ loadStats(), loadProducts(), loadReviews() ]);
});

// ── Tabs ──────────────────────────────────────────────────────
function initTabs() {
  const tabs    = document.querySelectorAll('.admin-tab');
  // FIX: panels are identified by id, not class
  const panels  = [
    document.getElementById('panel-products'),
    document.getElementById('panel-reviews'),
    document.getElementById('panel-setup')
  ].filter(Boolean);

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => { if(p) p.style.display = 'none'; });
      tab.classList.add('active');
      const target = document.getElementById(`panel-${tab.dataset.tab}`);
      if (target) target.style.display = 'block';
    });
  });

  // Show first tab
  if (tabs.length) tabs[0].click();
}

// ── Stats overview ────────────────────────────────────────────
async function loadStats() {
  try {
    const [prodSnap, reviewSnap] = await Promise.all([
      getDocs(collection(db, 'products')),
      getDocs(collection(db, 'reviews')),
    ]);

    const products   = prodSnap.docs.map(d => d.data());
    const reviews    = reviewSnap.docs.map(d => d.data());
    const totalMade  = products.reduce((s, p) => s + (p.totalMade || 0), 0);
    const totalSold  = products.reduce((s, p) => s + (p.totalSold || 0), 0);
    const pending    = reviews.filter(r => !r.approved).length;

    setText('stat-products', products.length);
    setText('stat-made', totalMade);
    setText('stat-sold', totalSold);
    setText('stat-pending', pending);
  } catch (err) {
    console.error('Stats error:', err);
  }
}

// ── Products panel ────────────────────────────────────────────
const SEED_PRODUCTS = [
  { id: 'bloom',  order: 1, num: 'No. 01', name: 'Bloom',  scent: 'Rose · Jasmine · Soft Musk',    totalMade: 30, totalSold: 18, badge: 'New Arrival', badgeType: 'gold'  },
  { id: 'dusk',   order: 2, num: 'No. 02', name: 'Dusk',   scent: 'Oud · Sandalwood · Vanilla',     totalMade: 25, totalSold: 10, badge: '',            badgeType: ''      },
  { id: 'soleil', order: 3, num: 'No. 03', name: 'Soleil', scent: 'Citrus · White Tea · Cedar',     totalMade: 25, totalSold: 8,  badge: '',            badgeType: ''      },
  { id: 'sage',   order: 4, num: 'No. 04', name: 'Sage',   scent: 'Eucalyptus · Green Tea · Mint',  totalMade: 20, totalSold: 5,  badge: 'New',         badgeType: 'green' },
  { id: 'noir',   order: 5, num: 'No. 05', name: 'Noir',   scent: 'Black Rose · Amber · Vetiver',   totalMade: 20, totalSold: 2,  badge: 'Coming Soon', badgeType: 'gold'  },
];

async function loadProducts() {
  const container = document.getElementById('admin-products-grid');
  if (!container) return;

  let products = SEED_PRODUCTS;

  try {
    const snap = await getDocs(query(collection(db, 'products'), orderBy('order')));
    if (!snap.empty) {
      products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  } catch { /* use seed */ }

  container.innerHTML = products.map(renderProductCard).join('');

  // Attach save handlers
  container.querySelectorAll('.btn-admin-save').forEach(btn => {
    btn.addEventListener('click', () => saveProduct(btn.dataset.id));
  });

  // Attach badge edit
  container.querySelectorAll('.btn-admin-badge').forEach(btn => {
    btn.addEventListener('click', () => editBadge(btn.dataset.id));
  });
}

function renderProductCard(p) {
  const available = Math.max(0, (p.totalMade || 0) - (p.totalSold || 0));
  return `
    <div class="admin-product-card" id="card-${p.id}">
      <div class="admin-product-card__header">
        <div>
          <div class="admin-product-card__name">${p.name}</div>
          <div class="admin-product-card__id">${p.scent}</div>
        </div>
        ${p.badge ? `<span class="admin-badge">${p.badge}</span>` : ''}
      </div>

      <div class="admin-field">
        <label>Total Made</label>
        <input type="number" id="made-${p.id}" value="${p.totalMade || 0}" min="0">
        <div class="admin-field__hint">How many you poured</div>
      </div>

      <div class="admin-field">
        <label>Total Sold</label>
        <input type="number" id="sold-${p.id}" value="${p.totalSold || 0}" min="0">
        <div class="admin-field__hint">${available} currently available</div>
      </div>

      <div class="admin-product-card__actions">
        <button class="btn-admin-save" data-id="${p.id}">Save Changes</button>
        <button class="btn-admin-badge" data-id="${p.id}">Badge</button>
      </div>
    </div>`;
}

async function saveProduct(productId) {
  const made = parseInt(document.getElementById(`made-${productId}`)?.value) || 0;
  const sold = parseInt(document.getElementById(`sold-${productId}`)?.value) || 0;

  if (sold > made) {
    showToast('Sold cannot exceed total made.', 'error');
    return;
  }

  try {
    await updateDoc(doc(db, 'products', productId), {
      totalMade: made,
      totalSold: sold,
      updatedAt: serverTimestamp(),
    });
    showToast(`${productId} updated successfully.`, 'success');

    // Update hint
    const hint = document.querySelector(`#card-${productId} .admin-field:last-of-type .admin-field__hint`);
    if (hint) hint.textContent = `${Math.max(0, made - sold)} currently available`;
  } catch (err) {
    showToast('Save failed — check Firebase config.', 'error');
    console.error(err);
  }
}

async function editBadge(productId) {
  const badge = prompt('Enter badge text (leave empty to remove):');
  if (badge === null) return; // cancelled
  try {
    await updateDoc(doc(db, 'products', productId), { badge: badge.trim() });
    showToast('Badge updated. Reload to see changes.', 'success');
  } catch {
    showToast('Could not update badge.', 'error');
  }
}

// ── Seed initial products (run once) ─────────────────────────
window.seedProducts = async function() {
  for (const p of SEED_PRODUCTS) {
    await setDoc(doc(db, 'products', p.id), p, { merge: true });
  }
  showToast('Products seeded to Firestore!', 'success');
};

// ── Reviews panel ─────────────────────────────────────────────
let allAdminReviews = [];
let currentFilter   = 'all';

async function loadReviews() {
  const container = document.getElementById('admin-reviews-list');
  if (!container) return;

  try {
    const snap = await getDocs(query(collection(db, 'reviews'), orderBy('createdAt', 'desc')));
    allAdminReviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    allAdminReviews = [];
  }

  renderAdminReviews();
  attachFilterBtns();
}

function attachFilterBtns() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderAdminReviews();
    });
  });
}

function renderAdminReviews() {
  const container = document.getElementById('admin-reviews-list');
  if (!container) return;

  const filtered = currentFilter === 'all' ? allAdminReviews
    : currentFilter === 'pending'  ? allAdminReviews.filter(r => !r.approved)
    : allAdminReviews.filter(r => r.approved);

  if (!filtered.length) {
    container.innerHTML = '<div style="padding:32px;color:var(--muted);font-size:0.85rem;">No reviews found.</div>';
    return;
  }

  container.innerHTML = filtered.map(r => {
    const stars  = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    const status = r.approved ? 'approved' : 'pending';
    const date   = r.createdAt?.toDate?.()?.toLocaleDateString() || '';
    return `
      <div class="admin-review-card ${status}" id="rev-${r.id}">
        <div class="admin-review-card__info">
          <div class="admin-review-card__meta">
            <span class="admin-review-card__author">${escHtml(r.userName || 'Anonymous')}</span>
            <span class="admin-review-card__product">on ${r.productId}</span>
            <span class="admin-review-card__status status--${status}">${status}</span>
          </div>
          <div style="color:var(--gold);font-size:0.85rem;margin-bottom:6px;">${stars} ${date}</div>
          <div class="admin-review-card__text">${escHtml(r.text)}</div>
        </div>
        <div class="admin-review-card__actions">
          ${!r.approved ? `<button class="btn-approve" onclick="approveReview('${r.id}')">Approve</button>` : ''}
          <button class="btn-delete" onclick="deleteReview('${r.id}')">Delete</button>
        </div>
      </div>`;
  }).join('');
}

window.approveReview = async function(reviewId) {
  try {
    await updateDoc(doc(db, 'reviews', reviewId), { approved: true });
    const r = allAdminReviews.find(r => r.id === reviewId);
    if (r) r.approved = true;
    renderAdminReviews();
    showToast('Review approved and now visible.', 'success');
  } catch {
    showToast('Could not approve review.', 'error');
  }
};

window.deleteReview = async function(reviewId) {
  if (!confirm('Delete this review? This cannot be undone.')) return;
  try {
    await deleteDoc(doc(db, 'reviews', reviewId));
    allAdminReviews = allAdminReviews.filter(r => r.id !== reviewId);
    renderAdminReviews();
    showToast('Review deleted.', 'success');
  } catch {
    showToast('Could not delete review.', 'error');
  }
};

// ── Helpers ───────────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

window.showToast = function(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`; t.textContent = msg;
  c.appendChild(t); setTimeout(() => t.remove(), 3500);
};
