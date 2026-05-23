// ============================================================
// product.js — Product Detail Page
// Load product data, reviews, submit reviews
// ============================================================

import { db }                         from './firebase-config.js';
import { getUser, onAuthChange }       from './auth.js';
import {
  doc, getDoc, collection,
  query, where, orderBy, getDocs,
  addDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── Get product ID from URL ───────────────────────────────────
const params    = new URLSearchParams(window.location.search);
const productId = params.get('id') || 'bloom';

// ── Fallback data ─────────────────────────────────────────────
const FALLBACK = {
  bloom:  { num: 'No. 01', name: 'Bloom',  scent: 'Rose · Jasmine · Soft Musk',        description: 'Bloom opens with a burst of fresh rose petals, softened by the heady sweetness of jasmine in full bloom, and grounded in a whisper of warm musk. Light it when you want the room to feel alive.', notes: ['Rose', 'Jasmine', 'Soft Musk'], totalMade: 30, totalSold: 18, badge: 'New Arrival', badgeType: 'gold',  burnTime: '45–55 hrs', wax: 'Soy Wax 464', wick: 'Wooden Wick', weight: '200g', price: 'TBA' },
  dusk:   { num: 'No. 02', name: 'Dusk',   scent: 'Oud · Sandalwood · Vanilla',         description: 'As golden hour fades, Dusk fills the room with the deep, resinous warmth of oud, woven through smooth sandalwood and a trace of vanilla that lingers long after the flame is gone.', notes: ['Oud', 'Sandalwood', 'Vanilla'], totalMade: 25, totalSold: 10, badge: '', badgeType: '',         burnTime: '45–55 hrs', wax: 'Soy Wax 464', wick: 'Wooden Wick', weight: '200g', price: 'TBA' },
  soleil: { num: 'No. 03', name: 'Soleil', scent: 'Citrus · White Tea · Cedar',         description: 'Soleil is morning in a candle. Bright citrus cuts through with clarity, balanced by the clean, green serenity of white tea, anchored by cedar that keeps it from feeling light.', notes: ['Citrus', 'White Tea', 'Cedar'], totalMade: 25, totalSold: 8,  badge: '', badgeType: '',         burnTime: '45–55 hrs', wax: 'Soy Wax 464', wick: 'Wooden Wick', weight: '200g', price: 'TBA' },
  sage:   { num: 'No. 04', name: 'Sage',   scent: 'Eucalyptus · Green Tea · Mint',      description: 'Sage is stillness. Crisp eucalyptus, the quiet freshness of green tea, and a breath of cool mint. This is the one you light when you need to clear your head and just breathe.', notes: ['Eucalyptus', 'Green Tea', 'Mint'], totalMade: 20, totalSold: 5, badge: 'New',         badgeType: 'green', burnTime: '45–55 hrs', wax: 'Soy Wax 464', wick: 'Wooden Wick', weight: '200g', price: 'TBA' },
  noir:   { num: 'No. 05', name: 'Noir',   scent: 'Black Rose · Amber · Vetiver',       description: 'Noir is unapologetically dark. Black rose in full decay, amber resin that glows like embers, and vetiver roots pulling everything deep into the earth. For those who prefer their evenings moody.', notes: ['Black Rose', 'Amber', 'Vetiver'], totalMade: 20, totalSold: 2, badge: 'Coming Soon', badgeType: 'gold', burnTime: '45–55 hrs', wax: 'Soy Wax 464', wick: 'Wooden Wick', weight: '200g', price: 'TBA' },
};

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initCursor();
  initNavScroll();
  await loadProduct();
  await loadReviews();
  initReviewForm();
  initScrollReveal();
  onAuthChange(updateReviewFormState);
});

// ── Load product data ─────────────────────────────────────────
async function loadProduct() {
  let data = FALLBACK[productId] || FALLBACK.bloom;

  try {
    const snap = await getDoc(doc(db, 'products', productId));
    if (snap.exists()) data = { ...data, ...snap.data() };
  } catch { /* use fallback */ }

  renderProduct(data);
}

function renderProduct(p) {
  // Apply theme
  document.body.dataset.product = productId;
  document.querySelector('.product-hero__gradient').className =
    `product-hero__gradient grad-${productId}`;
  document.querySelector('.product-visual__gradient').className =
    `product-visual__gradient`;

  // Sage gets green accents
  if (productId === 'sage') {
    document.documentElement.style.setProperty('--accent', 'var(--green)');
    document.documentElement.style.setProperty('--accent-light', 'var(--green-light)');
  } else {
    document.documentElement.style.setProperty('--accent', 'var(--gold)');
    document.documentElement.style.setProperty('--accent-light', 'var(--gold-light)');
  }

  setText('product-num', p.num);
  setText('product-name', p.name);
  setText('product-scent', p.scent);
  setText('product-desc', p.description);
  setText('product-price', p.price || 'TBA');
  setText('product-burn', p.burnTime || '45–55 hrs');
  setText('product-wax', p.wax || 'Soy Wax 464');
  setText('product-wick', p.wick || 'Wooden Wick');
  setText('product-weight', p.weight || '200g');
  document.title = `${p.name} — Radiance`;

  // Badge
  const badge = document.getElementById('product-badge');
  if (badge && p.badge) {
    badge.textContent = p.badge;
    badge.className   = `product-card__badge badge--${p.badgeType || 'gold'}`;
    badge.style.display = 'inline-block';
  }

  // Scent notes
  const notesEl = document.getElementById('scent-notes');
  if (notesEl && p.notes) {
    notesEl.innerHTML = p.notes.map(n => `<span class="scent-note">${n}</span>`).join('');
  }

  // Trust metrics
  const available = (p.totalMade || 0) - (p.totalSold || 0);
  const pctSold   = p.totalMade ? Math.round((p.totalSold / p.totalMade) * 100) : 0;

  setText('trust-made', p.totalMade || '—');
  setText('trust-sold', p.totalSold || '—');
  setText('trust-left', Math.max(0, available));

  const bar = document.getElementById('stock-bar-fill');
  if (bar) {
    setTimeout(() => { bar.style.width = `${Math.min(100, pctSold)}%`; }, 400);
  }
}

// ── Load reviews ──────────────────────────────────────────────
let allReviews = [];

async function loadReviews() {
  try {
    const q    = query(
      collection(db, 'reviews'),
      where('productId', '==', productId),
      where('approved', '==', true),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    allReviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    allReviews = [];
  }

  renderReviews();
  renderRatingSummary();
}

function renderReviews() {
  const list = document.getElementById('reviews-list');
  if (!list) return;

  if (!allReviews.length) {
    list.innerHTML = `<div class="reviews-empty">No reviews yet. Be the first to share your experience.</div>`;
    return;
  }

  list.innerHTML = allReviews.map(r => {
    const date    = r.createdAt?.toDate?.()?.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) || '';
    const stars   = renderStars(r.rating);
    return `
      <div class="review-card">
        <div class="review-card__header">
          <div>
            <div class="review-card__author">${escHtml(r.userName || 'Anonymous')}</div>
            <div class="review-card__date">${date}</div>
          </div>
          <div>
            <div class="stars">${stars}</div>
            <span class="review-card__verified">✓ Verified</span>
          </div>
        </div>
        <div class="review-card__text">${escHtml(r.text)}</div>
      </div>`;
  }).join('');
}

function renderRatingSummary() {
  if (!allReviews.length) return;

  const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
  const rounded = Math.round(avg * 10) / 10;

  setText('rating-avg', rounded.toFixed(1));
  setText('rating-count', `${allReviews.length} review${allReviews.length !== 1 ? 's' : ''}`);

  const heroStars = document.getElementById('hero-stars');
  if (heroStars) heroStars.innerHTML = renderStars(Math.round(avg));

  // Rating breakdown
  for (let i = 5; i >= 1; i--) {
    const count  = allReviews.filter(r => r.rating === i).length;
    const pct    = Math.round((count / allReviews.length) * 100);
    const fill   = document.getElementById(`bar-${i}`);
    const pctEl  = document.getElementById(`pct-${i}`);
    if (fill)  setTimeout(() => { fill.style.width = `${pct}%`; }, 600);
    if (pctEl) pctEl.textContent = `${pct}%`;
  }
}

// ── Review form ───────────────────────────────────────────────
let selectedRating = 0;

function initReviewForm() {
  // Star picker
  const stars = document.querySelectorAll('.star-picker__star');
  stars.forEach((star, i) => {
    star.addEventListener('click', () => {
      selectedRating = i + 1;
      stars.forEach((s, j) => s.classList.toggle('active', j < selectedRating));
    });
    star.addEventListener('mouseenter', () => {
      stars.forEach((s, j) => s.classList.toggle('active', j <= i));
    });
    star.addEventListener('mouseleave', () => {
      stars.forEach((s, j) => s.classList.toggle('active', j < selectedRating));
    });
  });

  // Submit
  const form = document.getElementById('review-form');
  if (form) {
    form.addEventListener('submit', submitReview);
  }
}

async function submitReview(e) {
  e.preventDefault();
  const user = getUser();
  if (!user) { showToast('Please log in to leave a review.', 'error'); return; }
  if (!selectedRating) { showToast('Please select a star rating.', 'error'); return; }

  const text = document.getElementById('review-text')?.value?.trim();
  if (!text || text.length < 10) { showToast('Review must be at least 10 characters.', 'error'); return; }

  const btn = document.getElementById('review-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

  try {
    await addDoc(collection(db, 'reviews'), {
      productId,
      userId:    user.uid,
      userName:  user.displayName || 'Anonymous',
      userPhoto: user.photoURL    || '',
      rating:    selectedRating,
      text,
      approved:  false,           // Admin must approve first
      createdAt: serverTimestamp(),
    });

    showToast('Review submitted! It will appear after approval.', 'success');
    document.getElementById('review-text').value = '';
    selectedRating = 0;
    document.querySelectorAll('.star-picker__star').forEach(s => s.classList.remove('active'));
  } catch (err) {
    showToast('Could not submit review. Please try again.', 'error');
    console.error(err);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Submit Review'; }
  }
}

function updateReviewFormState(user) {
  const form   = document.getElementById('review-form-inner');
  const prompt = document.getElementById('review-login-prompt');
  if (!form || !prompt) return;
  if (user) {
    form.style.display   = 'block';
    prompt.style.display = 'none';
  } else {
    form.style.display   = 'none';
    prompt.style.display = 'block';
  }
}

// ── Helpers ───────────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderStars(rating) {
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="star ${i < rating ? 'filled' : ''}">★</span>`
  ).join('');
}

function initCursor() {
  const dot  = document.getElementById('cursor');
  const ring = document.getElementById('cursor-ring');
  if (!dot) return;
  let mx = 0, my = 0, rx = 0, ry = 0;
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; dot.style.cssText = `left:${mx}px;top:${my}px`; });
  const loop = () => { rx += (mx-rx)*0.13; ry += (my-ry)*0.13; ring.style.cssText = `left:${rx}px;top:${ry}px`; requestAnimationFrame(loop); };
  loop();
}

function initNavScroll() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 60), { passive: true });
}

function initScrollReveal() {
  const obs = new IntersectionObserver(e => e.forEach(x => { if(x.isIntersecting) { x.target.classList.add('visible'); obs.unobserve(x.target); } }), { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

window.showToast = function(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`; t.textContent = msg;
  c.appendChild(t); setTimeout(() => t.remove(), 3500);
};
