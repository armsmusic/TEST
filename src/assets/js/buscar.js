/* =============================================================
   ARMS Music — Buscador con Fuse.js
   Maneja: autocomplete en navbar + página /buscar/
============================================================= */

(function () {
  const FUSE_CDN = 'https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js';
  const INDEX_URL = '/search-index.json';
  const BUSCAR_URL = '/buscar/';

  let fuse = null;
  let catalogo = [];
  let fuseLoaded = false;
  let indexLoaded = false;
  let cargando = false;

  // ── ELEMENTOS DEL NAVBAR ──────────────────────────────────────
  const searchPanel     = document.getElementById('search-panel');
  const searchInputPanel = document.getElementById('search-input-panel');
  const searchClearPanel = document.getElementById('search-clear-panel');
  const searchDropdown  = document.getElementById('search-dropdown');
  const searchBtnDesktop = document.getElementById('navbar-search-btn');
  const searchBtnMobile  = document.getElementById('navbar-search-btn-mobile');
  const searchInputDsk   = document.getElementById('search-input');
  const searchClearDsk   = document.getElementById('search-clear');

  let searchPanelOpen = false;

  // ── CARGAR FUSE.JS Y CATÁLOGO ─────────────────────────────────
  function cargarDependencias() {
    if (cargando || (fuseLoaded && indexLoaded)) return;
    cargando = true;

    // Cargar Fuse.js desde CDN
    const script = document.createElement('script');
    script.src = FUSE_CDN;
    script.onload = () => {
      fuseLoaded = true;
      intentarInicializar();
    };
    script.onerror = () => { cargando = false; };
    document.head.appendChild(script);

    // Cargar índice JSON
    fetch(INDEX_URL)
      .then(r => r.json())
      .then(data => {
        catalogo = data;
        indexLoaded = true;
        intentarInicializar();
      })
      .catch(() => { cargando = false; });
  }

  function intentarInicializar() {
    if (!fuseLoaded || !indexLoaded) return;
    fuse = new Fuse(catalogo.map(p => ({
      ...p,
      _nombre: normalizar(p.nombre),
      _nombreCompacto: normalizarCompacto(p.nombre)
    })), {
      keys: ['_nombre', '_nombreCompacto', 'nombre'],
      threshold: 0.4,
      distance: 80,
      minMatchCharLength: 2,
      includeScore: true
    });
    cargando = false;
    // Si ya había texto en el input, ejecutar búsqueda
    const q = searchInputPanel ? searchInputPanel.value.trim() : '';
    if (q.length >= 2) mostrarDropdown(q);
  }

  // ── DROPDOWN DE AUTOCOMPLETE ──────────────────────────────────
  function mostrarDropdown(query) {
    if (!fuse || !searchDropdown) return;
    if (query.length < 2) {
      ocultarDropdown();
      return;
    }

    const resultados = fuse.search(normalizar(query), { limit: 7 });

    if (resultados.length === 0) {
      searchDropdown.innerHTML = `
        <div style="padding:1rem 1.25rem; color:rgba(255,255,255,0.4); font-size:0.875rem; text-align:center;">
          No se encontraron productos para "<strong style="color:rgba(255,255,255,0.7);">${escapeHtml(query)}</strong>"
        </div>`;
      searchDropdown.style.display = 'block';
      return;
    }

    searchDropdown.innerHTML = resultados.map(({ item }) => `
      <a href="${escapeHtml(item.url)}" style="
        display:flex; align-items:center; gap:0.75rem;
        padding:0.65rem 1rem; text-decoration:none;
        border-bottom:1px solid rgba(255,255,255,0.05);
        transition:background .15s ease;
      " onmouseover="this.style.background='rgba(102,0,255,0.1)'"
         onmouseout="this.style.background='transparent'">
        <img src="${escapeHtml(item.imagen)}" alt="${escapeHtml(item.nombre)}"
          style="width:44px; height:44px; object-fit:contain; border-radius:0.5rem; background:rgba(255,255,255,0.05); flex-shrink:0;"
          onerror="this.style.display='none'">
        <div style="flex:1; min-width:0;">
          <p style="margin:0; font-size:0.875rem; font-weight:600; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${escapeHtml(item.nombre)}
          </p>
          <p style="margin:0; font-size:0.8rem; color:rgba(255,255,255,0.45);">Q${Number(item.precio).toLocaleString()}</p>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><polyline points="9 18 15 12 9 6"/></svg>
      </a>
    `).join('') + `
      <a href="${BUSCAR_URL}?q=${encodeURIComponent(query)}" style="
        display:flex; align-items:center; justify-content:center; gap:0.4rem;
        padding:0.75rem; text-decoration:none; color:var(--arms-purple, #6600FF);
        font-size:0.825rem; font-weight:600;
        border-top:1px solid rgba(139,120,255,0.15);
      " onmouseover="this.style.background='rgba(102,0,255,0.08)'"
         onmouseout="this.style.background='transparent'">
        Ver todos los resultados para "<strong>${escapeHtml(query)}</strong>"
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </a>`;

    searchDropdown.style.display = 'block';
  }

  function ocultarDropdown() {
    if (searchDropdown) searchDropdown.style.display = 'none';
  }

  function normalizar(str) {
    return String(str).toLowerCase().replace(/-/g, ' ').trim();
  }

  function normalizarCompacto(str) {
    return String(str).toLowerCase().replace(/-/g, '').replace(/\s+/g, '');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── ABRIR / CERRAR PANEL ──────────────────────────────────────
  function abrirSearchPanel() {
    if (!searchPanel) return;
    searchPanelOpen = true;
    const navbar = document.querySelector('.navbar-floating');
    const navH   = navbar ? navbar.offsetHeight : 56;
    searchPanel.style.paddingTop = (6 + navH) + 'px';
    searchPanel.style.display = 'block';
    setTimeout(() => searchInputPanel && searchInputPanel.focus(), 80);
    cargarDependencias();
  }

  function cerrarSearchPanel() {
    if (!searchPanel) return;
    searchPanelOpen = false;
    searchPanel.style.display = 'none';
    ocultarDropdown();
  }

  // ── REDIRECCIÓN AL BUSCAR ─────────────────────────────────────
  function redirigirBusqueda(query) {
    if (!query.trim()) return;
    cerrarSearchPanel();
    window.location.href = BUSCAR_URL + '?q=' + encodeURIComponent(query.trim());
  }

  // ── EVENTOS BOTONES LUPA ──────────────────────────────────────
  if (searchBtnDesktop) {
    searchBtnDesktop.addEventListener('click', () => {
      searchPanelOpen ? cerrarSearchPanel() : abrirSearchPanel();
    });
  }

  if (searchBtnMobile) {
    searchBtnMobile.addEventListener('click', () => {
      searchPanelOpen ? cerrarSearchPanel() : abrirSearchPanel();
    });
  }

  // ── CERRAR AL CLICK FUERA ─────────────────────────────────────
  document.addEventListener('click', e => {
    if (!searchPanelOpen) return;
    if (searchPanel && searchPanel.contains(e.target)) return;
    if (searchBtnDesktop && searchBtnDesktop.contains(e.target)) return;
    if (searchBtnMobile  && searchBtnMobile.contains(e.target))  return;
    cerrarSearchPanel();
  });

  // ── INPUT PANEL ───────────────────────────────────────────────
  if (searchInputPanel) {
    searchInputPanel.addEventListener('input', function () {
      const q = this.value;
      if (searchClearPanel) searchClearPanel.style.display = q.length > 0 ? 'flex' : 'none';
      if (searchInputDsk) searchInputDsk.value = q;
      mostrarDropdown(q);
    });

    searchInputPanel.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        redirigirBusqueda(this.value);
      }
      if (e.key === 'Escape') cerrarSearchPanel();
    });
  }

  if (searchClearPanel) {
    searchClearPanel.addEventListener('click', () => {
      if (searchInputPanel) searchInputPanel.value = '';
      if (searchInputDsk)   searchInputDsk.value   = '';
      searchClearPanel.style.display = 'none';
      ocultarDropdown();
    });
  }

  // ── INPUT DESKTOP (lupa navbar) ───────────────────────────────
  if (searchInputDsk) {
    searchInputDsk.addEventListener('input', function () {
      const q = this.value;
      if (searchInputPanel) searchInputPanel.value = q;
      if (searchClearPanel) searchClearPanel.style.display = q.length > 0 ? 'flex' : 'none';
      if (searchClearDsk)   searchClearDsk.classList.toggle('visible', q.length > 0);
      mostrarDropdown(q);
    });

    searchInputDsk.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        redirigirBusqueda(this.value);
      }
    });
  }

  if (searchClearDsk) {
    searchClearDsk.addEventListener('click', () => {
      if (searchInputDsk)   searchInputDsk.value   = '';
      if (searchInputPanel) searchInputPanel.value = '';
      if (searchClearPanel) searchClearPanel.style.display = 'none';
      searchClearDsk.classList.remove('visible');
      ocultarDropdown();
    });
  }

  // ── PÁGINA /buscar/ ───────────────────────────────────────────
  const esPaginaBuscar = window.location.pathname === BUSCAR_URL ||
                         window.location.pathname === BUSCAR_URL.slice(0, -1);

  if (esPaginaBuscar) {
    const params     = new URLSearchParams(window.location.search);
    const queryInicial = params.get('q') || '';
    const inputBuscar  = document.getElementById('buscar-input');
    const resultadosEl = document.getElementById('buscar-resultados');
    const tituloEl     = document.getElementById('buscar-titulo');
    const rangeMinEl   = document.getElementById('buscar-range-min');
    const rangeMaxEl   = document.getElementById('buscar-range-max');
    const trackFillEl  = document.getElementById('buscar-track-fill');
    const lblMinEl     = document.getElementById('buscar-lbl-min');
    const lblMaxEl     = document.getElementById('buscar-lbl-max');
    const lblRangoEl   = document.getElementById('buscar-lbl-rango');
    const btnResetEl   = document.getElementById('buscar-precio-reset');
    const countEl      = document.getElementById('buscar-count');

    const PRECIO_MIN = 0;
    const PRECIO_MAX = 2000;
    let precioMin = PRECIO_MIN;
    let precioMax = PRECIO_MAX;
    let queryActual = queryInicial;

    if (inputBuscar) inputBuscar.value = queryInicial;
    if (tituloEl && queryInicial) {
      tituloEl.textContent = `Resultados para "${queryInicial}"`;
    }

    function actualizarTrack() {
      if (!rangeMinEl || !rangeMaxEl || !trackFillEl) return;
      const rng   = PRECIO_MAX - PRECIO_MIN;
      const left  = ((precioMin - PRECIO_MIN) / rng) * 100;
      const right = ((precioMax - PRECIO_MIN) / rng) * 100;
      trackFillEl.style.left  = left + '%';
      trackFillEl.style.width = (right - left) + '%';
    }

    function mostrarResultados() {
      if (!resultadosEl) return;
      if (!fuse) {
        resultadosEl.innerHTML = '<p style="color:rgba(255,255,255,0.4); text-align:center; padding:2rem;">Cargando...</p>';
        return;
      }

      let items = queryActual.length >= 2
        ? fuse.search(normalizar(queryActual)).map(r => r.item)
        : [...catalogo];

      // Filtrar por precio
      items = items.filter(p => p.precio >= precioMin && p.precio <= precioMax);

      if (countEl) countEl.textContent = `${items.length} resultado${items.length !== 1 ? 's' : ''}`;
      if (tituloEl) {
        tituloEl.textContent = queryActual
          ? `Resultados para "${queryActual}"`
          : 'Todos los productos';
      }

      if (items.length === 0) {
        resultadosEl.innerHTML = `
          <div style="text-align:center; padding:3rem 1rem; color:rgba(255,255,255,0.4);">
            <div style="font-size:3rem; margin-bottom:1rem;">🔍</div>
            <p>No se encontraron productos${queryActual ? ` para "<strong style="color:rgba(255,255,255,0.7);">${escapeHtml(queryActual)}</strong>"` : ''}.</p>
          </div>`;
        return;
      }

      resultadosEl.innerHTML = `<div class="row g-3">` +
        items.map(item => `
          <div class="col-6 col-md-4 col-lg-3">
            <a href="${escapeHtml(item.url)}" class="card h-100 text-decoration-none" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:1rem; overflow:hidden; transition:border-color .2s, transform .2s;"
              onmouseover="this.style.borderColor='rgba(102,0,255,0.4)';this.style.transform='translateY(-2px)'"
              onmouseout="this.style.borderColor='rgba(255,255,255,0.08)';this.style.transform='none'">
              <div style="aspect-ratio:1; background:rgba(255,255,255,0.03); display:flex; align-items:center; justify-content:center; padding:1rem;">
                <img src="${escapeHtml(item.imagen)}" alt="${escapeHtml(item.nombre)}"
                  style="max-width:100%; max-height:100%; object-fit:contain;"
                  onerror="this.parentElement.innerHTML='<span style=\\'font-size:2.5rem;\\'>🎧</span>'">
              </div>
              <div style="padding:0.75rem 1rem 1rem;">
                <p style="margin:0 0 0.35rem; font-size:0.875rem; font-weight:600; color:#fff; line-height:1.3;">${escapeHtml(item.nombre)}</p>
                <p style="margin:0; font-size:0.95rem; font-weight:700; color:var(--arms-purple, #6600FF);">Q${Number(item.precio).toLocaleString()}</p>
              </div>
            </a>
          </div>
        `).join('') + `</div>`;
    }

    // Cargar dependencias y mostrar resultados
    cargarDependencias();

    // Esperar a que Fuse esté listo
    const waitFuse = setInterval(() => {
      if (fuse) {
        clearInterval(waitFuse);
        mostrarResultados();
      }
    }, 100);

    // Input de búsqueda en la página
    if (inputBuscar) {
      inputBuscar.addEventListener('input', function () {
        queryActual = this.value;
        // Actualizar URL sin recargar
        const url = new URL(window.location.href);
        if (queryActual) url.searchParams.set('q', queryActual);
        else url.searchParams.delete('q');
        window.history.replaceState({}, '', url);
        mostrarResultados();
      });

      inputBuscar.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') e.preventDefault();
      });
    }

    // Sliders de precio
    function syncSliders() {
      if (!rangeMinEl || !rangeMaxEl) return;
      let vMin = parseInt(rangeMinEl.value, 10);
      let vMax = parseInt(rangeMaxEl.value, 10);
      const GAP = 25;
      if (vMin > vMax - GAP) { vMin = vMax - GAP; rangeMinEl.value = vMin; }
      if (vMax < vMin + GAP) { vMax = vMin + GAP; rangeMaxEl.value = vMax; }
      precioMin = vMin;
      precioMax = vMax;
      if (lblMinEl) lblMinEl.textContent = vMin;
      if (lblMaxEl) lblMaxEl.textContent = vMax;
      const hayFiltro = vMin > PRECIO_MIN || vMax < PRECIO_MAX;
      if (lblRangoEl) lblRangoEl.textContent = hayFiltro ? `Q${vMin} – Q${vMax}` : 'Todos los precios';
      if (btnResetEl) btnResetEl.style.display = hayFiltro ? 'inline' : 'none';
      actualizarTrack();
      mostrarResultados();
    }

    if (rangeMinEl) rangeMinEl.addEventListener('input', syncSliders);
    if (rangeMaxEl) rangeMaxEl.addEventListener('input', syncSliders);
    if (btnResetEl) {
      btnResetEl.addEventListener('click', () => {
        if (rangeMinEl) rangeMinEl.value = PRECIO_MIN;
        if (rangeMaxEl) rangeMaxEl.value = PRECIO_MAX;
        syncSliders();
      });
    }

    actualizarTrack();
  }

})();
