/* =============================================================
   ARMS Music — Carrito de Compras
   Extraído y modularizado desde el index.html monolítico
   Estado: localStorage key 'arms-carrito'
============================================================= */

const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbze1iJnwYamzr43o2tDw7D0zhM9KAzLK11WROV4C5e4p6JgTlN3O3-d06R3rhi7-EVKDg/exec';
const WA_NUMBER  = '50234646667';

let carrito     = JSON.parse(localStorage.getItem('arms-carrito') || '[]');
let stockGlobal = {};

// ── PERSISTENCIA ──────────────────────────────────────────────
function guardarCarrito() {
  localStorage.setItem('arms-carrito', JSON.stringify(carrito));
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (carrito.length > 0) actualizarContador();
  cargarStock();
  checkBottomNav();
  window.addEventListener('resize', checkBottomNav);
});

// ── STOCK ─────────────────────────────────────────────────────
function bloquearBotonesHastaStock() {
  document.querySelectorAll('button.btn-agregar').forEach(btn => {
    if (!btn.disabled) {
      btn.disabled = true;
      btn.setAttribute('data-stock-pending', '1');
      btn.style.opacity = '0.45';
      btn.style.cursor  = 'wait';
    }
  });
}

function desbloquearBotonesStock() {
  document.querySelectorAll('button.btn-agregar[data-stock-pending]').forEach(btn => {
    btn.removeAttribute('data-stock-pending');
    btn.disabled      = false;
    btn.style.opacity = '1';
    btn.style.cursor  = 'pointer';
  });
}

async function cargarStock() {
  bloquearBotonesHastaStock();
  try {
    const res  = await fetch(SHEETS_URL);
    const data = await res.json();
    if (data.ok && data.productos) {
      data.productos.forEach(p => { stockGlobal[p.clave] = p.stock; });
      desbloquearBotonesStock();
      actualizarBotonesStock();
    } else {
      desbloquearBotonesStock();
    }
  } catch(e) {
    desbloquearBotonesStock();
  }
}

const STOCK_BAJO = 5;

function getStockIndicator(btn) {
  const container = btn.closest('.card-body, .card-categoria-body, .producto-acciones');
  if (!container) return null;
  let ind = container.querySelector('.stock-indicator');
  if (!ind) {
    ind = document.createElement('div');
    ind.className = 'stock-indicator';
    ind.innerHTML = '<span class="stock-dot"></span><span class="stock-text"></span>';
    const btnRow = container.querySelector('.d-flex.gap-2');
    if (btnRow) container.insertBefore(ind, btnRow);
    else container.insertBefore(ind, btn);
  }
  if (!ind.querySelector('.stock-dot')) {
    ind.innerHTML = '<span class="stock-dot"></span><span class="stock-text"></span>';
  }
  return ind;
}

function setStockIndicator(btn, stock) {
  const ind = getStockIndicator(btn);
  if (!ind) return;
  const text = ind.querySelector('.stock-text');
  if (!text) return;
  ind.classList.remove('stock-low', 'stock-out');
  ind.style.display = '';
  if (stock <= 0) {
    ind.classList.add('stock-out');
    text.textContent = 'Agotado';
  } else if (stock <= STOCK_BAJO) {
    ind.classList.add('stock-low');
    text.textContent = stock === 1 ? '¡Última unidad!' : `Solo ${stock} disponibles`;
  } else {
    ind.style.display = 'none';
  }
}

function actualizarBotonesStock() {
  document.querySelectorAll('[data-product-name]').forEach(btn => {
    const clave = btn.getAttribute('data-product-name');
    const stock = clave in stockGlobal ? stockGlobal[clave] : null;
    if (stock === null) return;
    setStockIndicator(btn, stock);
    if (stock <= 0) {
      btn.disabled      = true;
      btn.innerHTML     = 'Agotado';
      btn.style.opacity = '0.5';
      btn.style.cursor  = 'not-allowed';
      btn.onclick       = null;
    }
  });
  autoSeleccionarVarianteDisponible();
}



// ── BOTTOM NAV ────────────────────────────────────────────────
function checkBottomNav() {
  const isMobile = window.innerWidth < 992;
  const bn = document.getElementById('bottom-nav');
  const bs = document.getElementById('bottom-nav-spacer');
  if (bn) bn.style.display = isMobile ? 'block' : 'none';
  if (bs) bs.style.display = isMobile ? 'block' : 'none';
}

// ── MENÚ NAV DRAWER ───────────────────────────────────────────
function abrirMenuNav() {
  const drawer = document.getElementById('menu-nav-drawer');
  document.getElementById('menu-nav-overlay').style.display = 'block';
  drawer.style.transform  = 'translateX(0)';
  drawer.style.boxShadow  = '20px 0 60px rgba(0,0,0,0.5)';
}

function cerrarMenuNav() {
  const drawer = document.getElementById('menu-nav-drawer');
  document.getElementById('menu-nav-overlay').style.display = 'none';
  drawer.style.transform  = 'translateX(-100%)';
  drawer.style.boxShadow  = 'none';
}

function toggleAudioSubmenu() {
  const sub   = document.getElementById('audio-submenu');
  const arrow = document.getElementById('audio-submenu-arrow');
  const open  = sub.style.display === 'block';
  sub.style.display   = open ? 'none' : 'block';
  arrow.style.transform = open ? '' : 'rotate(90deg)';
}

// ── MENÚ CATEGORÍAS BOTTOM NAV ────────────────────────────────
function toggleCategoriasMenu() {
  const menu = document.getElementById('categorias-menu');
  const btn  = document.getElementById('btn-categorias-bottom');
  if (!menu) return;
  const isOpen = menu.style.display === 'block';
  menu.style.display = isOpen ? 'none' : 'block';
  if (btn) btn.style.color = isOpen ? 'rgba(255,255,255,0.5)' : 'var(--bs-primary)';
}

function cerrarCategoriasMenu() {
  const menu = document.getElementById('categorias-menu');
  const btn  = document.getElementById('btn-categorias-bottom');
  if (menu) menu.style.display = 'none';
  if (btn)  btn.style.color = 'rgba(255,255,255,0.5)';
}

document.addEventListener('click', function(e) {
  const menu = document.getElementById('categorias-menu');
  const btn  = document.getElementById('btn-categorias-bottom');
  if (!menu || menu.style.display !== 'block') return;
  if (!menu.contains(e.target) && btn && !btn.contains(e.target)) {
    cerrarCategoriasMenu();
  }
});

function navegarSeccion(sectionId) {
  cerrarCategoriasMenu();
  cerrarMenuNav();
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
}

// ── ABRIR / CERRAR DRAWER ─────────────────────────────────────
function abrirCarrito() {
  const drawer = document.getElementById('cart-drawer');
  document.getElementById('cart-overlay').style.display = 'block';
  drawer.style.transform = 'translateX(0)';
  drawer.style.boxShadow = '-20px 0 60px rgba(0,0,0,0.5)';
  const waf = document.querySelector('.whatsapp-float');
  if (waf) waf.style.display = 'none';
  document.getElementById('cart-items').scrollTop = 0;
  mostrarPantalla('cart');
  renderCarrito();
}

function cerrarCarrito() {
  const drawer = document.getElementById('cart-drawer');
  document.getElementById('cart-overlay').style.display = 'none';
  drawer.style.transform = 'translateX(100%)';
  drawer.style.boxShadow = 'none';
  const waf = document.querySelector('.whatsapp-float');
  if (waf) waf.style.display = 'flex';
  const pulse = document.getElementById('confirm-wa-pulse');
  if (pulse) {
    pulse.style.animationPlayState = 'paused';
    pulse.style.opacity    = '0';
    pulse.style.visibility = 'hidden';
  }
}

// ── PANTALLAS ─────────────────────────────────────────────────
function mostrarPantalla(pantalla) {
  document.getElementById('screen-cart').style.display     = pantalla === 'cart'     ? 'flex' : 'none';
  document.getElementById('screen-form').style.display     = pantalla === 'form'     ? 'flex' : 'none';
  document.getElementById('screen-progress').style.display = pantalla === 'progress' ? 'flex' : 'none';
  document.getElementById('screen-confirm').style.display  = pantalla === 'confirm'  ? 'flex' : 'none';

  if (pantalla === 'confirm') {
    const el      = document.getElementById('screen-confirm');
    const icon    = document.getElementById('confirm-icon');
    const title   = document.getElementById('confirm-title');
    const body    = document.getElementById('confirm-body');
    const actions = document.getElementById('confirm-actions');
    [el, icon, title, body, actions].forEach(e => {
      e.classList.remove('confirm-animate','confirm-icon-animate','confirm-title-animate','confirm-body-animate','confirm-btn-animate');
      void e.offsetWidth;
    });
    el.classList.add('confirm-animate');
    icon.classList.add('confirm-icon-animate');
    title.classList.add('confirm-title-animate');
    body.classList.add('confirm-body-animate');
    actions.classList.add('confirm-btn-animate');
  }
}

// ── ANIMACIÓN BOTÓN AGREGAR ───────────────────────────────────
function animarAgregar(btnEl, callback) {
  if (!btnEl) { callback(); return; }
  const originalWidth = btnEl.offsetWidth;
  btnEl.style.width       = originalWidth + 'px';
  btnEl.style.minWidth    = originalWidth + 'px';
  btnEl.style.transformOrigin = 'center center';

  requestAnimationFrame(() => {
    btnEl.classList.add('btn-adding');
    btnEl.innerHTML = '';
  });

  setTimeout(() => {
    btnEl.classList.remove('btn-adding');
    btnEl.classList.add('btn-success-anim');
    btnEl.innerHTML = '<i class="fa-solid fa-check"></i>';
    callback();

    setTimeout(() => {
      const dataName   = btnEl.getAttribute('data-product-name') || '';
      const nombreBase = dataName.includes(' - ') ? dataName.split(' - ')[0] : dataName;
      const total      = carrito
        .filter(i => i.nombre === nombreBase || i.nombre.startsWith(nombreBase + ' - '))
        .reduce((s, i) => s + i.cantidad, 0);

      btnEl.classList.remove('btn-success-anim');
      btnEl.style.width    = originalWidth + 'px';
      btnEl.style.minWidth = originalWidth + 'px';
      btnEl.style.position = 'relative';
      btnEl.innerHTML      = total > 0
        ? `<i class="fa-solid fa-cart-plus"></i> Agregar<span style="position:absolute;top:-8px;right:-8px;background:#ef4444;color:#fff;border-radius:50%;width:20px;height:20px;font-size:0.7rem;font-weight:700;display:flex;align-items:center;justify-content:center;line-height:1;pointer-events:none;">${total}</span>`
        : '<i class="fa-solid fa-cart-plus"></i> Agregar';

      requestAnimationFrame(() => {
        btnEl.classList.add('btn-bounce');
        btnEl.addEventListener('animationend', () => {
          btnEl.classList.remove('btn-bounce');
          btnEl.style.width    = '';
          btnEl.style.minWidth = '';
        }, { once: true });
      });
    }, 850);
  }, 320);
}

// ── AGREGAR AL CARRITO ────────────────────────────────────────
function agregarAlCarrito(nombre, precio, btnEl) {
  const stockActual = nombre in stockGlobal ? stockGlobal[nombre] : null;

  // Bloquear si el producto está agotado
  if (stockActual !== null && stockActual <= 0) {
    if (btnEl) {
      btnEl.disabled      = true;
      btnEl.innerHTML     = 'Agotado';
      btnEl.style.opacity = '0.5';
      btnEl.style.cursor  = 'not-allowed';
      btnEl.onclick       = null;
      setStockIndicator(btnEl, 0);
    }
    return;
  }

  // Bloquear si la cantidad en carrito ya alcanzó el stock disponible
  const idxActual = carrito.findIndex(i => i.nombre === nombre);
  if (stockActual !== null && idxActual > -1 && carrito[idxActual].cantidad >= stockActual) {
    if (btnEl) {
      // Mostrar aviso flotante justo encima del botón
      if (!btnEl.querySelector('.stock-max-msg')) {
        const msg = document.createElement('div');
        msg.className = 'stock-max-msg';
        msg.textContent = 'Stock máximo alcanzado';
        msg.style.cssText = 'position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:#1a1a1a;border:1px solid rgba(239,68,68,0.4);color:#f87171;font-size:0.75rem;font-weight:600;padding:0.3rem 0.65rem;border-radius:0.5rem;white-space:nowrap;pointer-events:none;z-index:10;';
        btnEl.style.position = 'relative';
        btnEl.appendChild(msg);
        setTimeout(() => msg.remove(), 2500);
      }
    }
    return;
  }

  animarAgregar(btnEl, () => {
    const imagen = btnEl ? (btnEl.getAttribute('data-img') || '') : '';
    const idx = carrito.findIndex(i => i.nombre === nombre);
    if (idx > -1) {
      carrito[idx].cantidad++;
      if (imagen && !carrito[idx].imagen) carrito[idx].imagen = imagen;
    } else {
      carrito.push({ nombre, precio, cantidad: 1, imagen });
    }
    guardarCarrito();
    actualizarContador();
    mostrarToast();
  });
}

// ── ACTUALIZAR CONTADOR ───────────────────────────────────────
function actualizarContador() {
  const total = carrito.reduce((s, i) => s + i.cantidad, 0);
  ['cart-count-desktop', 'cart-count-mobile', 'cart-count-bottom'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = total; el.style.display = total > 0 ? 'inline-flex' : 'none'; }
  });
  const pulse = document.getElementById('cart-pulse');
  if (pulse) pulse.style.display = total > 0 ? 'block' : 'none';
  actualizarBotonesCarrito();
}

// ── ACTUALIZAR BOTONES CARRITO ────────────────────────────────
function actualizarBotonesCarrito() {
  // 1) Botones de variante
  document.querySelectorAll('[id^="var-"]').forEach(varGroup => {
    varGroup.querySelectorAll('button[onclick*="seleccionarVariante"]').forEach(btn => {
      const match = btn.getAttribute('onclick').match(/seleccionarVariante\(this,\s*'([^']+)',\s*'([^']+)'/);
      if (!match) return;
      const fullName = match[1] + ' - ' + match[2];
      const count    = (carrito.find(i => i.nombre === fullName) || {}).cantidad || 0;
      const existing = btn.querySelector('.var-badge');
      if (existing) existing.remove();
      if (count > 0) {
        btn.style.position = 'relative';
        const badge = document.createElement('span');
        badge.className = 'var-badge';
        badge.style.cssText = 'position:absolute;top:-7px;right:-7px;background:#ef4444;color:#fff;border-radius:50%;width:16px;height:16px;font-size:0.65rem;font-weight:700;display:flex;align-items:center;justify-content:center;line-height:1;pointer-events:none;';
        badge.textContent = count;
        btn.appendChild(badge);
      }
    });
  });

  // 2) Botón Agregar con id btn-add-
  document.querySelectorAll('button.btn-agregar[id^="btn-add-"]').forEach(btn => {
    if (btn.classList.contains('btn-adding') || btn.classList.contains('btn-success-anim')) return;
    const dataName   = btn.getAttribute('data-product-name') || '';
    const nombreBase = dataName.includes(' - ') ? dataName.split(' - ')[0] : dataName;
    const total = carrito
      .filter(i => i.nombre === nombreBase || i.nombre.startsWith(nombreBase + ' - '))
      .reduce((s, i) => s + i.cantidad, 0);
    btn.style.position = 'relative';
    btn.innerHTML = total > 0
      ? `<i class="fa-solid fa-cart-plus"></i> Agregar<span style="position:absolute;top:-8px;right:-8px;background:#ef4444;color:#fff;border-radius:50%;width:20px;height:20px;font-size:0.7rem;font-weight:700;display:flex;align-items:center;justify-content:center;line-height:1;pointer-events:none;">${total}</span>`
      : '<i class="fa-solid fa-cart-plus"></i> Agregar';
  });

  // 3) Botones Agregar sin variantes
  document.querySelectorAll('button.btn-agregar:not([id^="btn-add-"])').forEach(btn => {
    if (btn.classList.contains('btn-adding') || btn.classList.contains('btn-success-anim')) return;
    const nombre = btn.getAttribute('data-product-name') || '';
    const count  = (carrito.find(i => i.nombre === nombre) || {}).cantidad || 0;
    btn.style.position = 'relative';
    btn.innerHTML = count > 0
      ? `<i class="fa-solid fa-cart-plus"></i> Agregar<span style="position:absolute;top:-8px;right:-8px;background:#ef4444;color:#fff;border-radius:50%;width:20px;height:20px;font-size:0.7rem;font-weight:700;display:flex;align-items:center;justify-content:center;line-height:1;pointer-events:none;">${count}</span>`
      : '<i class="fa-solid fa-cart-plus"></i> Agregar';
  });
}

// ── RENDER CARRITO ────────────────────────────────────────────
function renderCarrito() {
  const lista   = document.getElementById('cart-list');
  const empty   = document.getElementById('cart-empty');
  const footer  = document.getElementById('cart-footer');
  const totalEl = document.getElementById('cart-total');

  if (carrito.length === 0) {
    empty.style.display  = 'block';
    lista.style.display  = 'none';
    footer.style.display = 'none';
    return;
  }

  empty.style.display  = 'none';
  lista.style.display  = 'block';
  footer.style.display = 'block';

  lista.innerHTML = carrito.map((item, idx) => `
    <div style="padding:0.85rem 0; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; gap:0.75rem; align-items:flex-start;">
      <div style="width:60px; height:60px; min-width:60px; border-radius:0.5rem; overflow:hidden; background:rgba(255,255,255,0.05); flex-shrink:0;">
        ${item.imagen
          ? `<img src="${item.imagen}" alt="${item.nombre}" style="width:100%; height:100%; object-fit:cover;" loading="lazy" onerror="this.style.display='none'">`
          : ''}
      </div>
      <div style="flex:1; min-width:0;">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:0.5rem; margin-bottom:0.5rem;">
          <p style="margin:0; font-weight:600; color:#fff; font-size:0.9rem; line-height:1.3; flex:1; word-break:break-word;">${item.nombre}</p>
          <button onclick="eliminarItem(${idx})" aria-label="Eliminar ${item.nombre}" style="
            background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1);
            border-radius:50%; width:24px; height:24px; min-width:24px;
            color:rgba(255,255,255,0.5); cursor:pointer; font-size:0.8rem;
            display:flex; align-items:center; justify-content:center;
            transition:background .15s ease, color .15s ease; flex-shrink:0;
          " onmouseover="this.style.background='rgba(239,68,68,0.2)';this.style.color='#f87171'"
             onmouseout="this.style.background='rgba(255,255,255,0.07)';this.style.color='rgba(255,255,255,0.5)'">✕</button>
        </div>
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <span style="color:rgba(255,255,255,0.45); font-size:0.8rem; flex:1;">Q${item.precio.toLocaleString()} c/u</span>
          <button onclick="cambiarCantidad(${idx}, -1)" style="width:26px; height:26px; border-radius:50%; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); color:#fff; cursor:pointer; font-size:1rem; display:flex; align-items:center; justify-content:center; flex-shrink:0;">−</button>
          <span style="min-width:18px; text-align:center; color:#fff; font-weight:600; font-size:0.9rem;">${item.cantidad}</span>
          <button onclick="cambiarCantidad(${idx}, 1)"  style="width:26px; height:26px; border-radius:50%; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); color:#fff; cursor:pointer; font-size:1rem; display:flex; align-items:center; justify-content:center; flex-shrink:0;">+</button>
          <p style="margin:0; font-weight:700; color:#fff; min-width:52px; text-align:right; font-size:0.92rem; flex-shrink:0;">Q${(item.precio * item.cantidad).toLocaleString()}</p>
        </div>
      </div>
    </div>
  `).join('');

  const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  totalEl.textContent = 'Q' + total.toLocaleString();
}

// ── CAMBIAR CANTIDAD ──────────────────────────────────────────
function cambiarCantidad(idx, delta) {
  if (delta > 0) {
    const clave = carrito[idx].nombre;
    const stockActual = clave in stockGlobal ? stockGlobal[clave] : null;
    if (stockActual !== null && carrito[idx].cantidad >= stockActual) {
      const msgEl = document.getElementById('cart-stock-msg');
      if (msgEl) {
        msgEl.textContent = `Stock máximo alcanzado para ${clave.split(' - ')[0]}`;
        msgEl.style.display = 'block';
        setTimeout(() => { msgEl.style.display = 'none'; }, 2500);
      }
      return;
    }
  }
  carrito[idx].cantidad += delta;
  if (carrito[idx].cantidad <= 0) carrito.splice(idx, 1);
  guardarCarrito();
  actualizarContador();
  renderCarrito();
}

function eliminarItem(idx) {
  carrito.splice(idx, 1);
  guardarCarrito();
  actualizarContador();
  renderCarrito();
}

// ── VER TODO / VER MENOS ──────────────────────────────────────
function verTodo(sectionId) {
  document.querySelectorAll(`.extra-card[data-section="${sectionId}"]`).forEach(el => {
    el.style.display = '';
    el.querySelectorAll('[data-lazy-card]').forEach(card => {
      card.classList.add('animation-slide-up');
      card.style.opacity   = '1';
      card.style.transform = 'none';
    });
  });
  const wrap      = document.getElementById('ver-todo-wrap-' + sectionId);
  const menosWrap = document.getElementById('ver-menos-wrap-' + sectionId);
  if (wrap)      wrap.style.display      = 'none';
  if (menosWrap) menosWrap.style.display = '';
}

function verMenos(sectionId) {
  document.querySelectorAll(`.extra-card[data-section="${sectionId}"]`).forEach(el => {
    el.style.display = 'none';
  });
  const wrap      = document.getElementById('ver-todo-wrap-' + sectionId);
  const menosWrap = document.getElementById('ver-menos-wrap-' + sectionId);
  if (wrap)      wrap.style.display      = '';
  if (menosWrap) menosWrap.style.display = 'none';
  const section = document.getElementById(sectionId);
  if (section) {
    const navbar = document.querySelector('.navbar-floating');
    const bar    = document.getElementById('cat-tabs-bar');
    const navH   = navbar ? navbar.offsetHeight : 56;
    const barH   = bar    ? bar.offsetHeight    : 48;
    const top    = section.getBoundingClientRect().top + window.scrollY - navH - barH - 8;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }
}

// ── TOAST ─────────────────────────────────────────────────────
function mostrarToast() {
  const t = document.getElementById('toast-add');
  if (!t) return;
  t.style.transform = 'translateX(-50%) translateY(0)';
  setTimeout(() => { t.style.transform = 'translateX(-50%) translateY(200px)'; }, 2200);
}

// ── VARIANTES ─────────────────────────────────────────────────
function seleccionarVariante(btn, nombreBase, variante, precio) {
  const varGroup = btn.closest('[id^="var-"]');
  varGroup.querySelectorAll('button').forEach(b => b.classList.remove('var-btn-active'));
  btn.classList.add('var-btn-active');

  varGroup.querySelectorAll('button[onclick*="seleccionarVariante"]').forEach(b => {
    const m = b.getAttribute('onclick').match(/seleccionarVariante\(this,\s*'([^']+)',\s*'([^']+)'/);
    if (!m) return;
    const fn    = m[1] + ' - ' + m[2];
    const count = (carrito.find(i => i.nombre === fn) || {}).cantidad || 0;
    const old   = b.querySelector('.var-badge');
    if (old) old.remove();
    if (count > 0) {
      b.style.position = 'relative';
      const badge = document.createElement('span');
      badge.className = 'var-badge';
      badge.style.cssText = 'position:absolute;top:-7px;right:-7px;background:#ef4444;color:#fff;border-radius:50%;width:16px;height:16px;font-size:0.65rem;font-weight:700;display:flex;align-items:center;justify-content:center;line-height:1;pointer-events:none;';
      badge.textContent = count;
      b.appendChild(badge);
    }
  });

  const cardId   = nombreBase.replace(/ /g, '-').replace(/\//g, '-');
  // Buscar botón agregar por btn-add- o btn-cat- (páginas de categoría)
  const btnAdd   = document.getElementById('btn-add-' + cardId)
               || document.getElementById('btn-cat-' + cardId);
  const fullName = nombreBase + ' - ' + variante;
  const stockVal = fullName in stockGlobal ? stockGlobal[fullName] : null;
  const agotado  = stockVal !== null && stockVal <= 0;

  if (btnAdd) {
    btnAdd.setAttribute('data-product-name', fullName);
    // Propagar imagen de la variante seleccionada al botón Agregar
    const imgVariante = btn.getAttribute('data-img');
    if (imgVariante) btnAdd.setAttribute('data-img', imgVariante);
    if (agotado) {
      btnAdd.disabled      = true;
      btnAdd.innerHTML     = 'Agotado';
      btnAdd.style.opacity = '0.5';
      btnAdd.style.cursor  = 'not-allowed';
      btnAdd.onclick       = null;
    } else {
      const totalVariantes = carrito
        .filter(i => i.nombre === nombreBase || i.nombre.startsWith(nombreBase + ' - '))
        .reduce((s, i) => s + i.cantidad, 0);
      btnAdd.disabled       = false;
      btnAdd.style.position = 'relative';
      btnAdd.innerHTML      = totalVariantes > 0
        ? `<i class="fa-solid fa-cart-plus"></i> Agregar<span style="position:absolute;top:-8px;right:-8px;background:#ef4444;color:#fff;border-radius:50%;width:20px;height:20px;font-size:0.7rem;font-weight:700;display:flex;align-items:center;justify-content:center;line-height:1;pointer-events:none;">${totalVariantes}</span>`
        : '<i class="fa-solid fa-cart-plus"></i> Agregar';
      btnAdd.classList.remove('btn-sm');
      btnAdd.classList.add('btn', 'btn-agregar');
      btnAdd.style.opacity  = '1';
      btnAdd.style.cursor   = 'pointer';
      btnAdd.onclick        = () => agregarAlCarrito(fullName, precio, btnAdd);
    }
    if (stockVal !== null) setStockIndicator(btnAdd, stockVal);
  }
}

function autoSeleccionarVarianteDisponible() {
  document.querySelectorAll('[id^="var-"]').forEach(varGroup => {
    const varBtns = [...varGroup.querySelectorAll('button[onclick*="seleccionarVariante"]')];
    if (!varBtns.length) return;
    const activoActual = varGroup.querySelector('.var-btn-active');
    if (!activoActual) return;
    const matchActivo = activoActual.getAttribute('onclick')
      .match(/seleccionarVariante\(this,\s*'([^']+)',\s*'([^']+)'/);
    if (!matchActivo) return;
    const claveActiva = matchActivo[1] + ' - ' + matchActivo[2];
    const stockActivo = stockGlobal[claveActiva];
    if (stockActivo === undefined || stockActivo > 0) return;

    const primerDisponible = varBtns.find(btn => {
      const m = btn.getAttribute('onclick')
        .match(/seleccionarVariante\(this,\s*'([^']+)',\s*'([^']+)',\s*([\d.]+)/);
      if (!m) return false;
      const clave = m[1] + ' - ' + m[2];
      return !(clave in stockGlobal) || stockGlobal[clave] > 0;
    });

    if (primerDisponible) {
      const m = primerDisponible.getAttribute('onclick')
        .match(/seleccionarVariante\(this,\s*'([^']+)',\s*'([^']+)',\s*([\d.]+)/);
      if (m) seleccionarVariante(primerDisponible, m[1], m[2], parseFloat(m[3]));
    }
  });
}

// ── HERO SLIDER ───────────────────────────────────────────────
(function() {
  const slides = Array.from(document.querySelectorAll('#hero-slider .hero-slide'));
  if (slides.length < 2) return;
  const total = slides.length;
  let current = 0;
  const container = document.getElementById('hero-slider');
  slides.forEach(s => { s.style.transition = 'none'; s.style.transform = 'translateX(0%)'; s.style.visibility = 'hidden'; });
  requestAnimationFrame(() => {
    const maxH = Math.max(...slides.map(s => s.offsetHeight));
    container.style.height = maxH + 'px';
    slides.forEach((s, i) => { s.style.visibility = ''; s.style.transform = i === 0 ? 'translateX(0%)' : 'translateX(100%)'; });
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

// ── INTERSECTION OBSERVERS ────────────────────────────────────
const lazyCards = document.querySelectorAll('[data-lazy-card]');
const isMobile  = window.innerWidth < 768;

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

const headerObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('header-revealed');
      headerObserver.unobserve(entry.target);
    }
  });
}, { rootMargin: '0px 0px -10% 0px', threshold: 0.2 });

document.querySelectorAll('[data-section-header]').forEach(h => headerObserver.observe(h));

// ── CAT TABS ─────────────────────────────────────────────────
(function() {
  const bar  = document.getElementById('cat-tabs-bar');
  const tabs = document.querySelectorAll('.cat-tab');
  if (!bar || !tabs.length) return;

  function recalcTop() {
    const navbar = document.querySelector('.navbar-floating');
    if (!navbar) return;
    const navHeight = navbar.offsetHeight;
    const navTop    = 6;
    const gap       = 6;
    bar.style.top   = (navTop + navHeight + gap) + 'px';
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
})();
