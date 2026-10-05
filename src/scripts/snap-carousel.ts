/**
 * SnapCarousel behaviour (src/components/ui/SnapCarousel.astro).
 *
 * The swipe itself is pure CSS scroll-snap; this script only adds the footer controls:
 * - slide visibility is tracked by an IntersectionObserver whose root is the scroller (no scroll
 *   listeners): the first fully visible slide is where the row is aligned (the last one once the
 *   row is scrolled to its end); it drives the "01 / 08" counter, the progress track and the
 *   disabled state of prev / next;
 * - prev / next scroll to the neighbouring slide (smooth unless reduced motion);
 * - ← / → / Home / End while the scroller itself has focus;
 * - in carousel mode, slides that are off to the side reveal together with the first one
 *   (a vertical reveal while swiping sideways would look wrong);
 * - above the breakpoint the carousel semantics (region, roledescription, tab stop) are removed.
 */
import { prefersReducedMotion } from './motion';

const pad = (n: number): string => String(n).padStart(2, '0');

/** A slide counts as "fully visible" from this ratio on (sub-pixel snapping never gives exactly 1). */
const FULL = 0.95;
const THRESHOLDS = [0, 0.25, 0.5, 0.75, FULL];
/** Browsers without `scrollend` forget a pending button target after this long instead. */
const PENDING_MS = 900;
const HAS_SCROLLEND = 'onscrollend' in window;

function initCarousel(root: HTMLElement): void {
  const viewport = root.querySelector<HTMLElement>('[data-snap-viewport]');
  const list = viewport?.firstElementChild;
  if (!viewport || !(list instanceof HTMLElement)) return;

  const slides = Array.from(list.children).filter((el): el is HTMLElement => el instanceof HTMLElement);
  if (slides.length === 0) return;

  const prev = root.querySelector<HTMLButtonElement>('[data-snap-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-snap-next]');
  const current = root.querySelector<HTMLElement>('[data-snap-current]');
  const total = root.querySelector<HTMLElement>('[data-snap-total]');
  const fill = root.querySelector<HTMLElement>('[data-snap-fill]');

  const breakpoint = Number.parseInt(root.dataset.breakpoint ?? '768', 10) || 768;
  const mode = window.matchMedia(`(max-width: ${breakpoint - 0.02}px)`);
  const label = viewport.dataset.label ?? '';
  const roledescription = viewport.dataset.roledescription ?? 'carousel';
  const last = slides.length - 1;

  const ratios = new Map<Element, number>();
  /** Slide the scroller is aligned to: first fully visible one (or the most visible one mid-swipe). */
  let lead = 0;
  let shown = -1;
  let atStart = true;
  let atEnd = false;
  let pending: number | null = null;
  let pendingTimer = 0;
  let observer: IntersectionObserver | null = null;
  let revealObserver: IntersectionObserver | null = null;

  if (total) total.textContent = pad(slides.length);

  // ---- State -----------------------------------------------------------------------

  const ratioOf = (index: number): number => {
    const slide = slides[index];
    return slide ? (ratios.get(slide) ?? 0) : 0;
  };

  const update = (): void => {
    let firstFull = -1;
    let best = 0;
    let bestRatio = -1;
    slides.forEach((_, i) => {
      const ratio = ratioOf(i);
      if (firstFull < 0 && ratio >= FULL) firstFull = i;
      if (ratio > bestRatio + 0.01) {
        best = i;
        bestRatio = ratio;
      }
    });
    lead = firstFull >= 0 ? firstFull : best;
    atStart = ratioOf(0) >= FULL;
    atEnd = ratioOf(last) >= FULL;
    // At the end of the row the last slide is the one being looked at, even if a wide screen
    // also shows its neighbour in full.
    const index = atEnd ? last : lead;
    prev?.setAttribute('aria-disabled', String(atStart));
    next?.setAttribute('aria-disabled', String(atEnd));
    if (index === shown) return;
    shown = index;
    if (current) current.textContent = pad(index + 1);
    fill?.style.setProperty('--snap-progress', String((index + 1) / slides.length));
  };

  const clearPending = (): void => {
    pending = null;
    window.clearTimeout(pendingTimer);
  };

  // ---- Navigation --------------------------------------------------------------------

  const goTo = (index: number): void => {
    const target = Math.max(0, Math.min(last, index));
    const slide = slides[target];
    if (!slide) return;
    const edge = Number.parseFloat(getComputedStyle(viewport).scrollPaddingLeft) || 0;
    const left = viewport.scrollLeft + slide.getBoundingClientRect().left - viewport.getBoundingClientRect().left - edge;
    pending = target;
    window.clearTimeout(pendingTimer);
    if (!HAS_SCROLLEND) pendingTimer = window.setTimeout(clearPending, PENDING_MS);
    viewport.scrollTo({ left, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  /** Step from the slide a button press is already heading to, so quick double taps advance twice. */
  const step = (delta: number): void => {
    goTo((pending ?? lead) + delta);
  };

  prev?.addEventListener('click', () => {
    if (prev.getAttribute('aria-disabled') !== 'true') step(-1);
  });
  next?.addEventListener('click', () => {
    if (next.getAttribute('aria-disabled') !== 'true') step(1);
  });

  viewport.addEventListener('scrollend', clearPending);

  viewport.addEventListener('keydown', (event: KeyboardEvent) => {
    // Only when the scroller itself is focused — links inside the slides keep their keys.
    if (event.target !== viewport || !mode.matches) return;
    let index = -1;
    if (event.key === 'ArrowRight') index = (pending ?? lead) + 1;
    else if (event.key === 'ArrowLeft') index = (pending ?? lead) - 1;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = last;
    if (index < 0 || index > last) return;
    event.preventDefault();
    goTo(index);
  });

  // ---- Observers -------------------------------------------------------------------

  const startTracking = (): void => {
    if (observer) return;
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
        update();
      },
      // Vertical margin: only horizontal visibility counts (the reveal rise must not lower ratios).
      { root: viewport, rootMargin: '100% 0px', threshold: THRESHOLDS },
    );
    for (const slide of slides) observer.observe(slide);
  };

  const stopTracking = (): void => {
    observer?.disconnect();
    observer = null;
    ratios.clear();
  };

  /** Reveal every slide as soon as the carousel itself scrolls into view. */
  const revealTogether = (): void => {
    if (revealObserver || prefersReducedMotion()) return;
    const targets = Array.from(viewport.querySelectorAll<HTMLElement>('[data-reveal], [data-split]'));
    if (targets.length === 0) return;
    revealObserver = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        for (const el of targets) el.classList.add('is-visible');
        revealObserver?.disconnect();
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.1 },
    );
    revealObserver.observe(viewport);
  };

  /** Footer only when there is something to scroll (e.g. not when every slide fits). */
  const checkStatic = (): void => {
    root.classList.toggle('is-static', mode.matches && viewport.scrollWidth <= viewport.clientWidth + 1);
  };

  const applyMode = (): void => {
    if (mode.matches) {
      viewport.setAttribute('role', 'region');
      viewport.setAttribute('aria-roledescription', roledescription);
      if (label) viewport.setAttribute('aria-label', label);
      viewport.tabIndex = 0;
      startTracking();
      revealTogether();
    } else {
      viewport.removeAttribute('role');
      viewport.removeAttribute('aria-roledescription');
      viewport.removeAttribute('aria-label');
      viewport.removeAttribute('tabindex');
      stopTracking();
      clearPending();
    }
    checkStatic();
  };

  applyMode();
  mode.addEventListener('change', applyMode);
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(checkStatic);
    ro.observe(viewport);
    ro.observe(list);
  }
}

document.querySelectorAll<HTMLElement>('[data-snap]').forEach(initCarousel);

export {};
