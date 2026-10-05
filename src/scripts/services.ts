/**
 * Service explorer (src/components/sections/Services.astro).
 * ≥1024px "explorer": rows drive a sticky detail panel (hover intent, focus, click; ↑/↓/Home/End).
 * <1024px "accordion": rows toggle inline bodies, one open at a time.
 * Initial visual state is server-rendered (first row active/open), so there is no flash before this runs.
 */
import { prefersReducedMotion } from './motion';

const DESKTOP = '(min-width: 1024px)';
const HOVER_INTENT_MS = 70;

function initExplorer(root: HTMLElement): void {
  const rows = Array.from(root.querySelectorAll<HTMLElement>('.svc-row'));
  const triggers = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-svc-trigger]'));
  const details = Array.from(root.querySelectorAll<HTMLElement>('[data-svc-detail]'));
  const panel = root.querySelector<HTMLElement>('[data-svc-panel]');
  if (!panel || triggers.length === 0 || rows.length !== triggers.length) return;

  const desktop = window.matchMedia(DESKTOP);
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const bodyIds = triggers.map((btn) => btn.getAttribute('aria-controls') ?? '');

  let active = 0; // explorer selection
  let open = 0; // accordion open row (-1 = none)
  let hoverTimer = 0;
  let lastKeyAt = 0;

  const isDesktop = (): boolean => desktop.matches;

  function select(index: number): void {
    if (index === active || index < 0 || index >= triggers.length) return;
    active = index;
    renderExplorer();
  }

  function renderExplorer(): void {
    rows.forEach((row, i) => row.classList.toggle('is-active', i === active));
    details.forEach((detail, i) => {
      detail.classList.toggle('is-active', i === active);
      // A detail fading out stays `visibility: visible` for a moment — inert keeps a fast Tab from
      // landing on its CTA (focus would then be dropped to <body> when it hides).
      detail.inert = i !== active;
    });
    triggers.forEach((btn, i) => {
      if (i === active) btn.setAttribute('aria-current', 'true');
      else btn.removeAttribute('aria-current');
    });
    panel?.style.setProperty('--svc-step', String(active));
  }

  function renderAccordion(): void {
    rows.forEach((row, i) => row.classList.toggle('is-open', i === open));
    triggers.forEach((btn, i) => btn.setAttribute('aria-expanded', String(i === open)));
  }

  function applyMode(): void {
    if (isDesktop()) {
      if (open >= 0) active = open;
      triggers.forEach((btn) => {
        btn.removeAttribute('aria-expanded');
        btn.setAttribute('aria-controls', panel?.id ?? '');
      });
      renderExplorer();
    } else {
      open = active;
      triggers.forEach((btn, i) => {
        btn.removeAttribute('aria-current');
        btn.setAttribute('aria-controls', bodyIds[i] ?? '');
      });
      renderAccordion();
    }
  }

  /** Viewport insets the page keeps clear (fixed header on top, mobile dock at the bottom). */
  function scrollInsets(): { top: number; bottom: number } {
    const style = getComputedStyle(document.documentElement);
    const px = (value: string, fallback: number): number => {
      const n = Number.parseFloat(value);
      return Number.isFinite(n) ? n : fallback;
    };
    return { top: px(style.scrollPaddingTop, 80), bottom: px(style.scrollPaddingBottom, 0) };
  }

  /**
   * After a row opens: if its body will end below the visible area (above the dock), scroll just
   * enough to show it — never so far that the row header goes under the fixed header.
   * Uses the final geometry (the body is still animating open).
   */
  function revealOpened(index: number): void {
    const btn = triggers[index];
    const content = rows[index]?.querySelector<HTMLElement>('.svc-row__content');
    if (!btn || !content) return;
    const insets = scrollInsets();
    const headTop = btn.getBoundingClientRect().top;
    const finalBottom = btn.getBoundingClientRect().bottom + content.offsetHeight;
    const viewBottom = (window.visualViewport?.height ?? window.innerHeight) - insets.bottom;
    const overflow = finalBottom - viewBottom;
    if (overflow <= 0) return;
    const delta = Math.min(overflow, headTop - insets.top);
    if (delta < 8) return;
    window.scrollBy({ top: delta, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  function toggle(index: number): void {
    const previous = open;
    const btn = triggers[index];
    const prevRow = previous >= 0 && previous < index ? rows[previous] : undefined;
    const before = btn?.getBoundingClientRect().top ?? 0;

    // A taller open row ABOVE the tapped one collapses instantly and the page is shifted by the
    // same amount, so the tapped header stays exactly under the finger (no jump, no catch-up scroll).
    prevRow?.classList.add('is-instant');
    open = open === index ? -1 : index;
    renderAccordion();
    if (prevRow && btn) {
      const shift = btn.getBoundingClientRect().top - before; // forces the collapsed layout
      prevRow.classList.remove('is-instant');
      if (Math.abs(shift) > 1) window.scrollBy({ top: shift, behavior: 'instant' });
    }

    if (open === index) revealOpened(index);
  }

  triggers.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      if (isDesktop()) select(i);
      else toggle(i);
    });

    btn.addEventListener('focus', () => {
      window.clearTimeout(hoverTimer);
      if (isDesktop()) select(i);
    });

    btn.addEventListener('pointerenter', (event) => {
      if (!isDesktop() || event.pointerType !== 'mouse' || !finePointer.matches) return;
      window.clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(() => {
        // Content scrolling under a resting cursor must not override keyboard navigation.
        if (performance.now() - lastKeyAt < 600) return;
        select(i);
      }, HOVER_INTENT_MS);
    });

    btn.addEventListener('pointerleave', () => window.clearTimeout(hoverTimer));

    btn.addEventListener('keydown', (event) => {
      lastKeyAt = performance.now();
      let next = -1;
      if (event.key === 'ArrowDown') next = (i + 1) % triggers.length;
      else if (event.key === 'ArrowUp') next = (i - 1 + triggers.length) % triggers.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = triggers.length - 1;
      if (next < 0) return;
      event.preventDefault();
      triggers[next]?.focus();
    });
  });

  desktop.addEventListener('change', applyMode);
  applyMode();
}

document.querySelectorAll<HTMLElement>('[data-services]').forEach(initExplorer);

export {};
