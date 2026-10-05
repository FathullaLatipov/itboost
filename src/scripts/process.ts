/**
 * L3 — Process timeline. Scroll-linked line draw + step activation.
 *
 * Progressive enhancement: the markup renders every step active with a full line. This script
 * adds `.is-live` (enables the muted inactive state) and then drives, per step:
 *   --fill       0…1  scaleY of the rail segment to the next node
 *   .is-active        once the line has reached the step's node
 * plus the "03 / 07" counter and the progress bar in the sticky aside.
 * Work happens in rAF, only while the section is on screen. Reduced motion → untouched.
 */
import { clamp, lerp, observeVisibility, prefersReducedMotion } from './motion';

/** Point of the viewport (fraction of its height) the line "draws" towards. */
const ANCHOR = 0.6;
/** Smoothing per frame (0…1). Higher = snappier. */
const EASE = 0.18;

const pad = (n: number): string => String(n).padStart(2, '0');

function initProcess(root: HTMLElement): void {
  const list = root.querySelector<HTMLElement>('[data-process-list]');
  const steps = Array.from(root.querySelectorAll<HTMLElement>('[data-process-step]'));
  const counter = root.querySelector<HTMLElement>('[data-process-current]');
  const bar = root.querySelector<HTMLElement>('[data-process-bar]');
  if (!list || steps.length === 0) return;

  const total = steps.length;
  /** Node centres, in px from the top of the list (layout-based, ignores reveal transforms). */
  let centers: number[] = [];
  const lastFill: number[] = steps.map(() => -1);
  const lastActive: boolean[] = steps.map(() => true);
  let lastCount = -1;
  let lastProgress = -1;

  let target = 0;
  let current = 0;
  let frame = 0;
  let visible = false;
  let snap = true;

  const measure = (): void => {
    centers = steps.map((step) => {
      const node = step.querySelector<HTMLElement>('[data-process-node]');
      const offset = node ? node.offsetTop + node.offsetHeight / 2 : 0;
      return step.offsetTop + offset;
    });
  };

  const render = (y: number): void => {
    let count = 0;
    for (let i = 0; i < total; i += 1) {
      const step = steps[i];
      const start = centers[i] ?? 0;
      const next = centers[i + 1];
      const active = y >= start - 1;
      if (active) count += 1;
      if (active !== lastActive[i]) {
        step.classList.toggle('is-active', active);
        lastActive[i] = active;
      }
      if (next !== undefined) {
        const fill = Math.round(clamp((y - start) / Math.max(1, next - start), 0, 1) * 1000) / 1000;
        if (fill !== lastFill[i]) {
          step.style.setProperty('--fill', String(fill));
          lastFill[i] = fill;
        }
      }
    }

    if (count !== lastCount) {
      if (counter) counter.textContent = pad(Math.max(1, count));
      steps.forEach((step, i) => step.classList.toggle('is-current', count > 0 && i === count - 1));
      lastCount = count;
    }

    const first = centers[0] ?? 0;
    const last = centers[total - 1] ?? first;
    const progress = Math.round(clamp((y - first) / Math.max(1, last - first), 0, 1) * 1000) / 1000;
    if (bar && progress !== lastProgress) {
      bar.style.setProperty('--progress', String(progress));
      lastProgress = progress;
    }
  };

  const tick = (): void => {
    frame = 0;
    target = window.innerHeight * ANCHOR - list.getBoundingClientRect().top;
    if (snap) {
      current = target;
      snap = false;
    } else {
      current = lerp(current, target, EASE);
      if (Math.abs(target - current) < 0.5) current = target;
    }
    render(current);
    if (visible && current !== target) frame = requestAnimationFrame(tick);
  };

  const schedule = (): void => {
    if (visible && !frame) frame = requestAnimationFrame(tick);
  };

  const onResize = (): void => {
    measure();
    snap = true;
    schedule();
  };

  measure();
  root.classList.add('is-live');
  // Render the initial (possibly off-screen) state once so there is no flash of "all active".
  target = window.innerHeight * ANCHOR - list.getBoundingClientRect().top;
  current = target;
  render(current);

  observeVisibility(
    root,
    (isVisible) => {
      visible = isVisible;
      if (visible) {
        snap = true;
        schedule();
      } else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    '10% 0px 10% 0px',
  );

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  if ('ResizeObserver' in window) {
    new ResizeObserver(onResize).observe(list);
  }
}

function init(): void {
  if (prefersReducedMotion()) return;
  document.querySelectorAll<HTMLElement>('[data-process]').forEach(initProcess);
}

init();

export {};
