/**
 * Custom cursor (see layout/Cursor.astro).
 * Active only for `(hover: hover) and (pointer: fine)` without reduced motion; re-evaluated live.
 * The native cursor is hidden (html.has-custom-cursor) only after the first mouse move, so a
 * freshly loaded page never shows "no cursor". The rAF loop stops once the ring has converged.
 */
import { lerp } from './motion';

type CursorState = 'default' | 'hover' | 'view' | 'hidden';

const ACTIVE_CLASS = 'has-custom-cursor';
/** Ring follow factor per 60fps frame. */
const FOLLOW = 0.18;
/** Distance (px) under which the ring is considered settled. */
const SETTLE = 0.1;

const HIDE_SELECTOR =
  '[data-cursor="hide"], input, textarea, select, iframe, [contenteditable]:not([contenteditable="false"])';
const VIEW_SELECTOR = '[data-cursor="view"]';
const HOVER_SELECTOR = 'a[href], button, [role="button"], label[for], summary, [data-cursor="cta"]';

function initCursor(root: HTMLElement, follower: HTMLElement, pointer: HTMLElement, label: HTMLElement): void {
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const html = document.documentElement;

  let enabled = false;
  let frame = 0;
  let lastTime = 0;
  let hasPosition = false;
  let x = 0;
  let y = 0;
  let ringX = 0;
  let ringY = 0;
  let state: CursorState = 'default';

  const render = (time: number): void => {
    const dt = lastTime ? Math.min(64, time - lastTime) : 16.67;
    lastTime = time;
    // Frame-rate independent easing.
    const k = 1 - Math.pow(1 - FOLLOW, dt / 16.67);
    ringX = lerp(ringX, x, k);
    ringY = lerp(ringY, y, k);

    const settled = Math.abs(x - ringX) < SETTLE && Math.abs(y - ringY) < SETTLE;
    if (settled) {
      ringX = x;
      ringY = y;
    }
    pointer.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    follower.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;

    if (settled) {
      frame = 0;
      lastTime = 0;
      return;
    }
    frame = requestAnimationFrame(render);
  };

  const kick = (): void => {
    if (!frame) frame = requestAnimationFrame(render);
  };

  const setState = (next: CursorState, text: string): void => {
    if (next === 'view' && label.textContent !== text) label.textContent = text;
    if (next === state) return;
    state = next;
    root.dataset.state = next;
  };

  const resolve = (target: EventTarget | null): void => {
    if (!(target instanceof Element)) return;

    const themed = target.closest('[data-theme]');
    const theme = themed?.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    if (root.dataset.theme !== theme) root.dataset.theme = theme;

    if (target.closest(HIDE_SELECTOR)) {
      setState('hidden', '');
      return;
    }
    const view = target.closest(VIEW_SELECTOR);
    if (view) {
      setState('view', view.getAttribute('data-cursor-label') ?? '');
      return;
    }
    setState(target.closest(HOVER_SELECTOR) ? 'hover' : 'default', '');
  };

  const show = (): void => {
    if (!html.classList.contains(ACTIVE_CLASS)) html.classList.add(ACTIVE_CLASS);
    root.classList.add('is-visible');
  };

  const hide = (): void => {
    root.classList.remove('is-visible', 'is-pressed');
  };

  const onMove = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') return;
    // Modal dialogs render in the top layer, above the custom cursor: fall back to the native one.
    if (document.querySelector('dialog[open]')) {
      hide();
      html.classList.remove(ACTIVE_CLASS);
      return;
    }
    x = event.clientX;
    y = event.clientY;
    if (!hasPosition) {
      hasPosition = true;
      ringX = x;
      ringY = y;
      resolve(event.target);
    }
    show();
    kick();
  };

  const onOver = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') return;
    resolve(event.target);
  };

  const onOut = (event: PointerEvent): void => {
    // relatedTarget is null when the pointer leaves the window.
    if (event.relatedTarget === null) hide();
  };

  const onDown = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') root.classList.add('is-pressed');
  };

  const onUp = (): void => {
    root.classList.remove('is-pressed');
  };

  function enable(): void {
    if (enabled) return;
    enabled = true;
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerover', onOver, { passive: true });
    document.addEventListener('pointerout', onOut, { passive: true });
    document.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });
    window.addEventListener('blur', hide);
  }

  function disable(): void {
    if (!enabled) return;
    enabled = false;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerover', onOver);
    document.removeEventListener('pointerout', onOut);
    document.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    window.removeEventListener('blur', hide);
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    hasPosition = false;
    hide();
    html.classList.remove(ACTIVE_CLASS);
  }

  const evaluate = (): void => {
    if (fine.matches && !reduced.matches) enable();
    else disable();
  };

  fine.addEventListener('change', evaluate);
  reduced.addEventListener('change', evaluate);
  evaluate();
}

const cursorRoot = document.querySelector<HTMLElement>('[data-cursor-root]');
const cursorFollower = cursorRoot?.querySelector<HTMLElement>('[data-cursor-follower]');
const cursorPointer = cursorRoot?.querySelector<HTMLElement>('[data-cursor-pointer]');
const cursorLabel = cursorRoot?.querySelector<HTMLElement>('[data-cursor-text]');

if (cursorRoot && cursorFollower && cursorPointer && cursorLabel) {
  initCursor(cursorRoot, cursorFollower, cursorPointer, cursorLabel);
}

export {};
