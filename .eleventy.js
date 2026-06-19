const productosData = require('./src/_data/productos.json');
const fs            = require('fs');
const path          = require('path');
const md            = require('markdown-it')({ html: true, breaks: true });

// ── Mapa de sección → pilar URL ───────────────────────────────
const PILARES = {
  'inears':            'in-ears',
  'accesorios-inears': 'in-ears/accesorios',
  'audio-sistemas':    'audio/sistemas',
  'audio-interfaces':  'audio/interfaces',
  'audio-microfonos':  'audio/microfonos',
  'audio-cables':      'audio/cables'
};

// ── Filtro slug ───────────────────────────────────────────────
function safeSlug(str) {
  return String(str).toLowerCase()
    .replace(/[áàäâ]/g,'a').replace(/[éèëê]/g,'e')
    .replace(/[íìïî]/g,'i').replace(/[óòöô]/g,'o')
    .replace(/[úùüû]/g,'u').replace(/ñ/g,'n')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

// ── Leer descripción desde archivo .md ───────────────────────
function leerDescripcion(id) {
  const filePath = path.join(__dirname, 'src', 'descripciones', `${id}.md`);
  if (fs.existsSync(filePath)) {
    return md.render(fs.readFileSync(filePath, 'utf8'));
  }
  return null;
}

// ── Leer imágenes desde carpeta del producto ─────────────────
const IMG_EXTS = new Set(['.webp', '.jpg', '.jpeg', '.png']);

function leerImagenes(id) {
  const carpeta = path.join(__dirname, 'src', 'assets', 'img', 'productos', id);
  if (!fs.existsSync(carpeta)) return [];
  return fs.readdirSync(carpeta)
    .filter(f => IMG_EXTS.has(path.extname(f).toLowerCase()))
    .sort()
    .map(f => `${id}/${f}`);
}

// ── Leer imagen OG desde subcarpeta og/ del producto ─────────
function leerOgImagen(id) {
  const carpeta = path.join(__dirname, 'src', 'assets', 'img', 'productos', id, 'og');
  if (!fs.existsSync(carpeta)) return null;
  const imgs = fs.readdirSync(carpeta)
    .filter(f => IMG_EXTS.has(path.extname(f).toLowerCase()))
    .sort();
  return imgs.length ? `${id}/og/${imgs[0]}` : null;
}

// ── Leer imágenes por variante desde subcarpeta variantes/ ────
function leerImagenesVariantes(id) {
  const carpeta = path.join(__dirname, 'src', 'assets', 'img', 'productos', id, 'variantes');
  if (!fs.existsSync(carpeta)) return {};
  const mapa = {};
  fs.readdirSync(carpeta)
    .filter(f => IMG_EXTS.has(path.extname(f).toLowerCase()))
    .forEach(f => {
      const nombre = path.basename(f, path.extname(f)); // "Negro", "Con Micrófono", etc.
      mapa[nombre] = `${id}/variantes/${f}`;
    });
  return mapa;
}

// ── Resolver IDs a objetos completos ─────────────────────────
function resolverSeccion(seccion) {
  const indice = {};
  productosData.catalogo.forEach(p => { indice[p.id] = p; });
  const ids   = productosData.secciones[seccion] || [];
  const extra = productosData.extra[seccion]      || [];
  return ids.map(id => {
    const prod = indice[id];
    if (!prod) return null;
    const descMd = leerDescripcion(id);
    return {
      ...prod,
      descripcion: descMd || prod.descripcion || null,
      imagenes:          leerImagenes(id),
      ogImagenProducto:  leerOgImagen(id),
      imagenesVariantes: leerImagenesVariantes(id),
      extra:       extra.includes(id)
    };
  }).filter(Boolean);
}

// ── Aleatorizar array (Fisher-Yates) ─────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Tomar N aleatorios de una sección, excluyendo un ID ──────
function aleatoriosDe(seccion, n, excluirId = null) {
  const lista = resolverSeccion(seccion).filter(p => p.id !== excluirId);
  return shuffle(lista).slice(0, n);
}

// ── Construir relacionados según pilar ───────────────────────
function construirRelacionados(pilar, prodId) {
  const esInears = pilar === 'in-ears' || pilar === 'in-ears/accesorios';
  const esAudio  = pilar === 'audio/sistemas' || pilar === 'audio/interfaces' ||
                   pilar === 'audio/microfonos' || pilar === 'audio/cables';

  if (esInears) {
    // Pedir 4 de cada sección para tener suficientes para 2 ciclos
    const accesorios = aleatoriosDe('accesorios-inears', 4, prodId);
    const inears     = aleatoriosDe('inears',            4, prodId);
    const sistemas   = aleatoriosDe('audio-sistemas',    4, prodId);
    // Intercalar en ciclos: 2+2+2, 2+2+2
    const result = [];
    for (let i = 0; i < 2; i++) {
      result.push(...accesorios.slice(i*2, i*2+2));
      result.push(...inears.slice(i*2, i*2+2));
      result.push(...sistemas.slice(i*2, i*2+2));
    }
    return result.slice(0, 12);
  }

  if (esAudio) {
    return [
      ...aleatoriosDe('audio-sistemas',   3, prodId),
      ...aleatoriosDe('audio-interfaces', 3, prodId),
      ...aleatoriosDe('inears',           2, prodId),
      ...aleatoriosDe('audio-cables',     2, prodId),
      ...aleatoriosDe('audio-microfonos', 2, prodId),
    ];
  }

  // Fallback: 3 de la misma sección
  const seccion = Object.keys(PILARES).find(s => PILARES[s] === pilar) || 'inears';
  return aleatoriosDe(seccion, 3, prodId);
}

module.exports = function(eleventyConfig) {

  // ── Assets ───────────────────────────────────────────────────
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy({ "src/favicon.svg":     "favicon.svg" });
  eleventyConfig.addPassthroughCopy({ "src/logo-navbar.svg": "logo-navbar.svg" });
  eleventyConfig.addPassthroughCopy({ "src/logo-footer.svg": "logo-footer.svg" });

  // ── Filtros ───────────────────────────────────────────────────
  eleventyConfig.addFilter("gtq",      (num) => `Q${Number(num).toLocaleString()}`);
  eleventyConfig.addFilter("safeSlug", safeSlug);

  // ── Filtro: URL de un producto (busca la sección por ID) ─────
  eleventyConfig.addFilter("productoUrl", (id) => {
    for (const [seccion, pilar] of Object.entries(PILARES)) {
      const ids = productosData.secciones[seccion] || [];
      if (ids.includes(id)) return `/${pilar}/${id}/`;
    }
    return '#';
  });

  // ── Global data: mapa de estilos de variantes ────────────────
  eleventyConfig.addGlobalData("vs", {
    "Negro":   "background:#1a1a1a;border:1.5px solid #555;color:#fff",
    "Verde":   "background:#064e3b;border:1.5px solid #10B981;color:#6ee7b7",
    "Crystal": "background:#e0f2fe;border:1.5px solid #38bdf8;color:#0369a1",
    "Gray":    "background:#374151;border:1.5px solid #9ca3af;color:#d1d5db",
    "Purple":  "background:#2e1065;border:1.5px solid #a855f7;color:#d8b4fe",
    "Silver":  "background:#1e293b;border:1.5px solid #94a3b8;color:#cbd5e1",
    "Blue":    "background:#1e3a5f;border:1.5px solid #3b82f6;color:#93c5fd",
    "Dorado":  "background:#451a03;border:1.5px solid #d97706;color:#fcd34d",
    "Blanco":  "background:#f8fafc;border:1.5px solid #cbd5e1;color:#1e293b"
  });

  // ── Global data: productos resueltos por sección ─────────────
  eleventyConfig.addGlobalData("productos", () => {
    const resultado = {};
    const todasSecciones = [
      'inears', 'monitores', 'audio', 'accesorios-inears',
      'audio-sistemas', 'audio-interfaces', 'audio-microfonos', 'audio-cables'
    ];
    todasSecciones.forEach(sec => {
      resultado[sec] = resolverSeccion(sec);
    });
    return resultado;
  });

  // ── Colección: páginas individuales de producto ───────────────
  eleventyConfig.addCollection("productosPages", function() {
    const items = [];

    for (const [seccion, pilar] of Object.entries(PILARES)) {
      const lista = resolverSeccion(seccion);
      lista.forEach(prod => {
        const yaExiste = items.find(i => i.slug === prod.id);
        if (yaExiste) return;

        items.push({
          ...prod,
          seccion,
          pilar,
          slug:        prod.id,
          permalink:   `/${pilar}/${prod.id}/index.html`,
          relacionados: construirRelacionados(pilar, prod.id)
        });
      });
    }
    return items;
  });

  return {
    dir: {
      input:    "src",
      output:   "_site",
      includes: "_includes",
      data:     "_data"
    },
    templateFormats:     ["njk", "html", "md"],
    htmlTemplateEngine:  "njk",
    markdownTemplateEngine: "njk"
  };
};
