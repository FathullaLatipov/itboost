/**
 * L2 motion: counts [data-counter] elements (ui/Counter.astro) up from 0 when they enter the viewport.
 * The final value is server-rendered; this script only animates towards it.
 */
import { prefersReducedMotion } from './motion';

const easeOutExpo = (t: number): number => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

function readNumber(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function run(el: HTMLElement, num: HTMLElement, target: number, format: (n: number) => string): void {
  const duration = Math.max(0, readNumber(el.dataset.duration, 1600));
  const delay = Math.max(0, readNumber(el.dataset.delay, 0));
  let start = 0;

  const tick = (now: number): void => {
    if (start === 0) start = now;
    const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
    num.textContent = format(Math.round(target * easeOutExpo(t)));
    if (t < 1) requestAnimationFrame(tick);
    else el.dataset.counterDone = '';
  };

  window.setTimeout(() => requestAnimationFrame(tick), delay);
}

function init(): void {
  const counters = document.querySelectorAll<HTMLElement>('[data-counter]:not([data-counter-ready])');
  if (counters.length === 0) return;

  const animate = !prefersReducedMotion() && 'IntersectionObserver' in window;
  const pending = new Map<Element, () => void>();

  const observer = animate
    ? new IntersectionObserver(
        (entries, io) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            io.unobserve(entry.target);
            pending.get(entry.target)?.();
            pending.delete(entry.target);
          }
        },
        { threshold: 0.6 },
      )
    : null;

  counters.forEach((el) => {
    const num = el.querySelector<HTMLElement>('.counter__num');
    const visual = el.querySelector<HTMLElement>('.counter__visual');
    const target = Math.round(readNumber(el.dataset.value, Number.NaN));
    el.dataset.counterReady = '';
    if (!num || !visual || !Number.isFinite(target) || !observer) return;

    const formatter = new Intl.NumberFormat(el.dataset.locale || document.documentElement.lang || undefined);
    const format = (n: number): string => formatter.format(n);

    // Assistive tech reads the final value; the ticking digits are decorative.
    const finalText = visual.textContent ?? '';
    const srCopy = document.createElement('span');
    srCopy.className = 'sr-only';
    srCopy.textContent = finalText;
    el.prepend(srCopy);
    visual.setAttribute('aria-hidden', 'true');

    num.textContent = format(0);
    pending.set(el, () => run(el, num, target, format));
    observer.observe(el);
  });
}

init();

export {};
