/* =============================================================
   ARMS Music — cart-store.js
   Estado centralizado del carrito
   - Lee/escribe localStorage key 'arms-carrito'
   - Maneja stock desde Google Sheets
   - Publica eventos DOM para que cart-drawer.js reaccione
   - NO tiene dependencias externas
============================================================= */

const STOCK_URL = '/api/stock';
const PEDIDO_URL = '/api/pedido';
const WA_NUMBER  = '50234646667';

let carrito     = JSON.parse(localStorage.getItem('arms-carrito') || '[]');
let stockGlobal = {};

// ── PERSISTENCIA ──────────────────────────────────────────────
function guardarCarrito() {
  localStorage.setItem('arms-carrito', JSON.stringify(carrito));
}

// ── EVENTOS DOM — comunicación con cart-drawer.js ─────────────
function _publicar(evento, detalle = {}) {
  document.dispatchEvent(new CustomEvent(evento, { detail: detalle }));
}

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
    const res  = await fetch(STOCK_URL);
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

// ── CONTADOR ──────────────────────────────────────────────────
function actualizarContador() {
  const total = carrito.reduce((s, i) => s + i.cantidad, 0);
  ['cart-count-desktop', 'cart-count-mobile', 'cart-count-bottom'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = total; el.style.display = total > 0 ? 'inline-flex' : 'none'; }
  });
  const pulse = document.getElementById('cart-pulse');
  if (pulse) pulse.style.display = total > 0 ? 'block' : 'none';
  actualizarBotonesCarrito();
  _publicar('arms:carrito:actualizado', { carrito, total });
}

// ── ACTUALIZAR BOTONES CARRITO ────────────────────────────────
function actualizarBotonesCarrito() {
  // Botones de variante
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

  // Botón Agregar con id btn-add-
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

  // Botones Agregar sin variantes
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

// ── AGREGAR AL CARRITO ────────────────────────────────────────
function agregarAlCarrito(nombre, precio, btnEl) {
  const stockActual = nombre in stockGlobal ? stockGlobal[nombre] : null;

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

  const idxActual = carrito.findIndex(i => i.nombre === nombre);
  if (stockActual !== null && idxActual > -1 && carrito[idxActual].cantidad >= stockActual) {
    if (btnEl && !btnEl.querySelector('.stock-max-msg')) {
      const msg = document.createElement('div');
      msg.className = 'stock-max-msg';
      msg.textContent = 'Stock máximo alcanzado';
      msg.style.cssText = 'position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:#1a1a1a;border:1px solid rgba(239,68,68,0.4);color:#f87171;font-size:0.75rem;font-weight:600;padding:0.3rem 0.65rem;border-radius:0.5rem;white-space:nowrap;pointer-events:none;z-index:10;';
      btnEl.style.position = 'relative';
      btnEl.appendChild(msg);
      setTimeout(() => msg.remove(), 2500);
    }
    return;
  }

  _publicar('arms:carrito:animarAgregar', { btnEl, nombre, precio });
}

// Llamado por cart-drawer.js después de la animación
function _commitAgregarAlCarrito(nombre, precio, imagen) {
  const idx = carrito.findIndex(i => i.nombre === nombre);
  if (idx > -1) {
    carrito[idx].cantidad++;
    if (imagen && !carrito[idx].imagen) carrito[idx].imagen = imagen;
  } else {
    carrito.push({ nombre, precio, cantidad: 1, imagen: imagen || '' });
  }
  guardarCarrito();
  actualizarContador();
  _publicar('arms:carrito:itemAgregado');
}

// ── CAMBIAR CANTIDAD ──────────────────────────────────────────
function cambiarCantidad(idx, delta) {
  if (delta > 0) {
    const clave       = carrito[idx].nombre;
    const stockActual = clave in stockGlobal ? stockGlobal[clave] : null;
    if (stockActual !== null && carrito[idx].cantidad >= stockActual) {
      const msgEl = document.getElementById('cart-stock-msg');
      if (msgEl) {
        msgEl.textContent   = `Stock máximo alcanzado para ${clave.split(' - ')[0]}`;
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
  _publicar('arms:carrito:actualizado', { carrito });
}

function eliminarItem(idx) {
  carrito.splice(idx, 1);
  guardarCarrito();
  actualizarContador();
  _publicar('arms:carrito:actualizado', { carrito });
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
  const btnAdd   = document.getElementById('btn-add-' + cardId)
               || document.getElementById('btn-cat-' + cardId);
  const fullName = nombreBase + ' - ' + variante;
  const stockVal = fullName in stockGlobal ? stockGlobal[fullName] : null;
  const agotado  = stockVal !== null && stockVal <= 0;

  if (btnAdd) {
    btnAdd.setAttribute('data-product-name', fullName);
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

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (carrito.length > 0) actualizarContador();
  cargarStock();
});

// Manejar restauración desde bfcache (gesto volver)
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    carrito = JSON.parse(localStorage.getItem('arms-carrito') || '[]');
    actualizarContador();
    _publicar('arms:carrito:cerrar');
  }
});