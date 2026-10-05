/**
 * Work section behaviour:
 * 1. Project index filters — toggle buttons (aria-pressed), animated with the View Transitions API
 *    when available (simple fade otherwise), result count announced politely.
 * 2. Case-study media mask reveal (clip-path) — observed on the unclipped wrapper.
 * 3. Case-study media parallax — the screenshot drifts ±24px inside its frame while in view.
 *    Desktop (≥1024px) + fine pointer + motion allowed only; rAF is scheduled on scroll, never looped.
 */
import { clamp, hasFinePointer, observeVisibility, prefersReducedMotion } from './motion';

const FADE_MS = 160;
const PARALLAX_RANGE = 24;
/** Cards shown per filter on phone widths before "show more" (CSS applies it below 640px only). */
const PHONE_LIMIT = 6;
/** Width of the right-edge fade of the scrollable filter row (2.5rem mask in Work.astro). */
const FILTER_FADE_PX = 40;

// ---- Filters -------------------------------------------------------------------

function initFilters(root: HTMLElement): void {
  const grid = root.querySelector<HTMLElement>('[data-work-grid]');
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-filter]'));
  const status = root.querySelector<HTMLElement>('[data-work-status]');
  if (!grid || buttons.length === 0) return;

  const cards = Array.from(grid.querySelectorAll<HTMLElement>(':scope > [data-category]'));
  const shownLabel = status?.dataset.label ?? '';
  const more = root.querySelector<HTMLElement>('[data-work-more]');
  const moreButton = more?.querySelector<HTMLButtonElement>('[data-work-more-button]');
  const moreLabel = moreButton?.querySelector<HTMLElement>('.btn__label');
  const moreText = moreButton?.dataset.label ?? '';
  let active = buttons.find((btn) => btn.getAttribute('aria-pressed') === 'true')?.dataset.filter ?? 'all';
  let busy = false;

  /** Marks matched cards beyond PHONE_LIMIT; CSS hides them on phones while the grid is collapsed. */
  const collapse = (): void => {
    let shown = 0;
    let overflow = 0;
    for (const card of cards) {
      card.removeAttribute('data-overflow');
      if (card.hidden) continue;
      shown += 1;
      if (shown > PHONE_LIMIT) {
        card.setAttribute('data-overflow', '');
        overflow += 1;
      }
    }
    grid.classList.toggle('is-collapsed', overflow > 0);
    if (more) more.hidden = overflow === 0;
    if (moreLabel) moreLabel.textContent = `${moreText} (${overflow})`;
  };

  const apply = (filter: string): number => {
    let count = 0;
    for (const card of cards) {
      const match = filter === 'all' || card.dataset.category === filter;
      card.hidden = !match;
      if (match) {
        count += 1;
        // Cards shown by filtering skip the scroll reveal (the transition animates them).
        card.querySelector('[data-reveal]')?.classList.add('is-visible');
      }
    }
    collapse();
    return count;
  };

  collapse();

  moreButton?.addEventListener('click', () => {
    const first = cards.find((card) => card.hasAttribute('data-overflow'));
    grid.classList.remove('is-collapsed');
    for (const card of cards) {
      if (card.hasAttribute('data-overflow')) card.querySelector('[data-reveal]')?.classList.add('is-visible');
      card.removeAttribute('data-overflow');
    }
    if (more) more.hidden = true;
    // Keep keyboard users in place: move focus to the first newly shown project link.
    first?.querySelector<HTMLElement>('a[href]')?.focus({ preventScroll: false });
  });

  const announce = (count: number): void => {
    if (status) status.textContent = `${shownLabel}: ${count}`;
  };

  const setNames = (on: boolean): void => {
    for (const card of cards) {
      if (on) {
        card.style.setProperty('view-transition-name', `pcard-${card.dataset.id ?? ''}`);
        card.style.setProperty('view-transition-class', 'pcard');
      } else {
        card.style.removeProperty('view-transition-name');
        card.style.removeProperty('view-transition-class');
      }
    }
  };

  const run = (filter: string): void => {
    const update = (): void => announce(apply(filter));

    if (prefersReducedMotion()) {
      update();
      return;
    }

    if (typeof document.startViewTransition === 'function') {
      busy = true;
      setNames(true);
      const transition = document.startViewTransition(update);
      transition.finished.finally(() => {
        setNames(false);
        busy = false;
      });
      return;
    }

    busy = true;
    grid.classList.add('is-filtering');
    window.setTimeout(() => {
      update();
      grid.classList.remove('is-filtering');
      busy = false;
    }, FADE_MS);
  };

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter ?? 'all';
      if (filter === active || busy) return;
      active = filter;
      for (const btn of buttons) btn.setAttribute('aria-pressed', String(btn === button));
      run(filter);
    });
  }

  // Below 1024px the filters are a horizontal scroller. Browsers leave a partly visible button where
  // it is on keyboard focus (label + focus ring cut by the edge / fade) — bring it fully into view.
  const scroller = root.querySelector<HTMLElement>('[data-work-filters]');
  scroller?.addEventListener('focusin', (event) => {
    const button = event.target instanceof HTMLElement ? event.target : null;
    if (!button || scroller.scrollWidth <= scroller.clientWidth) return;
    requestAnimationFrame(() => {
      const box = scroller.getBoundingClientRect();
      const rect = button.getBoundingClientRect();
      const edge = Number.parseFloat(getComputedStyle(scroller).paddingLeft) || 0;
      let delta = 0;
      if (rect.left < box.left + edge) delta = rect.left - box.left - edge;
      else if (rect.right > box.right - FILTER_FADE_PX) delta = rect.right - box.right + FILTER_FADE_PX;
      if (delta !== 0) scroller.scrollBy({ left: delta, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    });
  });
}

// ---- Parallax ----------------------------------------------------------------------

/**
 * The case screenshot is fitted to the frame width and is taller than the frame (see DeviceFrame
 * width-fit mode). While the frame rises from the bottom of the viewport to its centre, the image
 * drifts from showing a little more of the page back to its top-aligned rest position — it lags
 * behind the scroll (depth), then rests with logo + navigation fully visible while being read.
 */
function initParallax(root: HTMLElement): void {
  if (prefersReducedMotion() || !hasFinePointer()) return;

  const desktop = window.matchMedia('(min-width: 1024px)');
  const layers = Array.from(root.querySelectorAll<HTMLElement>('[data-parallax]'));
  const inView = new Set<HTMLElement>();
  let frame = 0;

  const tick = (): void => {
    frame = 0;
    const vh = window.innerHeight;
    for (const layer of inView) {
      const host = layer.parentElement;
      if (!host) continue;
      const rect = host.getBoundingClientRect();
      const range = Math.min(PARALLAX_RANGE * 2, Math.max(0, layer.offsetHeight - host.clientHeight));
      // progress: +1 = frame still below the viewport centre (entering), 0 = centred, -1 = above.
      const progress = clamp((rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2), -1, 1);
      const offset = -range * clamp(progress, 0, 1);
      layer.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
    }
  };

  const schedule = (): void => {
    if (frame || inView.size === 0 || !desktop.matches) return;
    frame = requestAnimationFrame(tick);
  };

  const reset = (): void => {
    if (desktop.matches) {
      schedule();
      return;
    }
    for (const layer of layers) layer.style.removeProperty('transform');
  };

  for (const layer of layers) {
    const host = layer.parentElement;
    if (!host) continue;
    observeVisibility(
      host,
      (visible) => {
        if (visible) inView.add(layer);
        else inView.delete(layer);
        schedule();
      },
      '80px 0px',
    );
  }

  desktop.addEventListener('change', reset);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
}

// ---- Case media reveal ---------------------------------------------------------------

function initCaseReveal(root: HTMLElement): void {
  const medias = Array.from(root.querySelectorAll<HTMLElement>('[data-case-media]'));
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    for (const media of medias) media.classList.add('is-revealed');
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.15 },
  );
  for (const media of medias) {
    observer.observe(media);
    // Keyboard focus on the zoom button reveals the screenshot even if the observer has not fired yet.
    media.addEventListener('focusin', () => media.classList.add('is-revealed'), { once: true });
  }
}

function init(): void {
  const root = document.getElementById('work');
  if (!root) return;
  initFilters(root);
  initCaseReveal(root);
  initParallax(root);
}

init();

export {};
