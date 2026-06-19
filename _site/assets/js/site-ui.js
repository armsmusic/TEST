/* =============================================================
   ARMS Music — site-ui.js
   UI del sitio — todo lo que no es carrito ni checkout
   - Navbar, menú drawer, bottom nav
   - Hero slider
   - Intersection observers
   - Cat tabs
   - Buscador (panel de búsqueda)
============================================================= */

document.addEventListener('DOMContentLoaded', () => {

  // ── BOTTOM NAV ──────────────────────────────────────────────
  function checkBottomNav() {
    const isMobile = window.innerWidth < 992;
    const bn = document.getElementById('bottom-nav');
    const bs = document.getElementById('bottom-nav-spacer');
    if (bn) bn.style.display = isMobile ? 'block' : 'none';
    if (bs) bs.style.display = isMobile ? 'block' : 'none';
  }
  checkBottomNav();
  window.addEventListener('resize', checkBottomNav, { passive: true });

  // ── MENÚ NAV DRAWER ─────────────────────────────────────────
  window.abrirMenuNav = function() {
    const drawer = document.getElementById('menu-nav-drawer');
    if (!drawer) return;
    document.getElementById('menu-nav-overlay').style.display = 'block';
    drawer.style.transform  = 'translateX(0)';
    drawer.style.boxShadow  = '20px 0 60px rgba(0,0,0,0.5)';
  };

  window.cerrarMenuNav = function() {
    const drawer = document.getElementById('menu-nav-drawer');
    if (!drawer) return;
    document.getElementById('menu-nav-overlay').style.display = 'none';
    drawer.style.transform  = 'translateX(-100%)';
    drawer.style.boxShadow  = 'none';
  };

  window.toggleAudioSubmenu = function() {
    const sub   = document.getElementById('audio-submenu');
    const arrow = document.getElementById('audio-submenu-arrow');
    if (!sub) return;
    const open  = sub.style.display === 'block';
    sub.style.display     = open ? 'none' : 'block';
    arrow.style.transform = open ? '' : 'rotate(90deg)';
  };

  // ── MENÚ CATEGORÍAS BOTTOM NAV ───────────────────────────────
  window.toggleCategoriasMenu = function() {
    const menu = document.getElementById('categorias-menu');
    const btn  = document.getElementById('btn-categorias-bottom');
    if (!menu) return;
    const isOpen = menu.style.display === 'block';
    menu.style.display = isOpen ? 'none' : 'block';
    if (btn) btn.style.color = isOpen ? 'rgba(255,255,255,0.5)' : 'var(--bs-primary)';
  };

  window.cerrarCategoriasMenu = function() {
    const menu = document.getElementById('categorias-menu');
    const btn  = document.getElementById('btn-categorias-bottom');
    if (menu) menu.style.display = 'none';
    if (btn)  btn.style.color = 'rgba(255,255,255,0.5)';
  };

  document.addEventListener('click', function(e) {
    const menu = document.getElementById('categorias-menu');
    const btn  = document.getElementById('btn-categorias-bottom');
    if (!menu || menu.style.display !== 'block') return;
    if (!menu.contains(e.target) && btn && !btn.contains(e.target)) {
      window.cerrarCategoriasMenu();
    }
  });

  window.navegarSeccion = function(sectionId) {
    window.cerrarCategoriasMenu();
    window.cerrarMenuNav();
    const bar    = document.getElementById('cat-tabs-bar');
    const target = document.getElementById(sectionId);
    if (!target) return;
    const navbar     = document.querySelector('.navbar-floating');
    const barHeight  = bar    ? bar.offsetHeight    : 48;
    const navbarH    = navbar ? navbar.offsetHeight : 56;
    const targetTop  = target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: targetTop - barHeight - navbarH - 8, behavior: 'smooth' });
    const tabs = document.querySelectorAll('.cat-tab');
    tabs.forEach(t => t.classList.remove('active'));
    const activeTab = document.querySelector(`.cat-tab[data-section="${sectionId}"]`);
    if (activeTab) {
      activeTab.classList.add('active');
      activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  // ── HERO SLIDER ─────────────────────────────────────────────
  (function() {
    const slides = Array.from(document.querySelectorAll('#hero-slider .hero-slide'));
    if (slides.length < 2) return;
    const total     = slides.length;
    let   current   = 0;
    const container = document.getElementById('hero-slider');

    slides.forEach(s => {
      s.style.transition  = 'none';
      s.style.transform   = 'translateX(0%)';
      s.style.visibility  = 'hidden';
    });

    requestAnimationFrame(() => {
      const maxH = Math.max(...slides.map(s => s.offsetHeight));
      container.style.height = maxH + 'px';
      slides.forEach((s, i) => {
        s.style.visibility = '';
        s.style.transform  = i === 0 ? 'translateX(0%)' : 'translateX(100%)';
      });
    });

    setInterval(() => {
      const next = (current + 1) % total;
      slides[current].style.transition = 'transform 0.55s cubic-bezier(.4,0,.2,1)';
      slides[next].style.transition    = 'transform 0.55s cubic-bezier(.4,0,.2,1)';
      slides[current].style.transform  = 'translateX(-100%)';
      slides[next].style.transform     = 'translateX(0%)';
      setTimeout(() => {
        slides[current].style.transition = 'none';
        slides[current].style.transform  = 'translateX(100%)';
        current = next;
      }, 600);
    }, 4500);
  })();

  // ── INTERSECTION OBSERVERS ───────────────────────────────────
  const lazyCards = document.querySelectorAll('[data-lazy-card]');
  const isMobile  = window.innerWidth < 768;

  if (lazyCards.length) {
    const cardObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const siblings = [...(entry.target.closest('.row')?.querySelectorAll('[data-lazy-card]') || [])];
          const index    = siblings.indexOf(entry.target);
          const delay    = isMobile ? 0 : index * 100;
          setTimeout(() => {
            entry.target.classList.add('animation-slide-up');
            entry.target.style.opacity   = '1';
            entry.target.style.transform = 'none';
          }, delay);
          cardObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '50px 0px', threshold: 0.01 });

    lazyCards.forEach(card => cardObserver.observe(card));
  }

  const headerObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('header-revealed');
        headerObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.2 });

  document.querySelectorAll('[data-section-header]').forEach(h => headerObserver.observe(h));

  // ── CAT TABS ────────────────────────────────────────────────
  (function() {
    const bar  = document.getElementById('cat-tabs-bar');
    const tabs = document.querySelectorAll('.cat-tab');
    if (!bar || !tabs.length) return;

    function recalcTop() {
      const navbar = document.querySelector('.navbar-floating');
      if (!navbar) return;
      bar.style.top = (6 + navbar.offsetHeight + 6) + 'px';
    }
    recalcTop();
    window.addEventListener('resize', recalcTop, { passive: true });

    window.addEventListener('scroll', () => {
      bar.classList.toggle('scrolled', window.scrollY > 160);
    }, { passive: true });

    tabs.forEach(tab => {
      tab.addEventListener('click', e => {
        e.preventDefault();
        const targetId = tab.getAttribute('href').replace('#', '');
        const target   = document.getElementById(targetId);
        if (!target) return;
        const navbar2   = document.querySelector('.navbar-floating');
        const navH2     = navbar2 ? navbar2.offsetHeight : 56;
        const targetTop = target.getBoundingClientRect().top + window.scrollY;
        const scrollTo  = targetTop - bar.offsetHeight - navH2 - 8;
        window.scrollTo({ top: scrollTo, behavior: 'smooth' });
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      });
    });

    const sectionIds = ['inears', 'monitores', 'audio', 'accesorios-inears'];
    const sections   = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

    if (sections.length) {
      const tabObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id     = entry.target.id;
            const active = document.querySelector(`.cat-tab[data-section="${id}"]`);
            if (!active) return;
            tabs.forEach(t => t.classList.remove('active'));
            active.classList.add('active');
            active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        });
      }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });

      sections.forEach(s => tabObserver.observe(s));
    }
  })();

});
