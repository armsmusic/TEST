/* =============================================================
   ARMS Music — cart-drawer.js
   UI del drawer del carrito
   - Abre/cierra el drawer
   - Renderiza los items
   - Maneja la animación del botón agregar
   - Escucha eventos de cart-store.js
   - Al hacer clic en "Proceder al pago" → navega a /checkout/
============================================================= */

// ── ABRIR / CERRAR ────────────────────────────────────────────
function abrirCarrito() {
  const drawer = document.getElementById('cart-drawer');
  document.getElementById('cart-overlay').style.display = 'block';
  drawer.style.transform = 'translateX(0)';
  drawer.style.boxShadow = '-20px 0 60px rgba(0,0,0,0.5)';
  const waf = document.querySelector('.whatsapp-float');
  if (waf) waf.style.display = 'none';
  document.getElementById('cart-items').scrollTop = 0;
  renderCarrito();
}

function cerrarCarrito() {
  const drawer = document.getElementById('cart-drawer');
  document.getElementById('cart-overlay').style.display = 'none';
  drawer.style.transform = 'translateX(100%)';
  drawer.style.boxShadow = 'none';
  const waf = document.querySelector('.whatsapp-float');
  if (waf) waf.style.display = 'flex';
}

// ── RENDER ────────────────────────────────────────────────────
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

// ── TOAST ─────────────────────────────────────────────────────
function mostrarToast() {
  const t = document.getElementById('toast-add');
  if (!t) return;
  t.style.transform = 'translateX(-50%) translateY(0)';
  setTimeout(() => { t.style.transform = 'translateX(-50%) translateY(200px)'; }, 2200);
}

// ── IR AL CHECKOUT ────────────────────────────────────────────
function irACheckout() {
  // Dispara evento InitiateCheckout si existe el Pixel
  if (typeof fbq === 'function') {
    const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
    fbq('track', 'InitiateCheckout', {
      value: total,
      currency: 'GTQ',
      num_items: carrito.reduce((s, i) => s + i.cantidad, 0)
    });
  }
  window.location.href = '/checkout/';
}

// ── ESCUCHAR EVENTOS DE cart-store.js ─────────────────────────
document.addEventListener('arms:carrito:animarAgregar', (e) => {
  const { btnEl, nombre, precio } = e.detail;
  const imagen = btnEl ? (btnEl.getAttribute('data-img') || '') : '';
  animarAgregar(btnEl, () => {
    _commitAgregarAlCarrito(nombre, precio, imagen);
    mostrarToast();
    // Re-render del drawer si está abierto
    const drawer = document.getElementById('cart-drawer');
    if (drawer && drawer.style.transform === 'translateX(0px)' || drawer && drawer.style.transform === 'translateX(0)') {
      renderCarrito();
    }
  });
});

document.addEventListener('arms:carrito:actualizado', () => {
  const drawer = document.getElementById('cart-drawer');
  if (!drawer) return;
  const isOpen = drawer.style.transform === 'translateX(0px)' || drawer.style.transform === 'translateX(0)';
  if (isOpen) renderCarrito();
});

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Render inicial si hay items
  if (carrito && carrito.length > 0) renderCarrito();
});

document.addEventListener('arms:carrito:cerrar', () => {
  cerrarCarrito();
});