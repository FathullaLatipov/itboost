/**
 * AI & Automation section (src/components/sections/AiAutomation.astro):
 * - wires of the flow diagram (horizontal ≥1024px, vertical snake rails below), via connectors.ts
 * - packet animation lifecycle: draw-in on first view, run only while on screen, static for reduced motion
 * - pointer spotlight on capability cells (fine pointers only)
 */
import { anchor, curve, mountConnectors, orthogonal, pathsByKey } from './connectors';
import type { Layout, Wire } from './connectors';
import { clamp, hasFinePointer, observeVisibility, prefersReducedMotion } from './motion';

const HORIZONTAL = '(min-width: 1024px)';
/** Distance of the vertical rails from the diagram edge (the diagram reserves --rail on both sides). */
const RAIL_X = 11;
const CORNER = 14;
const DRAW_MS = 1150;

function initFlow(root: HTMLElement): void {
  const svg = root.querySelector<SVGSVGElement>('[data-flow-wires]');
  const core = root.querySelector<HTMLElement>('[data-flow-core]');
  const result = root.querySelector<HTMLElement>('[data-flow-result]');
  const ctaWrap = root.querySelector<HTMLElement>('[data-flow-cta]');
  const inputs = Array.from(root.querySelectorAll<HTMLElement>('[data-flow-in]'));
  const actions = Array.from(root.querySelectorAll<HTMLElement>('[data-flow-out]'));
  if (!svg || !core || !result || !ctaWrap) return;

  const cta = ctaWrap.querySelector<HTMLElement>('a, button') ?? ctaWrap;
  const paths = pathsByKey(svg);
  const horizontal = window.matchMedia(HORIZONTAL);
  const wire = (key: string, d: string): Wire => ({ d, paths: paths.get(key) ?? [] });

  const layout: Layout = (measure, size) => {
    const c = measure(core);
    const res = measure(result);
    const btn = measure(cta);
    const wires: Wire[] = [];

    if (horizontal.matches) {
      const coreIn = anchor(c, 'left');
      const coreOut = anchor(c, 'right');
      const resIn = anchor(res, 'left');
      inputs.forEach((el, i) => {
        wires.push(wire(`in-${i}`, curve(anchor(measure(el), 'right'), coreIn, 'x', 0.62)));
      });
      actions.forEach((el, i) => {
        const box = measure(el);
        wires.push(wire(`out-${i}`, curve(coreOut, anchor(box, 'left'), 'x', 0.62)));
        wires.push(wire(`res-${i}`, curve(anchor(box, 'right'), resIn, 'x', 0.62)));
      });
    } else {
      const left = RAIL_X;
      const right = size.width - RAIL_X;
      const coreIn = anchor(c, 'right');
      const coreOut = anchor(c, 'left');
      const resIn = anchor(res, 'right');
      inputs.forEach((el, i) => {
        const a = anchor(measure(el), 'right');
        wires.push(wire(`in-${i}`, orthogonal([a, { x: right, y: a.y }, { x: right, y: coreIn.y }, coreIn], CORNER)));
      });
      actions.forEach((el, i) => {
        const box = measure(el);
        const inPort = anchor(box, 'left');
        const outPort = anchor(box, 'right');
        wires.push(
          wire(`out-${i}`, orthogonal([coreOut, { x: left, y: coreOut.y }, { x: left, y: inPort.y }, inPort], CORNER)),
        );
        wires.push(
          wire(`res-${i}`, orthogonal([outPort, { x: right, y: outPort.y }, { x: right, y: resIn.y }, resIn], CORNER)),
        );
      });
    }

    // Result → CTA: a short dotted lead-in straight down into the button.
    const from = anchor(res, 'bottom');
    const to = { x: clamp(from.x, btn.x + 28, btn.x + btn.width - 28), y: btn.y };
    wires.push(wire('cta', curve(from, to, 'y')));
    return wires;
  };

  const connectors = mountConnectors(root, svg, layout, [core, result, ctaWrap, ...inputs, ...actions]);
  horizontal.addEventListener('change', () => connectors.update());

  // ---- Animation lifecycle -------------------------------------------------
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let started = false;
  let visible = false;
  let startTimer = 0;

  const sync = (): void => {
    const run = started && visible && !reduced.matches && !document.hidden;
    root.classList.toggle('is-running', run);
  };

  if (prefersReducedMotion()) {
    root.classList.add('is-drawn');
  }

  observeVisibility(
    root,
    (isVisible) => {
      visible = isVisible;
      if (isVisible && !root.classList.contains('is-drawn')) {
        root.classList.add('is-drawn');
      }
      if (isVisible && !started && !startTimer && !reduced.matches) {
        startTimer = window.setTimeout(() => {
          started = true;
          root.classList.add('is-live');
          sync();
        }, DRAW_MS);
      }
      sync();
    },
    '0px 0px -10% 0px',
  );

  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', () => {
    if (reduced.matches) root.classList.add('is-drawn');
    sync();
  });
}

function initSpotlight(list: HTMLElement): void {
  if (!hasFinePointer()) return;
  list.addEventListener('pointermove', (event) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-spotlight]') : null;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left, 0, rect.width);
    const y = clamp(event.clientY - rect.top, 0, rect.height);
    target.style.setProperty('--mx', `${Math.round(x)}px`);
    target.style.setProperty('--my', `${Math.round(y)}px`);
  });
}

document.querySelectorAll<HTMLElement>('[data-ai-flow]').forEach(initFlow);
document.querySelectorAll<HTMLElement>('[data-ai-caps]').forEach(initSpotlight);

export {};
