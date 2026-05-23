// ============================================================
// home.js — Homepage Logic
// ============================================================

import { db, auth }        from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { collection, getDocs,
         query, orderBy }  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initCursor();
  initNavScroll();
  initAuthUI();
  await loadProducts();
  initReveal();
});

// ── Scroll Reveal — threshold 0 + hard fallback ──────────────
function initReveal() {
  const els = document.querySelectorAll('.reveal');

  // Hard fallback: if observer doesn't fire within 2s, show everything
  const fallback = setTimeout(() => {
    els.forEach(el => el.classList.add('visible'));
  }, 2000);

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });

  els.forEach(el => obs.observe(el));

  // If all revealed naturally, clear fallback
  const check = setInterval(() => {
    const remaining = document.querySelectorAll('.reveal:not(.visible)');
    if (remaining.length === 0) { clearTimeout(fallback); clearInterval(check); }
  }, 500);
}

// ── Auth UI — no hiding, just update state ───────────────────
function initAuthUI() {
  const loginBtn = document.getElementById('nav-login-btn');
  const adminBtn = document.getElementById('nav-admin-btn');
  const userInfo = document.getElementById('nav-user-info');

  onAuthStateChanged(auth, async (user) => {
    if (!loginBtn) return;

    if (user) {
      loginBtn.textContent = 'Log Out';
      loginBtn.onclick = async () => {
        const { logout } = await import('./auth.js');
        await logout();
        window.location.reload();
      };

      if (userInfo) {
        userInfo.textContent   = user.displayName?.split(' ')[0] || '';
        userInfo.style.display = 'inline';
      }

      // Check admin role
      try {
        const { db } = await import('./firebase-config.js');
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
        const snap = await getDoc(doc(db, 'admins', user.uid));
        if (adminBtn) adminBtn.style.display = (snap.exists() && snap.data()?.admin) ? 'inline-flex' : 'none';
      } catch {
        if (adminBtn) adminBtn.style.display = 'none';
      }

    } else {
      loginBtn.textContent = 'Login';
      loginBtn.onclick = () => { window.location.href = 'login.html'; };
      if (userInfo) userInfo.style.display = 'none';
      if (adminBtn) adminBtn.style.display = 'none';
    }
  });
}

// ── Cursor — simple and smooth ───────────────────────────────
function initCursor() {
  const dot  = document.getElementById('cursor');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  let mx = 0, my = 0;
  let rx = 0, ry = 0;

  // Dot: instant, directly in mousemove
  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  }, { passive: true });

  // Ring: smooth lerp in RAF
  function loop() {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.left = Math.round(rx) + 'px';
    ring.style.top  = Math.round(ry) + 'px';
    requestAnimationFrame(loop);
  }
  loop();

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

// ── Products ─────────────────────────────────────────────────
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
