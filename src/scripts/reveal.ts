/**
 * L2 motion: reveals [data-reveal] and [data-split] elements once they enter the viewport.
 * Initial hidden state is only applied under html.js (see base.css), so content is visible without JS.
 *
 * `data-reveal="mask"` elements are clipped to zero height, and IntersectionObserver respects the
 * target's own clip-path — so for those we observe the parent and reveal the child.
 */

const SELECTOR = '[data-reveal], [data-split]';

function revealAll(): void {
  document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => el.classList.add('is-visible'));
}

function init(): void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) {
    revealAll();
    return;
  }

  /** Observed element → elements to reveal when it intersects. */
  const targets = new Map<Element, HTMLElement[]>();

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const el of targets.get(entry.target) ?? []) el.classList.add('is-visible');
        targets.delete(entry.target);
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );

  document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
    const isMask = el.dataset.reveal === 'mask';
    const observed: Element = isMask && el.parentElement ? el.parentElement : el;
    const list = targets.get(observed);
    if (list) list.push(el);
    else targets.set(observed, [el]);
    observer.observe(observed);
  });

  // Keyboard focus can land on content that is on screen but still inside the observer's bottom
  // margin (the browser does not scroll it further) — reveal it so focus is never on invisible content.
  document.addEventListener('focusin', (event) => {
    let el = event.target instanceof Element ? event.target.closest<HTMLElement>(SELECTOR) : null;
    while (el) {
      el.classList.add('is-visible');
      el = el.parentElement?.closest<HTMLElement>(SELECTOR) ?? null;
    }
  });
}

init();

export {};
