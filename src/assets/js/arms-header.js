/* =============================================================
   ARMS Music — arms-header.js
   Web Component StoreHeader: comportamiento transparente-sobre-
   hero / sólido al hacer scroll, igual a Impact. Umbral y timing
   confirmados decompilando el theme.js real de Impact.
============================================================= */

'use strict';

function prefersReducedMotionHeader() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const STICKY_THRESHOLD = 500; // px — umbral real confirmado en Impact

class StoreHeader extends HTMLElement {
  connectedCallback() {
    this._hasSwitchedToSticky = false;
    this._abortController = new AbortController();
    const signal = this._abortController.signal;

    if (this.hasAttribute('sticky')) {
      window.addEventListener('scroll', this._onScroll.bind(this), { signal, passive: true });
    }

    // Si hay algún dropdown abierto, forzar fondo sólido para legibilidad
    this.addEventListener('toggle', this._checkTransparency.bind(this), { signal, capture: true });

    this._checkTransparency();
  }

  disconnectedCallback() {
    this._abortController?.abort();
  }

  _onScroll() {
    this._checkTransparency();
  }

  _checkTransparency() {
    const hasOpenDropdown = this.querySelectorAll('.header__dropdown.is-open').length > 0;

    if (hasOpenDropdown) {
      this.classList.add('is-filled');
      return;
    }

    if (window.scrollY > STICKY_THRESHOLD && !this._hasSwitchedToSticky) {
      this._hasSwitchedToSticky = true;
      this.classList.add('is-filled');
      if (!prefersReducedMotionHeader()) {
        this.animate(
          [{ transform: 'translateY(-100%)' }, { transform: 'translateY(0)' }],
          { duration: 150, easing: 'ease' }
        );
      }
    } else if (window.scrollY < STICKY_THRESHOLD && this._hasSwitchedToSticky) {
      this._hasSwitchedToSticky = false;
      if (!prefersReducedMotionHeader()) {
        this.animate(
          [{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }],
          { duration: 150, easing: 'ease' }
        ).finished.then(() => this.classList.remove('is-filled'));
      } else {
        this.classList.remove('is-filled');
      }
    }
  }
}

if (!customElements.get('store-header')) customElements.define('store-header', StoreHeader);

// ── Dropdown simple de categorías (Audio) ──────────────────────
window.toggleAudioDropdown = function() {
  const dropdown = document.getElementById('audio-dropdown');
  if (!dropdown) return;
  const willOpen = !dropdown.classList.contains('is-open');
  dropdown.classList.toggle('is-open', willOpen);

  if (willOpen) {
    const closeOnOutsideClick = (event) => {
      if (!dropdown.contains(event.target) && !event.target.closest('.header__link--dropdown')) {
        dropdown.classList.remove('is-open');
        document.removeEventListener('click', closeOnOutsideClick);
      }
    };
    setTimeout(() => document.addEventListener('click', closeOnOutsideClick), 0);
  }
};
