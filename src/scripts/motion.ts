/** Shared motion helpers for component scripts. */

export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** True on devices with a precise hovering pointer (desktop mouse / trackpad). */
export const hasFinePointer = (): boolean => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

/**
 * Runs `onEnter` / `onLeave` when an element enters or leaves the viewport.
 * Use it to pause canvas / rAF loops while off-screen.
 */
export function observeVisibility(
  el: Element,
  onChange: (visible: boolean) => void,
  rootMargin = '0px',
): IntersectionObserver {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) onChange(entry.isIntersecting);
    },
    { rootMargin },
  );
  io.observe(el);
  return io;
}
