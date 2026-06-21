/* =============================================================
   ARMS Music — arms-announcement.js
   Web Components de la announcement bar.

   Reescrito desde cero — código copiado literalmente de la fuente
   real de Impact (theme.js, js/common/behavior/height-observer.js
   y js/common/ui/marquee-text.js), verificado línea por línea.
   Ningún cálculo fue reinterpretado ni "mejorado": cualquier cambio
   de comportamiento respecto al Impact real sería un bug, no una
   decisión de diseño.

   IMPORTANTE: este archivo es la ÚNICA fuente de MarqueeText y
   HeightObserver en todo el proyecto. Ningún otro script (incluido
   arms-home.js) debe definir estos mismos tags — eso fue la causa
   real de un bug anterior (doble registro de customElements,
   carrera de timing entre dos implementaciones distintas).
============================================================= */

'use strict';

// ── HeightObserver ───────────────────────────────────────────
// Mide la altura real del elemento y la expone como
// --{variable}-height en :root, vía ResizeObserver.
// Copiado de js/common/behavior/height-observer.js (theme.js real).
class HeightObserver extends HTMLElement {
  constructor() {
    super();
    if (window.ResizeObserver) {
      new ResizeObserver(this._updateCustomProperties.bind(this)).observe(this);
    }
  }

  connectedCallback() {
    if (!window.ResizeObserver) {
      document.documentElement.style.setProperty(
        `--${this.getAttribute('variable')}-height`,
        `${this.clientHeight.toFixed(1)}px`
      );
    }
  }

  _updateCustomProperties(entries) {
    requestAnimationFrame(() => {
      entries.forEach((entry) => {
        if (entry.target === this) {
          const height = entry.borderBoxSize
            ? (entry.borderBoxSize.length > 0 ? entry.borderBoxSize[0].blockSize : entry.borderBoxSize.blockSize)
            : entry.target.clientHeight;
          document.documentElement.style.setProperty(
            `--${this.getAttribute('variable')}-height`,
            `${Math.round(height)}px`
          );
        }
      });
    });
  }
}

// ── MarqueeText ───────────────────────────────────────────────
// Calcula la duración de la animación de scroll según el ancho
// real del contenido, para mantener una velocidad de desplazamiento
// constante (no un tiempo fijo). El HTML debe traer el contenido
// YA duplicado las veces necesarias (ver announcement-bar.njk,
// scrolling-text.njk) — este componente NO clona ni reescribe el
// DOM, solo mide y setea la variable CSS --marquee-animation-duration.
// Copiado de js/common/ui/marquee-text.js (theme.js real).
class MarqueeText extends HTMLElement {
  constructor() {
    super();
    if (window.ResizeObserver) {
      new ResizeObserver(this._calculateDuration.bind(this)).observe(this);
    }
  }

  _calculateDuration(entries) {
    const scrollingSpeed = parseInt(this.getAttribute('scrolling-speed') || 5);
    const contentWidth = entries[0].contentRect.width;
    const slowFactor = 1 + (Math.min(1600, contentWidth) - 375) / (1600 - 375);
    const firstItem = entries[0].target.querySelector('span');
    if (!firstItem || !contentWidth) return;
    const duration = (scrollingSpeed * slowFactor * firstItem.clientWidth) / contentWidth;
    this.style.setProperty('--marquee-animation-duration', `${duration.toFixed(3)}s`);
  }
}

// ── Registrar Web Components ──────────────────────────────────
if (!customElements.get('height-observer')) customElements.define('height-observer', HeightObserver);
if (!customElements.get('marquee-text')) customElements.define('marquee-text', MarqueeText);
