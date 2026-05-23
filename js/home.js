// ============================================================
// home.js — Homepage Logic
// Cursor, scroll effects, load products from Firestore
// ============================================================

import { db }                from './firebase-config.js';
import { onAuthChange }      from './auth.js';
import { collection, getDocs,
         query, orderBy }    from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initCursor();
  initNavScroll();
  initScrollReveal();
  loadProducts();
});

// ── Custom Cursor ────────────────────────────────────────────
function initCursor() {
  const dot  = document.getElementById('cursor');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  let mx = 0, my = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  });

  function animateRing() {
    rx += (mx - rx) * 0.13;
    ry += (my - ry) * 0.13;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(animateRing);
  }
  animateRing();

  document.querySelectorAll('a, button, .product-card').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });
}

// ── Navbar scroll behaviour ──────────────────────────────────
function initNavScroll() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
}

// ── Scroll reveal ────────────────────────────────────────────
function initScrollReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

// ── Load products ────────────────────────────────────────────
const FALLBACK_PRODUCTS = [
  { id: 'bloom',  num: 'No. 01', name: 'Bloom',  scent: 'Rose · Jasmine · Soft Musk',        badge: 'New Arrival', badgeType: 'gold'  },
  { id: 'dusk',   num: 'No. 02', name: 'Dusk',   scent: 'Oud · Sandalwood · Vanilla',         badge: '',            badgeType: ''      },
  { id: 'soleil', num: 'No. 03', name: 'Soleil', scent: 'Citrus · White Tea · Cedar',         badge: '',            badgeType: ''      },
  { id: 'sage',   num: 'No. 04', name: 'Sage',   scent: 'Eucalyptus · Green Tea · Mint',      badge: 'New',         badgeType: 'green' },
  { id: 'noir',   num: 'No. 05', name: 'Noir',   scent: 'Black Rose · Amber · Vetiver',       badge: 'Coming Soon', badgeType: 'gold'  },
];

async function loadProducts() {
  const grid = document.getElementById('products-scroll');
  if (!grid) return;

  let products = FALLBACK_PRODUCTS;

  try {
    const snap = await getDocs(query(collection(db, 'products'), orderBy('order')));
    if (!snap.empty) {
      products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  } catch (err) {
    // Firebase not configured yet — use fallback
    console.info('Using fallback product data:', err.message);
  }

  grid.innerHTML = products.map(renderCard).join('');

  // re-attach cursor listeners on cards
  grid.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    card.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    card.addEventListener('click', () => {
      window.location.href = `product.html?id=${card.dataset.id}`;
    });
  });
}

function renderCard(p) {
  const badgeHtml = p.badge
    ? `<span class="product-card__badge badge--${p.badgeType || 'gold'}">${p.badge}</span>`
    : '';

  return `
    <div class="product-card" data-id="${p.id}">
      <div class="product-card__img">
        <div class="product-card__gradient"></div>
        <div class="product-card__overlay"></div>
        ${badgeHtml}
      </div>
      <div class="product-card__info">
        <div class="product-card__num">${p.num || ''}</div>
        <div class="product-card__name">${p.name}</div>
        <div class="product-card__scent">${p.scent}</div>
        <div class="product-card__action">View Candle</div>
      </div>
    </div>`;
}

// ── Toast (shared utility) ───────────────────────────────────
window.showToast = function(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3500);
};
