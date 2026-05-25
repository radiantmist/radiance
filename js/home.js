// ============================================================
// home.js — Homepage Logic (GSAP Enhanced)
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
  initGSAPAnimations();  // NEW: GSAP replaces basic CSS reveals
});

// ── GSAP ScrollTrigger Animations ─────────────────────────────
function initGSAPAnimations() {
  // Check if GSAP is loaded (loaded via CDN in HTML)
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.warn('GSAP not loaded, falling back to CSS reveals');
    initCSSRevealFallback();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // 1. Hero text staggered entrance (already has CSS animation, but GSAP makes it smoother)
  const heroTl = gsap.timeline();
  heroTl
    .from('.hero__eyebrow', { y: 30, opacity: 0, duration: 0.8, ease: 'power3.out' })
    .from('.hero__title', { y: 50, opacity: 0, duration: 1, ease: 'power3.out' }, '-=0.5')
    .from('.hero__desc', { y: 30, opacity: 0, duration: 0.8, ease: 'power3.out' }, '-=0.6')
    .from('.hero__actions', { y: 20, opacity: 0, duration: 0.6, ease: 'power3.out' }, '-=0.4');

  // 2. About section — image parallax + text reveal
  gsap.to('.about__visual img', {
    yPercent: -8,
    ease: 'none',
    scrollTrigger: {
      trigger: '.about',
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1
    }
  });

  gsap.from('.about__content', {
    y: 60,
    opacity: 0,
    duration: 1,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.about',
      start: 'top 75%',
      toggleActions: 'play none none none'
    }
  });

  // 3. Product cards — staggered scroll reveal
  gsap.from('.product-card', {
    y: 80,
    opacity: 0,
    duration: 0.9,
    stagger: 0.15,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '#products-scroll',
      start: 'top 80%',
      toggleActions: 'play none none none'
    }
  });

  // 4. Statement section — quote reveal
  gsap.from('.statement__quote', {
    y: 50,
    opacity: 0,
    duration: 1.2,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.statement',
      start: 'top 70%',
      toggleActions: 'play none none none'
    }
  });

  gsap.from('.statement__body', {
    y: 40,
    opacity: 0,
    duration: 1,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.statement__body',
      start: 'top 80%',
      toggleActions: 'play none none none'
    }
  });

  // 5. Stats counter animation
  const statValues = document.querySelectorAll('.s-num__val');
  statValues.forEach(stat => {
    const finalValue = stat.textContent;
    const numMatch = finalValue.match(/[0-9]+/);
    if (numMatch) {
      const targetNum = parseInt(numMatch[0]);
      const obj = { val: 0 };
      gsap.to(obj, {
        val: targetNum,
        duration: 2,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: stat,
          start: 'top 85%',
          toggleActions: 'play none none none'
        },
        onUpdate: () => {
          stat.innerHTML = stat.innerHTML.replace(/[0-9]+/, Math.round(obj.val));
        }
      });
    }
  });

  // 6. Contact cards — staggered entrance
  gsap.from('.contact-card', {
    y: 40,
    opacity: 0,
    duration: 0.8,
    stagger: 0.12,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.contact__cards',
      start: 'top 85%',
      toggleActions: 'play none none none'
    }
  });

  // 7. Marquee speed boost on scroll
  let marqueeSpeed = 1;
  const marqueeTrack = document.querySelector('.marquee__track');
  if (marqueeTrack) {
    ScrollTrigger.create({
      trigger: '.marquee',
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        const velocity = Math.abs(self.getVelocity()) / 1000;
        marqueeSpeed = 1 + Math.min(velocity * 0.5, 2);
        marqueeTrack.style.animationDuration = `${26 / marqueeSpeed}s`;
      }
    });
  }
}

// ── CSS Reveal Fallback (if GSAP fails to load) ──────────────
function initCSSRevealFallback() {
  const els = document.querySelectorAll('.reveal');
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

// ── Cursor — simple and smooth (DISABLED on touch devices) ───
function initCursor() {
  // FIX: Don't run on touch devices (saves battery, prevents issues)
  if (window.matchMedia('(pointer: coarse)').matches) {
    document.body.style.cursor = 'auto';
    const dot = document.getElementById('cursor');
    const ring = document.getElementById('cursor-ring');
    if (dot) dot.style.display = 'none';
    if (ring) ring.style.display = 'none';
    return;
  }

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

  // FIX: Show loading state properly, then render
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
