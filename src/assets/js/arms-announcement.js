/* =============================================================
   ARMS Music — arms-announcement.js
   Web Components de la announcement bar:
   - HeightObserver: mide la altura real del elemento y la expone
     como --{variable}-height en :root, vía ResizeObserver.
   - MarqueeText: calcula la duración de la animación de scroll
     según el ancho del contenido, para mantener una velocidad
     de desplazamiento constante (no un tiempo fijo).
   Lógica confirmada contra el theme.js real de Impact.
============================================================= */

'use strict';

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ── HeightObserver ───────────────────────────────────────────
class HeightObserver extends HTMLElement {
  connectedCallback() {
    this.style.display = 'block';
    this._setHeight(); // medición inmediata, no depende del primer callback async

    if (!window.ResizeObserver) return;
    this._observer = new ResizeObserver(() => this._setHeight());
    this._observer.observe(this);
  }

  disconnectedCallback() {
    this._observer?.disconnect();
  }

  _setHeight() {
    const height = this.getBoundingClientRect().height || this.clientHeight;
    document.documentElement.style.setProperty(
      `--${this.getAttribute('variable')}-height`,
      `${Math.round(height)}px`
    );
  }
}

// ── MarqueeText ───────────────────────────────────────────────
class MarqueeText extends HTMLElement {
  connectedCallback() {
    if (!window.ResizeObserver) return;
    this._observer = new ResizeObserver(this._calculateDuration.bind(this));
    this._observer.observe(this);
  }

  disconnectedCallback() {
    this._observer?.disconnect();
  }

  _calculateDuration(entries) {
    if (prefersReducedMotion()) return;
    const scrollingSpeed = parseInt(this.getAttribute('scrolling-speed') || '50', 10);
    const contentWidth = entries[0].contentRect.width;
    const slowFactor = 1 + (Math.min(1600, contentWidth) - 375) / 1225;
    const firstItem = entries[0].target.querySelector('span');
    if (!firstItem || !contentWidth) return;
    const duration = scrollingSpeed * slowFactor * (firstItem.clientWidth / contentWidth);
    this.style.setProperty('--marquee-animation-duration', `${duration.toFixed(3)}s`);
  }
}

// ── Registrar Web Components ──────────────────────────────────
if (!customElements.get('height-observer')) customElements.define('height-observer', HeightObserver);
if (!customElements.get('marquee-text'))    customElements.define('marquee-text',    MarqueeText);
