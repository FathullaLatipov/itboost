/**
 * About section behaviour.
 * 1. Statement: words light up as the reader scrolls through it (scroll-linked, rAF-throttled,
 *    listeners attached only while the statement is near the viewport).
 * 2. Problems → solutions: desktop list + sticky panel (aria-pressed) / mobile accordion (aria-expanded).
 */
import { clamp, observeVisibility, prefersReducedMotion } from './motion';

/* ---- 1. Statement -------------------------------------------------------------- */

function initStatement(el: HTMLElement): void {
  if (prefersReducedMotion()) return;
  const count = el.querySelectorAll('.statement__w').length;
  if (count === 0) return;

  let frame = 0;
  let lastLit = Number.NaN;

  const update = (): void => {
    frame = 0;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    // 0 when the top edge reaches 86% of the viewport, 1 when the bottom edge reaches 42%.
    const start = vh * 0.86;
    const end = vh * 0.42;
    const progress = clamp((start - rect.top) / (rect.height + start - end), 0, 1);
    const lit = Math.round(progress * (count + 3) * 20) / 20;
    if (lit !== lastLit) {
      lastLit = lit;
      el.style.setProperty('--lit', String(lit));
    }
  };

  const schedule = (): void => {
    if (frame === 0) frame = requestAnimationFrame(update);
  };

  update();
  el.classList.add('is-scrub');

  observeVisibility(
    el,
    (visible) => {
      if (visible) {
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
      } else {
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
      }
      schedule();
    },
    '25% 0px 25% 0px',
  );
}

/* ---- 2. Problems → solutions --------------------------------------------------- */

interface Row {
  item: HTMLElement;
  trigger: HTMLButtonElement;
  answer: HTMLElement;
}

function collectRows(root: HTMLElement): Row[] | null {
  const rows: Row[] = [];
  for (const item of root.querySelectorAll<HTMLElement>('[data-ps-item]')) {
    const trigger = item.querySelector<HTMLButtonElement>('[data-ps-trigger]');
    const answer = item.querySelector<HTMLElement>('[data-ps-answer]');
    if (!trigger || !answer) return null;
    rows.push({ item, trigger, answer });
  }
  return rows.length > 0 ? rows : null;
}

function initProblems(root: HTMLElement): void {
  const rows = collectRows(root);
  const panel = root.querySelector<HTMLElement>('[data-ps-panel]');
  if (!rows || !panel) return;
  const slides = Array.from(root.querySelectorAll<HTMLElement>('[data-ps-slide]'));
  const ticks = Array.from(root.querySelectorAll<HTMLElement>('[data-ps-tick]'));
  const desktop = window.matchMedia('(min-width: 1024px)');

  let active = 0;
  let lastOpened = 0;
  const open = new Set<number>([0]);
  let hoverTimer = 0;

  const render = (): void => {
    const isDesktop = desktop.matches;
    rows.forEach(({ item, trigger, answer }, i) => {
      item.classList.toggle('is-on', isDesktop ? i === active : open.has(i));
      if (isDesktop) {
        trigger.removeAttribute('aria-expanded');
        trigger.setAttribute('aria-pressed', String(i === active));
        trigger.setAttribute('aria-controls', panel.id);
        // Roving tabindex: arrows move between rows, Tab goes straight to the active solution's CTA.
        trigger.tabIndex = i === active ? 0 : -1;
      } else {
        trigger.removeAttribute('tabindex');
        trigger.removeAttribute('aria-pressed');
        trigger.setAttribute('aria-expanded', String(open.has(i)));
        trigger.setAttribute('aria-controls', answer.id);
      }
    });
    slides.forEach((slide, i) => {
      const on = i === active;
      slide.classList.toggle('is-active', on);
      slide.toggleAttribute('inert', !on);
      if (on) slide.removeAttribute('aria-hidden');
      else slide.setAttribute('aria-hidden', 'true');
    });
    ticks.forEach((tick, i) => tick.classList.toggle('is-active', i === active));
  };

  const activate = (i: number): void => {
    if (i === active) return;
    active = i;
    render();
  };

  const toggle = (i: number): void => {
    if (open.has(i)) {
      open.delete(i);
    } else {
      open.add(i);
      lastOpened = i;
    }
    render();
  };

  rows.forEach(({ trigger }, i) => {
    trigger.addEventListener('click', () => {
      if (desktop.matches) activate(i);
      else toggle(i);
    });

    trigger.addEventListener('focus', () => {
      if (desktop.matches) activate(i);
    });

    // Hover intent: a short delay so sweeping across rows does not flicker the panel.
    trigger.addEventListener('pointerenter', (event: PointerEvent) => {
      if (!desktop.matches || event.pointerType !== 'mouse') return;
      window.clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(() => activate(i), 70);
    });
    trigger.addEventListener('pointerleave', () => window.clearTimeout(hoverTimer));

    trigger.addEventListener('keydown', (event: KeyboardEvent) => {
      const last = rows.length - 1;
      let next = -1;
      if (event.key === 'ArrowDown') next = i === last ? 0 : i + 1;
      else if (event.key === 'ArrowUp') next = i === 0 ? last : i - 1;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = last;
      if (next < 0) return;
      event.preventDefault();
      rows[next].trigger.focus();
    });
  });

  // Keep state coherent when crossing the breakpoint.
  desktop.addEventListener('change', () => {
    if (desktop.matches) {
      active = open.has(lastOpened) ? lastOpened : (open.values().next().value ?? active);
    } else {
      open.clear();
      open.add(active);
      lastOpened = active;
    }
    render();
  });

  render();
}

/* ---- Boot ---------------------------------------------------------------------- */

const statement = document.querySelector<HTMLElement>('#about [data-statement]');
if (statement) initStatement(statement);

const problems = document.querySelector<HTMLElement>('#about [data-ps]');
if (problems) initProblems(problems);

export {};
