/* =============================================================
   ARMS Music — Checkout / Formulario de Pedido
   Depende de: carrito.js (carrito, stockGlobal, SHEETS_URL, WA_NUMBER)
============================================================= */

// ── IR AL FORMULARIO ──────────────────────────────────────────
function irAFormulario() {
  mostrarPantalla('form');
  const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  document.getElementById('form-total').textContent = 'Q' + total.toLocaleString();
  document.getElementById('form-summary').innerHTML = carrito.map(i =>
    `<div style="display:flex; justify-content:space-between; margin-bottom:0.35rem;">
      <span style="color:rgba(255,255,255,0.7); font-size:0.875rem;">${i.nombre} x${i.cantidad}</span>
      <span style="color:#fff; font-size:0.875rem; font-weight:600;">Q${(i.precio * i.cantidad).toLocaleString()}</span>
    </div>`
  ).join('');
  const formScroll = document.querySelector('#screen-form [style*="overflow-y"]');
  if (formScroll) formScroll.scrollTop = 0;
}

function volverAlCarrito() {
  mostrarPantalla('cart');
  document.getElementById('cart-items').scrollTop = 0;
  renderCarrito();
}

// ── GENERAR MENSAJE WHATSAPP ──────────────────────────────────
function generarMensajeWA(datos) {
  const lineas = carrito.map(i => `• ${i.nombre} x${i.cantidad} — Q${(i.precio * i.cantidad).toLocaleString()}`).join('\n');
  const total  = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  return encodeURIComponent(
    `🛒 *NUEVO PEDIDO - ARMS Music*\n\n` +
    `👤 *Cliente:* ${datos.nombre}\n` +
    `📞 *Teléfono:* ${datos.telefono}\n` +
    `📍 *Dirección:* ${datos.direccion}\n` +
    `🗺️ *Departamento:* ${datos.departamento}\n` +
    `🏙️ *Municipio:* ${datos.municipio}\n` +
    (datos.notas ? `📝 *Notas:* ${datos.notas}\n` : '') +
    `💳 *Forma de pago:* ${datos.pago}\n` +
    `\n🎧 *Productos:*\n${lineas}\n\n` +
    `💰 *Total: Q${total.toLocaleString()}*`
  );
}

// ── ENVIAR PEDIDO ─────────────────────────────────────────────
async function enviarPedido() {
  const nombre       = document.getElementById('f-nombre').value.trim();
  const telefono     = document.getElementById('f-telefono').value.trim();
  const direccion    = document.getElementById('f-direccion').value.trim();
  const departamento = document.getElementById('f-departamento').value.trim();
  const municipio    = document.getElementById('f-municipio').value.trim();
  const notas        = document.getElementById('f-notas').value.trim();
  const errorEl      = document.getElementById('form-error');
  const btnEl        = document.getElementById('btn-enviar');

  const errores = [];
  if (!nombre || nombre.length < 3)       errores.push('El nombre debe tener al menos 3 caracteres.');
  if (!direccion || direccion.length < 6) errores.push('La dirección debe tener al menos 6 caracteres.');
  if (!departamento)                       errores.push('Selecciona un departamento.');
  if (!municipio)                          errores.push('Selecciona un municipio.');

  const soloDigitos = telefono.replace(/\D/g, '');
  if (soloDigitos.length !== 8) errores.push('El teléfono debe tener exactamente 8 dígitos.');

  if (errores.length > 0) {
    errorEl.innerHTML = errores.map(e => `<div>⚠️ ${e}</div>`).join('');
    errorEl.style.display = 'block';
    if (soloDigitos.length !== 8) {
      const telInput = document.getElementById('f-telefono');
      telInput.style.borderColor = '#ef4444';
      telInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }
  errorEl.style.display = 'none';
  document.getElementById('f-telefono').style.borderColor = '';

  const total    = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const productos = carrito.map(i => `${i.nombre} x${i.cantidad} (Q${(i.precio * i.cantidad).toLocaleString()})`).join(', ');
  const datos    = { nombre, telefono, direccion, departamento, municipio, notas, pago: PAGO_CONFIG[formaPagoSeleccionada].text };

  const msgWA = generarMensajeWA(datos);
  const waURL = `https://wa.me/${WA_NUMBER}?text=${msgWA}`;
  document.getElementById('btn-whatsapp').href     = waURL;
  document.getElementById('confirm-whatsapp').href = waURL;

  btnEl.disabled    = true;
  btnEl.textContent = '⏳ Enviando pedido...';
  resetearProgreso();
  mostrarPantalla('progress');
  setTimeout(() => activarPaso(1), 300);

  try {
    const payload = { nombre, telefono, direccion, departamento, municipio, notas, pago: PAGO_CONFIG[formaPagoSeleccionada].text, productos, total: 'Q' + total.toLocaleString() };
    const url     = SHEETS_URL + '?pedido=' + encodeURIComponent(JSON.stringify(payload));
    setTimeout(() => activarPaso(2), 1200);
    const res  = await fetch(url);
    const data = await res.json();
    if (data.ok && data.productos) {
      data.productos.forEach(p => { stockGlobal[p.nombre] = p.stock; });
      actualizarBotonesStock();
    }
  } catch(e) {
    mostrarPantalla('form');
    btnEl.disabled    = false;
    btnEl.textContent = 'Confirmar pedido';
    errorEl.innerHTML = '⚠️ Error de conexión. Revisa tu internet e intenta de nuevo.';
    errorEl.style.display = 'block';
    return;
  }

  activarPaso(3);
  await new Promise(r => setTimeout(r, 900));

  carrito = [];
  guardarCarrito();
  actualizarContador();

  mostrarPantalla('confirm');
  const esTransferencia = formaPagoSeleccionada === 'transferencia';
  document.getElementById('confirm-msg-entrega').style.display      = esTransferencia ? 'none'  : 'block';
  document.getElementById('confirm-msg-transferencia').style.display = esTransferencia ? 'block' : 'none';
  document.getElementById('confirm-whatsapp-label').textContent      = esTransferencia ? 'Solicitar Cuenta por WhatsApp' : 'Confirmar por WhatsApp';
  const pulse = document.getElementById('confirm-wa-pulse');
  pulse.style.animationPlayState = esTransferencia ? 'running' : 'paused';
  pulse.style.opacity            = esTransferencia ? '1'       : '0';
  pulse.style.visibility         = esTransferencia ? 'visible' : 'hidden';
}

// ── PANTALLA DE PROGRESO ──────────────────────────────────────
const PASOS = {
  1: { titulo: 'Colocando tu pedido...', sub: 'Registrando tu orden',      pct: 20,  icono: '📋' },
  2: { titulo: 'Verificando stock...',   sub: 'Revisando disponibilidad',  pct: 60,  icono: '🔍' },
  3: { titulo: '¡Pedido exitoso!',       sub: '¡Tu pedido fue procesado!', pct: 100, icono: '🎉' }
};

function activarPaso(paso) {
  const p     = PASOS[paso];
  const title = document.getElementById('progress-title');
  const sub   = document.getElementById('progress-sub');
  const pct   = document.getElementById('progress-pct');
  const bar   = document.getElementById('progress-bar-fill');
  const spin  = document.getElementById('progress-spinner');

  title.style.opacity = '0';
  sub.style.opacity   = '0';

  setTimeout(() => {
    title.textContent    = p.titulo;
    sub.textContent      = p.sub;
    spin.textContent     = p.icono;
    pct.textContent      = p.pct + '%';
    bar.style.width      = p.pct + '%';
    pct.style.color      = paso === 3 ? '#10B981' : paso === 2 ? '#f97316' : '#6600FF';
    spin.style.animation = paso === 3 ? 'none' : 'spin-icon 1.5s linear infinite';
    title.style.opacity  = '1';
    sub.style.opacity    = '1';
  }, 300);
}

function resetearProgreso() {
  const bar  = document.getElementById('progress-bar-fill');
  const pct  = document.getElementById('progress-pct');
  const spin = document.getElementById('progress-spinner');
  bar.style.transition = 'none';
  bar.style.width      = '0%';
  pct.textContent      = '0%';
  pct.style.color      = '#6600FF';
  spin.textContent     = '📦';
  spin.style.animation = 'spin-icon 1.5s linear infinite';
  document.getElementById('progress-title').textContent = 'Colocando tu pedido...';
  document.getElementById('progress-title').style.opacity = '1';
  document.getElementById('progress-sub').textContent    = 'Registrando tu orden';
  document.getElementById('progress-sub').style.opacity  = '1';
  setTimeout(() => { bar.style.transition = 'width 1.2s cubic-bezier(0.4,0,0.2,1)'; }, 50);
}

// ── FINALIZAR COMPRA ──────────────────────────────────────────
function finalizarCompra() {
  carrito = [];
  guardarCarrito();
  actualizarContador();
  cerrarCarrito();
  const pulse = document.getElementById('confirm-wa-pulse');
  if (pulse) { pulse.style.animationPlayState = 'paused'; pulse.style.opacity = '0'; pulse.style.visibility = 'hidden'; }
  ['f-nombre','f-telefono','f-direccion','f-notas'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const deptoEl = document.getElementById('f-departamento');
  if (deptoEl) deptoEl.value = '';
  actualizarMunicipios();
  const btnEl = document.getElementById('btn-enviar');
  if (btnEl) { btnEl.disabled = false; btnEl.textContent = '✅ Finalizar pedido'; }
  seleccionarPago('entrega');
}

// ── FORMA DE PAGO ─────────────────────────────────────────────
let formaPagoSeleccionada = 'entrega';

const PAGO_CONFIG = {
  entrega:       { label: 'lbl-pago-entrega',       radio: 'radio-entrega',       color: '#10B981', text: 'Pago Contra Entrega' },
  transferencia: { label: 'lbl-pago-transferencia', radio: 'radio-transferencia', color: '#6600FF', text: 'Transferencia / Depósito' }
};

function seleccionarPago(tipo) {
  formaPagoSeleccionada = tipo;
  Object.entries(PAGO_CONFIG).forEach(([key, cfg]) => {
    const lbl   = document.getElementById(cfg.label);
    const radio = document.getElementById(cfg.radio);
    const activo = key === tipo;
    if (lbl) {
      lbl.style.background  = activo ? `rgba(${key==='entrega'?'16,185,129':'102,0,255'},0.12)` : 'rgba(255,255,255,0.03)';
      lbl.style.borderColor = activo ? cfg.color : 'rgba(255,255,255,0.1)';
    }
    if (radio) {
      radio.style.background  = activo ? cfg.color : 'transparent';
      radio.style.borderColor = activo ? cfg.color : 'rgba(255,255,255,0.25)';
      radio.innerHTML         = activo ? '<span style="width:7px;height:7px;border-radius:50%;background:#fff;"></span>' : '';
    }
  });
  const sub = document.getElementById('subtitulo-transferencia');
  if (sub) sub.textContent = tipo === 'transferencia'
    ? 'Solicitar No. de cuenta por WhatsApp'
    : 'Depósito o transferencia bancaria';
}

function scrollAFormaPago() {
  setTimeout(() => {
    const el = document.getElementById('forma-pago-label');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function limpiarErrorTelefono() {
  const tel = document.getElementById('f-telefono');
  const err = document.getElementById('error-telefono');
  if (tel) tel.style.borderColor = 'rgba(255,255,255,0.1)';
  if (err) err.style.display     = 'none';
}

// ── MUNICIPIOS DE GUATEMALA ───────────────────────────────────
const MUNICIPIOS_GT = {
  'Alta Verapaz': ['Cobán','Cahabón','Chahal','Chisec','Fray Bartolomé de las Casas','La Tinta','Lanquín','Panzós','Raxruhá','San Cristóbal Verapaz','San Juan Chamelco','San Pedro Carchá','Santa Catalina La Tinta','Santa Cruz Verapaz','Santa María Cahabón','Senahú','Tamahú','Tactic','Tucurú'],
  'Baja Verapaz': ['Salamá','Cubulco','El Chol','Granados','Purulhá','Rabinal','San Jerónimo','San Miguel Chicaj','Santa Cruz El Chol'],
  'Chimaltenango': ['Chimaltenango','Acatenango','El Tejar','Parramos','Patzicía','Patzún','Pochuta','San Andrés Itzapa','San José Poaquil','San Juan Comalapa','San Martín Jilotepeque','San Miguel Pochuta','Santa Apolonia','Santa Cruz Balanyá','Tecpán Guatemala','Yepocapa','Zaragoza'],
  'Chiquimula': ['Chiquimula','Camotán','Concepción Las Minas','Esquipulas','Ipala','Jocotán','Olopa','Quezaltepeque','San Jacinto','San José La Arada','San Juan La Ermita'],
  'El Progreso': ['Guastatoya','El Jícaro','Morazán','San Agustín Acasaguastlán','San Antonio La Paz','San Cristóbal Acasaguastlán','Sansare','Sanarate'],
  'Escuintla': ['Escuintla','Guanagazapa','Iztapa','La Democracia','La Gomera','Masagua','Nueva Concepción','Palín','San José','San Vicente Pacaya','Santa Lucía Cotzumalguapa','Siquinalá','Tiquisate'],
  'Guatemala': ['Guatemala','Amatitlán','Chinautla','Chuarrancho','Fraijanes','Mixco','Palencia','Petapa','San José del Golfo','San José Pinula','San Juan Sacatepéquez','San Miguel Petapa','San Pedro Ayampuc','San Pedro Sacatepéquez','San Raymundo','Santa Catarina Pinula','Villa Canales','Villa Nueva'],
  'Huehuetenango': ['Huehuetenango','Aguacatán','Barillas','Chiantla','Colotenango','Concepción Huista','Cuilco','Ixtahuacán','Jacaltenango','La Democracia','La Libertad','Malacatancito','Nentón','San Antonio Huista','San Gaspar Ixchil','San Ildefonso Ixtahuacán','San Juan Atitán','San Juan Ixcoy','San Marcos Huista','San Mateo Ixtatán','San Miguel Acatán','San Pedro Necta','San Pedro Soloma','San Rafael La Independencia','San Rafael Petzal','San Sebastián Coatán','San Sebastián Huehuetenango','Santa Ana Huista','Santa Bárbara','Santa Cruz Barillas','Santa Eulalia','Santiago Chimaltenango','Tectitán','Todos Santos Cuchumatán','Unión Cantinil'],
  'Izabal': ['Puerto Barrios','El Estor','Livingston','Los Amates','Morales'],
  'Jalapa': ['Jalapa','Mataquescuintla','Monjas','San Carlos Alzatate','San Luis Jilotepeque','San Manuel Chaparrón','San Pedro Pinula'],
  'Jutiapa': ['Jutiapa','Agua Blanca','Asunción Mita','Atescatempa','Comapa','Conguaco','El Adelanto','Jalpatagua','Jerez','Moyuta','Pasaco','Quesada','San José Acatempa','Santa Catarina Mita','Yupiltepeque','Zapotitlán'],
  'Petén': ['Flores','Dolores','El Chal','La Libertad','Las Cruces','Melchor de Mencos','Poptún','San Andrés','San Benito','San Francisco','San José','San Luis','Santa Ana','Sayaxché'],
  'Quetzaltenango': ['Quetzaltenango','Almolonga','Cantel','Coatepeque','Colomba','Concepción Chiquirichapa','El Palmar','Flores Costa Cuca','Génova','Huitán','La Esperanza','Llano del Pinal','Olintepeque','Ostuncalco','Palestina de Los Altos','Salcajá','San Carlos Sija','San Francisco La Unión','San Marcos Atitlán','San Martín Sacatepéquez','San Mateo','San Miguel Sigüilá','Sibilia','Zunil'],
  'Quiché': ['Santa Cruz del Quiché','Canillá','Chajul','Chicamán','Chiché','Chichicastenango','Chinique','Cunén','Ixcán','Joyabaj','Nebaj','Pachalum','Patzité','Sacapulas','San Andrés Sajcabajá','San Antonio Ilotenango','San Bartolomé Jocotenango','San Juan Cotzal','San Pedro Jocopilas','Uspantán','Zacualpa'],
  'Retalhuleu': ['Retalhuleu','Champerico','El Asintal','Nuevo San Carlos','San Andrés Villa Seca','San Felipe','San Martín Zapotitlán','San Sebastián','Santa Cruz Muluá'],
  'Sacatepéquez': ['Antigua Guatemala','Alotenango','Ciudad Vieja','Jocotenango','Magdalena Milpas Altas','Pastores','San Antonio Aguas Calientes','San Bartolomé Milpas Altas','San Lucas Sacatepéquez','San Miguel Dueñas','Santa Catarina Barahona','Santa Lucía Milpas Altas','Santa María de Jesús','Santo Domingo Xenacoj','Santiago Sacatepéquez','Sumpango','Yepocapa'],
  'San Marcos': ['San Marcos','Ayutla','Catarina','Comitancillo','Concepción Tutuapa','El Quetzal','El Rodeo','El Tumbador','Esquipulas Palo Gordo','Ixchiguán','La Blanca','La Reforma','Malacatán','Nuevo Progreso','Ocós','Pajapita','Río Blanco','San Antonio Sacatepéquez','San Cristóbal Cucho','San José Ojetenam','San Lorenzo','San Miguel Ixtahuacán','San Pablo','San Pedro Sacatepéquez','San Rafael Pie de la Cuesta','Sibinal','Sipacapa','Tacaná','Tajumulco','Tejutla'],
  'Santa Rosa': ['Cuilapa','Barberena','Casillas','Chiquimulilla','Guazacapán','Nueva Santa Rosa','Oratorio','Pueblo Nuevo Viñas','San Juan Tecuaco','San Rafael Las Flores','Santa Cruz Naranjo','Santa María Ixhuatán','Santa Rosa de Lima','Taxisco'],
  'Sololá': ['Sololá','Concepción','Nahualá','Panajachel','San Andrés Semetabaj','San Antonio Palopó','San José Chacayá','San Juan La Laguna','San Lucas Tolimán','San Marcos La Laguna','San Pablo La Laguna','San Pedro La Laguna','Santa Catarina Ixtahuacán','Santa Catarina Palopó','Santa Clara La Laguna','Santa Cruz La Laguna','Santa Lucía Utatlán','Santa María Visitación','Santiago Atitlán'],
  'Suchitepéquez': ['Mazatenango','Chicacao','Cuyotenango','Patulul','Pueblo Nuevo','Río Bravo','Samayac','San Antonio Suchitepéquez','San Bernardino','San Francisco Zapotitlán','San Gabriel','San José El Ídolo','San Juan Bautista','San Lorenzo','San Miguel Panán','San Pablo Jocopilas','Santa Bárbara','Santo Domingo Suchitepéquez','Santo Tomás La Unión','Zunilito'],
  'Totonicapán': ['Totonicapán','Momostenango','San Andrés Xecul','San Bartolo','San Cristóbal Totonicapán','San Francisco El Alto','Santa Lucía La Reforma','Santa María Chiquimula'],
  'Zacapa': ['Zacapa','Cabañas','Estanzuela','Gualán','Huité','La Unión','Río Hondo','San Diego','San Jorge','Teculután','Usumatlán']
};

function actualizarMunicipios() {
  const depto = document.getElementById('f-departamento');
  const sel   = document.getElementById('f-municipio');
  if (!depto || !sel) return;
  sel.innerHTML = '';
  if (!depto.value || !MUNICIPIOS_GT[depto.value]) {
    sel.innerHTML = '<option value="" disabled selected>Primero selecciona un departamento</option>';
    return;
  }
  sel.innerHTML = '<option value="" disabled selected>Selecciona un municipio</option>' +
    MUNICIPIOS_GT[depto.value].map(m => `<option value="${m}">${m}</option>`).join('');
  setTimeout(() => { sel.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
}


