/* =============================================================
   ARMS Music — arms-home.js
   Web Components y animaciones para las secciones Impact del
   home migradas después del hero:
   - Grupo 1: image-link-blocks, scrolling-text, collection-list
   - Grupo 2: featured-collection, impact-text,
     image-with-text-overlay (esta última no requiere JS, solo CSS)

   BaseCarousel aquí es una copia independiente de la misma clase
   en arms-slideshow.js (decisión deliberada: el hero todavía no
   está verificado visualmente, así que evitamos tocar ese archivo
   o crear una dependencia entre módulos por ahora. Si en el futuro
   se unifica el JS del home, ambas copias se pueden fusionar).
   La reusa: <image-link-blocks>, <collection-list>, <scroll-carousel>
   (esta última usada también por featured-collection).

   Motion One se usa aquí para dos patrones de reveal-on-scroll
   del HTML original de Impact:
   - [reveal-js]: collection-card e impact-text (con stagger)
   - [reveal-on-scroll="true"]: títulos de section-header (sin stagger)
   Es la primera vez que el proyecto usa esta librería — el hero
   NO la usa (usa Web Animations API nativa).
============================================================= */

'use strict';

import { animate, inView } from 'https://cdn.jsdelivr.net/npm/motion@12/+esm';


// ── BaseCarousel — scroll horizontal genérico con botones prev/next ──
// Usado por: <image-link-blocks>, <collection-list>, <scroll-carousel>
class BaseCarousel extends HTMLElement {
  connectedCallback() {
    this._abortController = new AbortController();
    this._updateScrollState();

    this.addEventListener('scroll', () => this._updateScrollState(), {
      signal: this._abortController.signal,
      passive: true,
    });

    this.addEventListener('control:prev', () => this.previous(), {
      signal: this._abortController.signal,
    });
    this.addEventListener('control:next', () => this.next(), {
      signal: this._abortController.signal,
    });

    window.addEventListener('resize', () => this._updateScrollState(), {
      signal: this._abortController.signal,
      passive: true,
    });
  }

  disconnectedCallback() {
    this._abortController?.abort();
  }

  get items() {
    const selector = this.getAttribute('selector');
    return Array.from(selector ? this.querySelectorAll(selector) : this.children);
  }

  get scrollStep() {
    // Avanza el ancho del primer item + su gap aproximado
    const first = this.items[0];
    return first ? first.getBoundingClientRect().width + 16 : this.clientWidth * 0.8;
  }

  previous() {
    this.scrollBy({ left: -this.scrollStep, behavior: 'smooth' });
  }

  next() {
    this.scrollBy({ left: this.scrollStep, behavior: 'smooth' });
  }

  // Habilita/deshabilita los botones prev/next según la posición real
  // del scroll, y expone .is-scrollable para el hover de los controles
  // (ver .floating-controls-container en arms.css)
  _updateScrollState() {
    const maxScroll = this.scrollWidth - this.clientWidth;
    const isScrollable = maxScroll > 1;
    this.classList.toggle('is-scrollable', isScrollable);

    const controlsContainer = this.closest('.floating-controls-container');
    if (!controlsContainer) return;

    const prevBtn = controlsContainer.querySelector('[is="prev-button"]');
    const nextBtn = controlsContainer.querySelector('[is="next-button"]');
    if (prevBtn) prevBtn.disabled = this.scrollLeft <= 1;
    if (nextBtn) nextBtn.disabled = this.scrollLeft >= maxScroll - 1;
  }
}

// ── PrevButton / NextButton — comparten contrato con arms-slideshow.js ──
// (mismo patrón: dispatchean control:prev/control:next al elemento
// referenciado por aria-controls). Se registran aquí solo si todavía
// no existen, para evitar choques si ambos scripts cargan en la página.
class HomePrevButton extends HTMLButtonElement {
  connectedCallback() {
    this._abortController = new AbortController();
    this.addEventListener('click', () =>
      this.controlledElement?.dispatchEvent(new CustomEvent('control:prev', { bubbles: true })),
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

class HomeNextButton extends HTMLButtonElement {
  connectedCallback() {
    this._abortController = new AbortController();
    this.addEventListener('click', () =>
      this.controlledElement?.dispatchEvent(new CustomEvent('control:next', { bubbles: true })),
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

// ── MarqueeText — duplica su contenido las veces necesarias para
// llenar el ancho disponible + 1 copia extra, y calcula la duración
// de la animación CSS (translateFull, definida en arms.css) según
// el ancho real medido y el atributo scrolling-speed (px/segundo
// aproximado: valores más altos = más rápido). ──
class MarqueeText extends HTMLElement {
  connectedCallback() {
    this._originalChildren = Array.from(this.children).map(el => el.cloneNode(true));
    this._abortController = new AbortController();

    this._measureAndBuild();

    window.addEventListener('resize', () => this._measureAndBuild(), {
      signal: this._abortController.signal,
      passive: true,
    });
  }

  disconnectedCallback() {
    this._abortController?.abort();
  }

  get speed() {
    // "scrolling-speed" en el HTML es una escala 1–10 (más alto = más rápido).
    // La convertimos a px/segundo reales para el cálculo de duración.
    const scale = parseFloat(this.getAttribute('scrolling-speed')) || 5;
    return scale * 30; // px/segundo aproximados
  }

  _measureAndBuild() {
    // Medir el ancho de una sola copia del contenido original
    const probe = this._originalChildren[0].cloneNode(true);
    probe.style.visibility = 'hidden';
    probe.style.position = 'absolute';
    probe.setAttribute('aria-hidden', 'true');
    this.appendChild(probe);
    const singleWidth = probe.getBoundingClientRect().width;
    probe.remove();

    if (!singleWidth) return;

    const containerWidth = this.parentElement?.clientWidth || window.innerWidth;
    // Necesitamos suficientes copias para cubrir 2x el contenedor
    // (una pantalla visible + una de margen para el loop sin cortes)
    const copiesNeeded = Math.max(2, Math.ceil((containerWidth * 2) / singleWidth));

    this.innerHTML = '';
    for (let i = 0; i < copiesNeeded; i++) {
      const clone = this._originalChildren[0].cloneNode(true);
      if (i > 0) clone.setAttribute('aria-hidden', 'true');
      this.appendChild(clone);
    }

    const totalWidth = singleWidth * copiesNeeded;
    const duration = totalWidth / this.speed;
    this.style.setProperty('--marquee-animation-duration', `${duration}s`);
  }
}

// ── ImpactText — el texto gigante con gradiente de impact-text.njk.
// Soporta el atributo count-up="N" (ej. count-up="5.4"): anima el
// número desde 0 hasta N cuando entra en viewport, respetando
// decimales si el valor objetivo los tiene. Sin count-up, no hace
// nada propio — la animación de entrada del bloque la maneja
// initRevealJs() vía su atributo reveal-js (igual que collection-card). ──
class ImpactTextEl extends HTMLElement {
  connectedCallback() {
    const target = parseFloat(this.getAttribute('count-up'));
    if (Number.isNaN(target)) return;

    const decimals = (this.getAttribute('count-up').split('.')[1] || '').length;
    const span = this.querySelector('span');
    if (!span) return;

    inView(this, () => {
      animate(0, target, {
        duration: 1.2,
        easing: 'ease-out',
        onUpdate: (value) => {
          span.textContent = value.toFixed(decimals);
        },
      });
    }, { margin: '0px 0px -10% 0px' });
  }
}

// ── VideoMedia — wrapper de <video> con autoplay para media-grid.
// Versión simplificada del video-media de Impact: no implementa el
// sistema completo de play/pause manual (play-button, Shadow DOM
// parts), porque el único uso actual es autoplay en loop muteado.
// Marca [loaded] cuando el video puede reproducirse, lo que activa
// vía CSS (arms.css) el fade del poster hacia el video real. ──
class VideoMediaEl extends HTMLElement {
  connectedCallback() {
    const video = this.querySelector('video');
    if (!video) return;

    if (this.hasAttribute('autoplay')) {
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.play().catch(() => {
        // Autoplay bloqueado por el navegador (raro con muted, pero
        // puede pasar) — se queda en el poster, sin romper nada.
      });
    }

    const markLoaded = () => this.setAttribute('loaded', '');
    if (video.readyState >= 2) markLoaded();
    else video.addEventListener('loadeddata', markLoaded, { once: true });
  }
}

// ── SplitCursor — maneja el arrastre del comparador before-after.
// Actualiza --before-after-initial-drag-position en el contenedor
// .before-after padre; el clip-path del .before-after__after-image
// reacciona solo vía CSS (ver arms.css), este componente solo
// calcula la posición X del puntero relativa al contenedor. ──
class SplitCursorEl extends HTMLElement {
  connectedCallback() {
    this._container = this.closest('.before-after');
    if (!this._container) return;

    this._abortController = new AbortController();
    const signal = this._abortController.signal;

    this.addEventListener('pointerdown', (e) => this._startDrag(e), { signal });
    this.addEventListener('keydown', (e) => this._handleKeydown(e), { signal });
  }

  disconnectedCallback() {
    this._abortController?.abort();
  }

  _startDrag(e) {
    this.setPointerCapture(e.pointerId);
    const onMove = (ev) => this._updatePosition(ev.clientX);
    const onUp = () => {
      this.removeEventListener('pointermove', onMove);
      this.removeEventListener('pointerup', onUp);
    };
    this.addEventListener('pointermove', onMove);
    this.addEventListener('pointerup', onUp, { once: true });
    this._updatePosition(e.clientX);
  }

  _updatePosition(clientX) {
    const rect = this._container.getBoundingClientRect();
    const percent = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    this._container.style.setProperty('--before-after-initial-drag-position', `${percent}%`);
  }

  _handleKeydown(e) {
    const current = parseFloat(getComputedStyle(this._container).getPropertyValue('--before-after-initial-drag-position')) || 50;
    if (e.key === 'ArrowLeft') {
      this._container.style.setProperty('--before-after-initial-drag-position', `${Math.max(0, current - 5)}%`);
    } else if (e.key === 'ArrowRight') {
      this._container.style.setProperty('--before-after-initial-drag-position', `${Math.min(100, current + 5)}%`);
    }
  }
}

// ── PressCarousel — carrusel de "selección" (un item visible a la
// vez, fade entre ellos), no scroll libre como BaseCarousel. Usa el
// mismo contrato control:prev/control:next/control:select que
// BaseCarousel y PageDots, así que es compatible con los mismos
// botones prev/next y con <page-dots> sin cambios. ──
class PressCarouselEl extends HTMLElement {
  connectedCallback() {
    this._abortController = new AbortController();
    const signal = this._abortController.signal;

    this.addEventListener('control:prev', () => this._step(-1), { signal });
    this.addEventListener('control:next', () => this._step(1), { signal });
    this.addEventListener('control:select', (e) => this._select(e.detail.index), { signal });
  }

  disconnectedCallback() {
    this._abortController?.abort();
  }

  get items() {
    return Array.from(this.children);
  }

  get selectedIndex() {
    return this.items.findIndex((item) => item.classList.contains('is-selected'));
  }

  _step(delta) {
    const count = this.items.length;
    const next = (this.selectedIndex + delta + count) % count;
    this._select(next);
  }

  _select(index) {
    this.items.forEach((item, i) => item.classList.toggle('is-selected', i === index));
    this.dispatchEvent(new CustomEvent('carousel:select', { bubbles: true, detail: { index } }));
  }
}

// ── Hot-spots — puntos clickeables sobre imagen de producto.
// No usa Web Component con Shadow DOM (a diferencia de <x-popover>
// en Impact); en su lugar, cada <button class="hot-spot__dot">
// despliega/oculta el <div class="arms-popover"> hermano que le
// sigue en el DOM. Cierra con click en overlay, botón, o Escape. ──
function initHotSpots() {
  const dots = document.querySelectorAll('.hot-spot__dot');
  if (!dots.length) return;

  dots.forEach((dot) => {
    const popoverId = dot.getAttribute('aria-controls');
    const popover = popoverId ? document.getElementById(popoverId) : null;
    if (!popover) return;

    const close = () => {
      popover.removeAttribute('open');
      dot.setAttribute('aria-expanded', 'false');
    };

    const open = () => {
      popover.setAttribute('open', '');
      dot.setAttribute('aria-expanded', 'true');
    };

    dot.addEventListener('click', () => {
      const isOpen = dot.getAttribute('aria-expanded') === 'true';
      // Cierra cualquier otro popover abierto antes de abrir este
      dots.forEach((other) => {
        if (other !== dot) {
          const otherPopover = document.getElementById(other.getAttribute('aria-controls'));
          otherPopover?.removeAttribute('open');
          other.setAttribute('aria-expanded', 'false');
        }
      });
      isOpen ? close() : open();
    });

    const overlay = popover.querySelector('.arms-popover__overlay');
    overlay?.addEventListener('click', close);

    popover.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dots.forEach((dot) => {
        const popover = document.getElementById(dot.getAttribute('aria-controls'));
        popover?.removeAttribute('open');
        dot.setAttribute('aria-expanded', 'false');
      });
    }
  });
}

// ── MultipleImagesWithText — navega entre bloques de texto de
// multiple-images-with-text.njk. Cada bloque de texto tiene
// [image-id] apuntando a la imagen correspondiente (no se usa para
// cambiar imagen visible aquí, ambas imágenes están siempre
// dispersas en pantalla — solo se usa para mantener el contrato
// del HTML original de Impact). Comparte el mismo contrato
// control:prev/control:next que BaseCarousel, así que reutiliza los
// mismos botones is="prev-button"/is="next-button". ──
class MultipleImagesWithTextEl extends HTMLElement {
  connectedCallback() {
    this._abortController = new AbortController();
    const signal = this._abortController.signal;

    this.addEventListener('control:prev', () => this._step(-1), { signal });
    this.addEventListener('control:next', () => this._step(1), { signal });
  }

  disconnectedCallback() {
    this._abortController?.abort();
  }

  get contentList() {
    return this.querySelector('multiple-images-with-text-content-list');
  }

  get items() {
    return this.contentList ? Array.from(this.contentList.children) : [];
  }

  get selectedIndex() {
    return this.items.findIndex((item) => item.classList.contains('is-selected'));
  }

  _step(delta) {
    const items = this.items;
    const count = items.length;
    if (!count) return;

    const current = this.selectedIndex;
    const next = (current + delta + count) % count;

    items.forEach((item, i) => {
      item.classList.toggle('is-selected', i === next);
      item.classList.toggle('reveal-invisible', i !== next);
    });
  }
}

// ── RevealedImage — anima el clip-path de la imagen interior según
// el progreso de scroll dentro del .revealed-image__scroll-tracker
// (que mide 100% de la altura del .revealed-image, 180vh definido
// en arms.css). Progreso 0 = imagen pequeña recortada al centro;
// progreso 1 = imagen completa, texto "inside" visible. Usa
// requestAnimationFrame + IntersectionObserver para no calcular
// nada fuera de vista (mejor performance que un scroll listener
// global sin throttle). ──
class RevealedImageEl extends HTMLElement {
  connectedCallback() {
    this._tracker = this.querySelector('.revealed-image__scroll-tracker');
    this._scroller = this.querySelector('.revealed-image__scroller');
    if (!this._tracker || !this._scroller) return;

    this._ticking = false;
    this._onScroll = () => {
      if (this._ticking) return;
      this._ticking = true;
      requestAnimationFrame(() => {
        this._updateProgress();
        this._ticking = false;
      });
    };

    this._observer = new IntersectionObserver((entries) => {
      const isVisible = entries[0]?.isIntersecting;
      window[isVisible ? 'addEventListener' : 'removeEventListener']('scroll', this._onScroll, { passive: true });
      if (isVisible) this._updateProgress();
    });
    this._observer.observe(this);
  }

  disconnectedCallback() {
    window.removeEventListener('scroll', this._onScroll);
    this._observer?.disconnect();
  }

  _updateProgress() {
    const rect = this._tracker.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    // progreso 0 cuando el tracker entra por abajo, 1 cuando termina
    // de pasar por arriba — recorrido total = altura del tracker + viewport
    const total = rect.height + viewportHeight;
    const scrolled = viewportHeight - rect.top;
    const progress = Math.min(1, Math.max(0, scrolled / total));

    // inset() de 37%/37%/41% (pequeño) a 0 (pantalla completa)
    const insetValue = 37 * (1 - progress);
    const insetBottom = 41 * (1 - progress);
    this.style.setProperty('--reveal-inset', `${insetValue}% ${insetValue}% ${insetBottom}%`);

    // el texto "outside" se desvanece, el "inside" aparece cuando
    // el progreso supera ~60% (la imagen ya cubre la mayor parte)
    const outside = this.querySelector('.revealed-image__content--outside');
    const inside = this.querySelector('.revealed-image__content--inside');
    if (outside) outside.style.setProperty('--reveal-content-opacity', progress < 0.5 ? 1 - progress * 2 : 0);
    if (inside) inside.style.setProperty('--reveal-content-opacity', progress > 0.6 ? Math.min(1, (progress - 0.6) / 0.3) : 0);
  }
}

// ── AccordionDisclosure — extiende <details> nativo (is="accordion-disclosure")
// para animar la apertura/cierre con Motion One en vez del toggle
// instantáneo por defecto del navegador. Mide la altura real del
// .accordion__content y anima height + opacity. ──
class AccordionDisclosureEl extends HTMLDetailsElement {
  connectedCallback() {
    this._summary = this.querySelector('summary');
    this._content = this.querySelector('.accordion__content');
    if (!this._summary || !this._content) return;

    this._abortController = new AbortController();
    this._summary.addEventListener('click', (e) => this._handleClick(e), {
      signal: this._abortController.signal,
    });
  }

  disconnectedCallback() {
    this._abortController?.abort();
  }

  _handleClick(e) {
    e.preventDefault();
    if (this._animating) return;

    this.open ? this._close() : this._open();
  }

  _open() {
    this.open = true;
    this.setAttribute('aria-expanded', 'true');
    this._animating = true;

    const targetHeight = this._content.scrollHeight;
    animate(
      this._content,
      { height: [0, `${targetHeight}px`], opacity: [0, 1] },
      { duration: 0.3, easing: 'ease-out' }
    ).then(() => {
      this._content.style.height = 'auto';
      this._animating = false;
    });
  }

  _close() {
    this.setAttribute('aria-expanded', 'false');
    this._animating = true;

    const currentHeight = this._content.scrollHeight;
    animate(
      this._content,
      { height: [`${currentHeight}px`, 0], opacity: [1, 0] },
      { duration: 0.25, easing: 'ease-out' }
    ).then(() => {
      this.open = false;
      this._animating = false;
    });
  }
}

// ── Registrar Web Components ──────────────────────────────────
if (!customElements.get('image-link-blocks')) customElements.define('image-link-blocks', BaseCarousel);
if (!customElements.get('collection-list'))   customElements.define('collection-list',   BaseCarousel);
if (!customElements.get('scroll-carousel'))   customElements.define('scroll-carousel',   BaseCarousel);
if (!customElements.get('marquee-text')) customElements.define('marquee-text', MarqueeText);
if (!customElements.get('impact-text'))  customElements.define('impact-text',  ImpactTextEl);
if (!customElements.get('video-media'))  customElements.define('video-media',  VideoMediaEl);
if (!customElements.get('split-cursor')) customElements.define('split-cursor', SplitCursorEl);
if (!customElements.get('press-carousel')) customElements.define('press-carousel', PressCarouselEl);
if (!customElements.get('multiple-images-with-text')) customElements.define('multiple-images-with-text', MultipleImagesWithTextEl);
if (!customElements.get('revealed-image')) customElements.define('revealed-image', RevealedImageEl);
if (!customElements.get('accordion-disclosure')) customElements.define('accordion-disclosure', AccordionDisclosureEl, { extends: 'details' });

// prev-button / next-button ya quedan registrados por arms-slideshow.js
// (mismo contrato is="prev-button"/is="next-button"). Si este archivo
// se usa en una página sin arms-slideshow.js, los registramos aquí:
if (!customElements.get('prev-button')) customElements.define('prev-button', HomePrevButton, { extends: 'button' });
if (!customElements.get('next-button')) customElements.define('next-button', HomeNextButton, { extends: 'button' });

// ── Reveal-on-scroll (Motion One) — [reveal-js] ─────────────────
// Equivalente al atributo "reveal-js" del HTML original de Impact:
// el elemento entra con fade + leve desplazamiento vertical la
// primera vez que cruza el viewport, en orden (stagger manual por
// índice dentro de su propio contenedor). El opacity inicial (0) ya
// lo pone arms.css vía [reveal-js] { opacity: 0 } dentro de
// @media (prefers-reduced-motion: no-preference) — así que con
// reduced-motion activado el elemento ya nace visible y este JS no
// necesita tocar nada. Usado por: collection-card, impact-text.
function initRevealJs() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const items = document.querySelectorAll('[reveal-js]');
  if (!items.length) return;

  items.forEach((item, index) => {
    inView(item, () => {
      animate(
        item,
        { opacity: [0, 1], transform: ['translateY(24px)', 'translateY(0)'] },
        { duration: 0.5, delay: index * 0.08, easing: 'ease-out' }
      );
    }, { margin: '0px 0px -10% 0px' });
  });
}

// ── Reveal-on-scroll (Motion One) — [reveal-on-scroll="true"] ───
// Atributo distinto a reveal-js, usado por títulos de section-header
// (ej. <h2 reveal-on-scroll="true"><split-lines>...) en hero,
// featured-collection, multiple-images-with-text, etc. Mismo efecto
// fade + translateY, pero sin stagger (un título no necesita
// escalonarse contra sí mismo). Mismo manejo de opacity inicial vía
// CSS que initRevealJs (ver comentario arriba).
function initRevealOnScroll() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const items = document.querySelectorAll('[reveal-on-scroll="true"]');
  if (!items.length) return;

  items.forEach((item) => {
    inView(item, () => {
      animate(
        item,
        { opacity: [0, 1], transform: ['translateY(16px)', 'translateY(0)'] },
        { duration: 0.5, easing: 'ease-out' }
      );
    }, { margin: '0px 0px -10% 0px' });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initRevealJs();
  initRevealOnScroll();
  initHotSpots();
});

