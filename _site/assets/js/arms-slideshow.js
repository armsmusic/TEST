/* =============================================================
   ARMS Music — arms-slideshow.js
   Web Components del hero slideshow de Impact
   Reescritos sin dependencias de Shopify ni de vendor (Motion One)
   Usa Web Animations API nativa del navegador
============================================================= */

'use strict';

// ── Utilidades ────────────────────────────────────────────────

function imageLoaded(imgs) {
  const images = Array.from(imgs);
  if (!images.length) return Promise.resolve();
  return Promise.all(images.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    });
  }));
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ── Player — maneja el autoplay ───────────────────────────────
class Player extends EventTarget {
  constructor(duration) {
    super();
    this._duration = parseInt(duration) * 1000; // segundos a ms
    this._timer    = null;
    this._paused   = true;
    this._elapsed  = 0;
    this._startTime = null;
  }

  resume(restart = false) {
    if (restart) this._elapsed = 0;
    if (!this._paused && !restart) return;
    this._paused   = false;
    this._startTime = Date.now();
    const remaining = this._duration - this._elapsed;
    this.dispatchEvent(new CustomEvent('player:start', { detail: { duration: remaining / 1000 } }));
    this._timer = setTimeout(() => {
      this._elapsed = 0;
      this.dispatchEvent(new CustomEvent('player:end'));
      this.resume(true);
    }, remaining);
  }

  pause() {
    if (this._paused) return;
    this._paused = true;
    this._elapsed += Date.now() - this._startTime;
    clearTimeout(this._timer);
    this.dispatchEvent(new CustomEvent('player:pause'));
  }

  stop() {
    this._paused  = true;
    this._elapsed = 0;
    clearTimeout(this._timer);
  }

  start() {
    this.stop();
    this.resume(true);
  }

  setDuration(seconds) {
    this._duration = seconds * 1000;
  }
}

// ── GestureArea — swipe en mobile ────────────────────────────
class GestureArea {
  constructor(el, { signal } = {}) {
    this._startX = null;
    el.addEventListener('pointerdown', e => { this._startX = e.clientX; }, { signal, passive: true });
    el.addEventListener('pointerup', e => {
      if (this._startX === null) return;
      const delta = e.clientX - this._startX;
      if (Math.abs(delta) > 50) {
        el.dispatchEvent(new CustomEvent(delta < 0 ? 'swipeleft' : 'swiperight', { bubbles: true }));
      }
      this._startX = null;
    }, { signal });
  }
}

// ── BaseCarousel ──────────────────────────────────────────────
class BaseCarousel extends HTMLElement {
  connectedCallback() {
    this._abortController = new AbortController();
    this._reloaded = false;

    if (this.items.length > 1) {
      this.addEventListener('carousel:filter',  this._filterItems,   { signal: this._abortController.signal });
      this.addEventListener('control:prev',     this.previous,       { signal: this._abortController.signal });
      this.addEventListener('control:next',     this.next,           { signal: this._abortController.signal });
      this.addEventListener('control:select',   (e) => this.select(e.detail.index), { signal: this._abortController.signal });
      this.addEventListener('carousel:select',  this._preloadImages, { signal: this._abortController.signal });
    }

    if (this.selectedIndex === 0) {
      if (this.selectedSlide) this.selectedSlide.classList.add('is-selected');
      this._dispatchEvent('carousel:select', 0);
    } else {
      this.select(this.selectedIndex, { animate: false, force: true });
    }
  }

  disconnectedCallback() {
    this._abortController?.abort();
  }

  get items() {
    if (this._items) return this._items;
    const selector = this.getAttribute('selector');
    this._items = Array.from(selector ? this.querySelectorAll(selector) : this.children);
    if (this.hasAttribute('reversed')) this._items.reverse();
    return this._items;
  }

  get visibleItems() {
    return this.items.filter(item => item.offsetParent !== null);
  }

  get selectedIndex() {
    return this._selectedIndex ?? parseInt(this.getAttribute('initial-index') || 0);
  }

  get selectedSlide() {
    return this.items[this.selectedIndex];
  }

  get previousSlide() {
    const idx = this.visibleItems.indexOf(this.selectedSlide);
    return this.loop
      ? this.visibleItems[(idx - 1 + this.visibleItems.length) % this.visibleItems.length]
      : this.visibleItems[Math.max(idx - 1, 0)];
  }

  get nextSlide() {
    const idx = this.visibleItems.indexOf(this.selectedSlide);
    return this.loop
      ? this.visibleItems[(idx + 1) % this.visibleItems.length]
      : this.visibleItems[Math.min(idx + 1, this.visibleItems.length - 1)];
  }

  get loop() { return false; }

  previous() {
    this.select(this.items.indexOf(this.previousSlide), { direction: 'previous' });
  }

  next() {
    this.select(this.items.indexOf(this.nextSlide), { direction: 'next' });
  }

  async select(index, { animate = true, force = false, direction } = {}) {
    if (!force && this._selectedIndex === index) return;
    const fromSlide = this.selectedSlide;
    this._selectedIndex = index;
    const toSlide = this.selectedSlide;
    if (fromSlide && toSlide && fromSlide !== toSlide) {
      await this._transitionTo(fromSlide, toSlide, { direction, animate });
    }
    this._dispatchEvent('carousel:select', index);
    this._dispatchEvent('carousel:settle', index);
  }

  _transitionTo(fromSlide, toSlide, options = {}) {}

  _filterItems(event) {
    this.items.forEach((item, i) => item.hidden = event.detail.filteredIndexes.includes(i));
  }

  _preloadImages() {
    requestAnimationFrame(() => {
      [this.previousSlide, this.nextSlide].forEach(item => {
        if (!item) return;
        item.querySelectorAll('img[loading="lazy"]').forEach(img => img.removeAttribute('loading'));
      });
    });
  }

  _dispatchEvent(name, index) {
    this.dispatchEvent(new CustomEvent(name, {
      bubbles: true,
      detail: { slide: this.items[index], index }
    }));
  }
}

// ── EffectCarousel ────────────────────────────────────────────
class EffectCarousel extends BaseCarousel {
  connectedCallback() {
    if (this.items.length > 1 && this.hasAttribute('autoplay')) {
      this._player = new Player(this.getAttribute('autoplay'));
      this._player.addEventListener('player:end', this.next.bind(this));

      // Pausar cuando la página no es visible
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') this._player.pause();
        else this._player.resume();
      });

      // Iniciar cuando entra en viewport
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => e.isIntersecting ? this._player.resume(true) : this._player.pause());
      }, { threshold: 0.1 });
      io.observe(this);
    }

    super.connectedCallback();

    if (this.items.length > 1 && this.swipeable) {
      new GestureArea(this, { signal: this._abortController.signal });
      this.addEventListener('swipeleft',  this.next.bind(this),     { signal: this._abortController.signal });
      this.addEventListener('swiperight', this.previous.bind(this), { signal: this._abortController.signal });
    }
  }

  get player()     { return this._player; }
  get loop()       { return true; }
  get swipeable()  { return !this.hasAttribute('swipeable') || this.getAttribute('swipeable') !== 'false'; }
}

// ── PageDots ──────────────────────────────────────────────────
class PageDots extends HTMLElement {
  connectedCallback() {
    this._abortController = new AbortController();
    this.items = Array.from(this.children);
    this.items.forEach((btn, i) =>
      btn.addEventListener('click', () => this.select(i), { signal: this._abortController.signal })
    );
    if (this.controlledElement) {
      this.controlledElement.addEventListener('carousel:select', (e) => this.select(e.detail.index, false), { signal: this._abortController.signal });
    }
  }

  disconnectedCallback() { this._abortController?.abort(); }

  get controlledElement() {
    return this.hasAttribute('aria-controls')
      ? document.getElementById(this.getAttribute('aria-controls'))
      : null;
  }

  get selectedIndex() {
    return this.items.findIndex(btn => btn.getAttribute('aria-current') === 'true');
  }

  select(index, dispatch = true) {
    if (this.selectedIndex === index) return;
    this.items.forEach((btn, i) => {
      if (i === index) btn.setAttribute('aria-current', 'true');
      else btn.removeAttribute('aria-current');
    });
    if (dispatch) {
      (this.controlledElement ?? this).dispatchEvent(
        new CustomEvent('control:select', { bubbles: true, cancelable: true, detail: { index } })
      );
    }
  }
}

// ── PrevButton / NextButton ───────────────────────────────────
class PrevButton extends HTMLButtonElement {
  connectedCallback() {
    this._abortController = new AbortController();
    this.addEventListener('click', () =>
      (this.controlledElement ?? this).dispatchEvent(new CustomEvent('control:prev', { bubbles: true })),
      { signal: this._abortController.signal }
    );
  }
  disconnectedCallback() { this._abortController?.abort(); }
  get controlledElement() {
    return this.hasAttribute('aria-controls')
      ? document.getElementById(this.getAttribute('aria-controls'))
      : null;
  }
}

class NextButton extends HTMLButtonElement {
  connectedCallback() {
    this._abortController = new AbortController();
    this.addEventListener('click', () =>
      (this.controlledElement ?? this).dispatchEvent(new CustomEvent('control:next', { bubbles: true })),
      { signal: this._abortController.signal }
    );
  }
  disconnectedCallback() { this._abortController?.abort(); }
  get controlledElement() {
    return this.hasAttribute('aria-controls')
      ? document.getElementById(this.getAttribute('aria-controls'))
      : null;
  }
}

// ── SplitLines ────────────────────────────────────────────────
class SplitLines extends HTMLElement {
  constructor() {
    super();
    this._lastWidth = window.innerWidth;
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = '<slot></slot>';
    window.addEventListener('resize', () => {
      if (this._lastWidth !== window.innerWidth) {
        this._lastWidth = window.innerWidth;
        this._split();
      }
    }, { passive: true });
  }

  connectedCallback() { this._split(); }

  _split() {
    const text = this.textContent;
    this.shadowRoot.innerHTML = text
      .split('')
      .map(c => `<span>${c === ' ' ? ' ' : c}</span>`)
      .join('');

    const lines = new Map();
    Array.from(this.shadowRoot.children).forEach(span => {
      const top = Math.round(span.getBoundingClientRect().top);
      lines.set(top, (lines.get(top) || '') + span.textContent);
    });

    this.shadowRoot.innerHTML = Array.from(lines.values())
      .map(line => `<span style="display:inline-block"><span style="display:block">${line}</span></span>`)
      .join('');
  }

  get lines() { return Array.from(this.shadowRoot.children); }
}

// ── SlideshowCarousel ─────────────────────────────────────────
class SlideshowCarousel extends EffectCarousel {
  constructor() {
    super();
    this.addEventListener('carousel:select', this._onSlideSelected.bind(this));
    if (this.hasAttribute('reveal-on-scroll')) {
      const io = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) { this._reveal(); io.disconnect(); }
      });
      io.observe(this);
    }
  }

  connectedCallback() {
    super.connectedCallback();

    if (this._player && this.hasAttribute('autoplay')) {
      this._player.addEventListener('player:start', (e) => {
        this._animateNumberedDots(e.detail.duration);
      });
    }
  }

  get transitionType() {
    return prefersReducedMotion() ? 'fade' : (this.getAttribute('transition') || 'fade');
  }

  async _reveal() {
    const slide = this.selectedSlide;
    if (!slide) return;
    await imageLoaded(slide.querySelectorAll('img'));
    this.style.opacity = '1';
    if (prefersReducedMotion()) return;

    const imgs  = slide.querySelectorAll('img, video');
    const sub   = slide.querySelectorAll('[data-sequence="subheading"], .button');
    const head  = slide.querySelector('[data-sequence="heading"]');
    const ctrls = this.querySelector('.slideshow__controls');

    // Animar imágenes
    imgs.forEach(img => img.animate(
      [{ opacity: 0, transform: 'scale(1.05)' }, { opacity: 1, transform: 'scale(1)' }],
      { duration: 300, easing: 'ease-out', fill: 'forwards' }
    ));

    // Animar subheading y botón
    sub.forEach(el => el.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 300, delay: 150, easing: 'ease-out', fill: 'forwards' }
    ));

    // Animar heading con split-lines
    if (head) {
      const splitEl = head.querySelector('split-lines');
      const lines = splitEl ? splitEl.lines : [head];
      lines.forEach((line, i) => {
        const inner = line.querySelector('span') || line;
        inner.animate(
          [
            { opacity: 0, transform: 'translateY(0.5em) rotateZ(5deg)' },
            { opacity: 1, transform: 'translateY(0) rotateZ(0)' }
          ],
          { duration: 400, delay: 150 + i * 100, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }
        );
      });
    }

    // Animar controles
    if (ctrls) ctrls.animate(
      [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 300, delay: 200, easing: 'ease-out', fill: 'forwards' }
    );
  }

  async _transitionTo(fromSlide, toSlide, { animate = true } = {}) {
    const type = this.transitionType;

    if (type === 'fade_with_text') {
      await this._fadeWithText(fromSlide, toSlide, animate);
    } else {
      await this._fade(fromSlide, toSlide, animate);
    }
  }

  _fade(fromSlide, toSlide, animate = true) {
    fromSlide.classList.remove('is-selected');
    toSlide.classList.add('is-selected');

    const duration = animate ? 300 : 0;

    const aFrom = fromSlide.animate(
      [{ opacity: 1, visibility: 'visible', zIndex: 1 }, { opacity: 0, visibility: 'hidden', zIndex: 0 }],
      { duration, easing: 'ease-in', fill: 'forwards' }
    );
    toSlide.animate(
      [{ opacity: 0, visibility: 'hidden', zIndex: 0 }, { opacity: 1, visibility: 'visible', zIndex: 1 }],
      { duration, easing: 'ease-out', fill: 'forwards' }
    );

    return aFrom.finished;
  }

  async _fadeWithText(fromSlide, toSlide, animate = true) {
    fromSlide.classList.remove('is-selected');
    const duration = animate ? 300 : 0;

    fromSlide.animate(
      [{ opacity: 1, visibility: 'visible', zIndex: 1 }, { opacity: 0, visibility: 'hidden', zIndex: 0 }],
      { duration, easing: 'ease-in', fill: 'forwards' }
    );

    await imageLoaded(toSlide.querySelectorAll('img'));
    toSlide.classList.add('is-selected');

    toSlide.animate(
      [{ opacity: 0, visibility: 'hidden' }, { opacity: 1, visibility: 'visible' }],
      { duration: 0, fill: 'forwards' }
    );

    // Animar imagen del slide entrante
    toSlide.querySelectorAll('img, video').forEach(img =>
      img.animate(
        [{ opacity: 0, transform: 'scale(1.05)' }, { opacity: 1, transform: 'scale(1)' }],
        { duration, easing: 'ease-out', fill: 'forwards' }
      )
    );

    // Animar texto
    const sub  = toSlide.querySelectorAll('[data-sequence="subheading"], .button');
    const head = toSlide.querySelector('[data-sequence="heading"]');

    sub.forEach(el => el.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration, delay: 100, easing: 'ease-out', fill: 'forwards' }
    ));

    if (head) {
      const splitEl = head.querySelector('split-lines');
      const lines = splitEl ? splitEl.lines : [head];
      lines.forEach((line, i) => {
        const inner = line.querySelector('span') || line;
        inner.animate(
          [
            { opacity: 0, transform: 'translateY(0.5em) rotateZ(5deg)' },
            { opacity: 1, transform: 'translateY(0) rotateZ(0)' }
          ],
          { duration: 400, delay: 100 + i * 100, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }
        );
      });
    }
  }

  _animateNumberedDots(duration) {
    const circles = Array.from(this.querySelectorAll('.numbered-dots__item'));
    circles.forEach(item => {
      const circle = item.querySelector('circle:last-child');
      if (!circle) return;

      // Cancelar cualquier animación WAAPI previa — con fill:'forwards' el efecto
      // persiste con mayor precedencia que circle.style, dejando el aro de un dot
      // ya inactivo con un trazo más opaco/grueso que el resto.
      circle.getAnimations().forEach(anim => anim.cancel());

      const len = circle.getTotalLength();
      if (item.getAttribute('aria-current') === 'true') {
        circle.animate(
          [
            { strokeDasharray: `0px, ${len}px` },
            { strokeDasharray: `${len}px, ${len}px` }
          ],
          { duration: duration * 1000, easing: 'linear', fill: 'forwards' }
        );
      } else {
        circle.style.strokeDasharray = `${len}px, ${len}px`;
      }
    });
  }

  async _onSlideSelected(event) {
    // Resetear animaciones de dots
    this._animateNumberedDots(this._player?._duration / 1000 || 6);
  }
}

// ── Slideshow (x-slideshow) ───────────────────────────────────
class Slideshow extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('carousel:select', this._onSlideSelected.bind(this));
  }

  async _onSlideSelected(event) {
    if (!event.detail?.slide) return;
    const slideStyles = getComputedStyle(event.detail.slide);
    this.style.setProperty('--slideshow-controls-color',
      slideStyles.getPropertyValue('--slideshow-slide-controls-color'));

    if (!this.classList.contains('slideshow--boxed')) return;

    const bg  = slideStyles.getPropertyValue('--slideshow-slide-background');
    const bgEl = this.querySelector('.slideshow__slide-background');
    if (!bgEl || !bg) return;

    bgEl.style.background = bg;
    const anim = bgEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'forwards' });
    await anim.finished;
    this.style.setProperty('--slideshow-background', bg);
    bgEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 0, fill: 'forwards' });
  }
}

// ── CustomCursor — círculo que sigue al mouse con flecha prev/next ──
class CustomCursor extends HTMLElement {
  connectedCallback() {
    this._abortController = new AbortController();
    const signal = this._abortController.signal;
    this._container = this.parentElement;
    if (!this._container) return;

    this._ring = this.querySelector('.slideshow__cursor-ring circle');
    if (this._ring) {
      this._radius = this._ring.r.baseVal.value;
      this._circumference = 2 * Math.PI * this._radius;
    }

    // Solo en dispositivos con mouse fino (no touch)
    if (!window.matchMedia('(pointer: fine)').matches) return;

    this._container.addEventListener('pointermove', this._onPointerMove.bind(this), { signal });
    this._container.addEventListener('pointerleave', this._onPointerLeave.bind(this), { signal });
    this.addEventListener('click', this._onClick.bind(this), { signal });
  }

  disconnectedCallback() {
    this._abortController?.abort();
    this._stopProgressLoop();
  }

  _onPointerMove(event) {
    if (event.pointerType !== 'mouse') return;
    const rect = this._container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.style.translate = `${x}px ${y}px`;
    this.classList.toggle('is-half-start', x < rect.width / 2);

    if (!this._visible) {
      this._visible = true;
      this.getAnimations().forEach(a => a.cancel());
      this.animate([{ opacity: 0, scale: 0.5, visibility: 'hidden' }, { opacity: 1, scale: 1, visibility: 'visible' }],
        { duration: 150, easing: 'ease', fill: 'forwards' });
      this._startProgressLoop();
    }
  }

  _onPointerLeave() {
    this._visible = false;
    this.getAnimations().forEach(a => a.cancel());
    this.animate([{ opacity: 1, scale: 1, visibility: 'visible' }, { opacity: 0, scale: 0.5, visibility: 'hidden' }],
      { duration: 100, easing: 'ease', fill: 'forwards' });
    this._stopProgressLoop();
  }

  _onClick() {
    const isHalfStart = this.classList.contains('is-half-start');
    (this.controlledElement ?? this._container)?.dispatchEvent(
      new CustomEvent(isHalfStart ? 'control:prev' : 'control:next', { bubbles: true })
    );
  }

  // Sincroniza el aro de progreso con el Player del autoplay mientras el cursor está visible
  _startProgressLoop() {
    if (!this._ring || this._rafId) return;
    const player = this._container.player;
    const tick = () => {
      if (player && player._startTime && !player._paused) {
        const elapsed = player._elapsed + (Date.now() - player._startTime);
        const progress = Math.min(elapsed / player._duration, 1);
        this._ring.style.strokeDasharray = `${this._circumference * progress}px, ${this._circumference}px`;
      }
      this._rafId = requestAnimationFrame(tick);
    };
    this._rafId = requestAnimationFrame(tick);
  }

  _stopProgressLoop() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  get controlledElement() {
    return this.hasAttribute('aria-controls')
      ? document.getElementById(this.getAttribute('aria-controls'))
      : null;
  }
}

// ── Registrar Web Components ──────────────────────────────────
if (!customElements.get('page-dots'))          customElements.define('page-dots',          PageDots);
if (!customElements.get('custom-cursor'))      customElements.define('custom-cursor',      CustomCursor);
if (!customElements.get('prev-button'))        customElements.define('prev-button',        PrevButton,        { extends: 'button' });
if (!customElements.get('next-button'))        customElements.define('next-button',        NextButton,        { extends: 'button' });
if (!customElements.get('split-lines'))        customElements.define('split-lines',        SplitLines);
if (!customElements.get('slideshow-carousel')) customElements.define('slideshow-carousel', SlideshowCarousel);
if (!customElements.get('x-slideshow'))        customElements.define('x-slideshow',        Slideshow);
