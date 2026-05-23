// ============================================================
// home.js — Homepage Logic
// ============================================================

import { db }             from './firebase-config.js';
import { auth }           from './firebase-config.js';
import { onAuthChange }   from './auth.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { collection, getDocs,
         query, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── Global reveal observer (reusable) ────────────────────────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.05 }); // lowered from 0.1 — fires earlier

function observeReveal() {
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => revealObserver.observe(el));
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initCursor();
  initNavScroll();
  initAuthUI();
  observeReveal();         // observe static elements immediately
  await loadProducts();    // then observe newly added cards
  observeReveal();         // pick up dynamically added .reveal elements
});

// ── Auth UI — fix login flicker ──────────────────────────────
function initAuthUI() {
  const loginBtn  = document.getElementById('nav-login-btn');
  const adminBtn  = document.getElementById('nav-admin-btn');
  const userInfo  = document.getElementById('nav-user-info');

  // Hide everything until auth resolves
  if (loginBtn) loginBtn.style.visibility = 'hidden';

  onAuthStateChanged(auth, async (user) => {
    if (loginBtn) loginBtn.style.visibility = 'visible';

    if (user) {
      if (loginBtn) {
        loginBtn.textContent   = 'Log Out';
        loginBtn.dataset.state = 'loggedIn';
        loginBtn.onclick = async () => {
          const { logout } = await import('./auth.js');
          await logout();
        };
      }
      if (userInfo) {
        userInfo.textContent    = user.displayName?.split(' ')[0] || '';
        userInfo.style.display  = 'inline';
      }

      // check admin
      try {
        const { getIsAdmin } = await import('./auth.js');
        // give auth.js a moment to resolve the admin check
        setTimeout(() => {
          if (adminBtn) adminBtn.style.display = getIsAdmin() ? 'inline-flex' : 'none';
        }, 800);
      } catch { /* */ }

    } else {
      if (loginBtn) {
        loginBtn.textContent   = 'Login';
        loginBtn.dataset.state = 'loggedOut';
        loginBtn.onclick = () => { window.location.href = 'login.html'; };
      }
      if (userInfo)  userInfo.style.display  = 'none';
      if (adminBtn)  adminBtn.style.display   = 'none';
    }
  });
}

// ── Custom Cursor — smoother via transform ───────────────────
function initCursor() {
  const dot  = document.getElementById('cursor');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  let mx = 0, my = 0;
  let rx = 0, ry = 0;
  let rafId;

  // Move dot instantly — no lag
  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.transform = `translate(calc(${mx}px - 50%), calc(${my}px - 50%))`;
  }, { passive: true });

  // Ring follows with smooth lerp
  function animateRing() {
    rx += (mx - rx) * 0.15;
    ry += (my - ry) * 0.15;
    ring.style.transform = `translate(calc(${rx}px - 50%), calc(${ry}px - 50%))`;
    rafId = requestAnimationFrame(animateRing);
  }
  animateRing();

  // Remove left/top positioning — use transform only
  dot.style.left  = '0';
  dot.style.top   = '0';
  ring.style.left = '0';
  ring.style.top  = '0';

  addCursorHoverListeners();
}

function addCursorHoverListeners() {
  document.querySelectorAll('a, button, .product-card').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });
}

// ── Navbar scroll ────────────────────────────────────────────
function initNavScroll() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
}

// ── Load products ────────────────────────────────────────────
const FALLBACK_PRODUCTS = [
  { id: 'bloom',  num: 'No. 01', name: 'Bloom',  scent: 'Rose · Jasmine · Soft Musk',   badge: 'New Arrival', badgeType: 'gold'  },
  { id: 'dusk',   num: 'No. 02', name: 'Dusk',   scent: 'Oud · Sandalwood · Vanilla',    badge: '',            badgeType: ''      },
  { id: 'soleil', num: 'No. 03', name: 'Soleil', scent: 'Citrus · White Tea · Cedar',    badge: '',            badgeType: ''      },
  { id: 'sage',   num: 'No. 04', name: 'Sage',   scent: 'Eucalyptus · Green Tea · Mint', badge: 'New',         badgeType: 'green' },
  { id: 'noir',   num: 'No. 05', name: 'Noir',   scent: 'Black Rose · Amber · Vetiver',  badge: 'Coming Soon', badgeType: 'gold'  },
];

async function loadProducts() {
  const grid = document.getElementById('products-scroll');
  if (!grid) return;

  let products = FALLBACK_PRODUCTS;

  try {
    const snap = await getDocs(query(collection(db, 'products'), orderBy('order')));
    if (!snap.empty) products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.info('Using fallback products:', err.message);
  }

  grid.innerHTML = products.map(renderCard).join('');

  // Cursor hover on cards
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

// ── Toast ────────────────────────────────────────────────────
window.showToast = function(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
};
