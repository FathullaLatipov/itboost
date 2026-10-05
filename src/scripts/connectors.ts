/**
 * SVG connector helper — draws wires between HTML nodes inside a positioned root.
 *
 * Used by the AI flow diagram and the technology ecosystem. The root element must be
 * `position: relative` and contain an absolutely positioned `<svg>` overlay (inset: 0).
 * Geometry is measured from *layout* boxes (offsetLeft/Top chain), so reveal and hover
 * transforms on the nodes never distort the wires.
 */

export type Side = 'top' | 'right' | 'bottom' | 'left' | 'center';

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

/** One connector: its geometry plus every path that renders it (wire, packet, glow…). */
export interface Wire {
  d: string;
  paths: SVGPathElement[];
}

export type Measure = (el: HTMLElement) => Box;

export type Layout = (measure: Measure, size: Size) => Wire[];

export interface ConnectorController {
  /** Recompute on the next animation frame. */
  update(): void;
  disconnect(): void;
}

const round = (n: number): number => Math.round(n * 10) / 10;

/** Layout box of `el` relative to `root`'s padding box, ignoring CSS transforms. */
export function boxOf(el: HTMLElement, root: HTMLElement): Box {
  let x = 0;
  let y = 0;
  let node: HTMLElement = el;

  while (node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    const parent = node.offsetParent;
    if (!(parent instanceof HTMLElement) || !root.contains(parent)) {
      return rectFallback(el, root);
    }
    if (parent !== root) {
      x += parent.clientLeft;
      y += parent.clientTop;
    }
    node = parent;
  }

  return { x, y, width: el.offsetWidth, height: el.offsetHeight };
}

function rectFallback(el: HTMLElement, root: HTMLElement): Box {
  const r = el.getBoundingClientRect();
  const o = root.getBoundingClientRect();
  return { x: r.left - o.left - root.clientLeft, y: r.top - o.top - root.clientTop, width: r.width, height: r.height };
}

/**
 * Point on a box edge. `along` shifts the point along the edge (px from its centre),
 * `inset` pushes it inside the box (useful to tuck a wire under an opaque card).
 */
export function anchor(box: Box, side: Side, along = 0, inset = 0): Point {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  switch (side) {
    case 'left':
      return { x: box.x + inset, y: cy + along };
    case 'right':
      return { x: box.x + box.width - inset, y: cy + along };
    case 'top':
      return { x: cx + along, y: box.y + inset };
    case 'bottom':
      return { x: cx + along, y: box.y + box.height - inset };
    default:
      return { x: cx, y: cy };
  }
}

/** Smooth S-curve between two points; `axis` is the direction the wire leaves and enters. */
export function curve(a: Point, b: Point, axis: 'x' | 'y', tension = 0.5): string {
  if (axis === 'x') {
    const dx = (b.x - a.x) * tension;
    return `M${round(a.x)} ${round(a.y)}C${round(a.x + dx)} ${round(a.y)} ${round(b.x - dx)} ${round(b.y)} ${round(b.x)} ${round(b.y)}`;
  }
  const dy = (b.y - a.y) * tension;
  return `M${round(a.x)} ${round(a.y)}C${round(a.x)} ${round(a.y + dy)} ${round(b.x)} ${round(b.y - dy)} ${round(b.x)} ${round(b.y)}`;
}

/** Circle-approximating handle length for a quarter-turn cubic. */
const KAPPA = 0.5523;

/**
 * Orthogonal route through `points` with rounded (cubic) corners — a circuit-trace look.
 * Consecutive points should share an x or a y coordinate.
 */
export function orthogonal(points: Point[], radius = 12): string {
  const first = points[0];
  if (!first) return '';
  let d = `M${round(first.x)} ${round(first.y)}`;

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    if (!prev || !curr) continue;

    if (!next) {
      d += `L${round(curr.x)} ${round(curr.y)}`;
      break;
    }

    const inLen = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const outLen = Math.hypot(next.x - curr.x, next.y - curr.y);
    if (inLen === 0 || outLen === 0) continue;

    const r = Math.min(radius, inLen / 2, outLen / 2);
    const inDir = { x: (curr.x - prev.x) / inLen, y: (curr.y - prev.y) / inLen };
    const outDir = { x: (next.x - curr.x) / outLen, y: (next.y - curr.y) / outLen };
    const start = { x: curr.x - inDir.x * r, y: curr.y - inDir.y * r };
    const end = { x: curr.x + outDir.x * r, y: curr.y + outDir.y * r };
    const c1 = { x: start.x + inDir.x * r * KAPPA, y: start.y + inDir.y * r * KAPPA };
    const c2 = { x: end.x - outDir.x * r * KAPPA, y: end.y - outDir.y * r * KAPPA };

    d += `L${round(start.x)} ${round(start.y)}`;
    d += `C${round(c1.x)} ${round(c1.y)} ${round(c2.x)} ${round(c2.y)} ${round(end.x)} ${round(end.y)}`;
  }

  return d;
}

/**
 * Keeps an SVG overlay's wires in sync with the layout of `root`.
 * `layout` is called with a transform-free `measure` function on every resize
 * (root, observed nodes, web-font load) and returns the wires to draw.
 */
export function mountConnectors(
  root: HTMLElement,
  svg: SVGSVGElement,
  layout: Layout,
  observe: Iterable<Element> = [],
  onUpdate?: () => void,
): ConnectorController {
  let frame = 0;

  const draw = (): void => {
    frame = 0;
    const width = root.clientWidth;
    const height = root.clientHeight;
    if (width === 0 || height === 0) return;

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));

    const measure: Measure = (el) => boxOf(el, root);
    for (const wire of layout(measure, { width, height })) {
      for (const path of wire.paths) {
        if (path.getAttribute('d') !== wire.d) path.setAttribute('d', wire.d);
      }
    }
    onUpdate?.();
  };

  const update = (): void => {
    if (frame) return;
    frame = requestAnimationFrame(draw);
  };

  const ro = new ResizeObserver(update);
  ro.observe(root);
  for (const el of observe) ro.observe(el);

  if ('fonts' in document) {
    document.fonts.ready.then(update).catch(() => undefined);
  }

  draw();

  return {
    update,
    disconnect(): void {
      ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    },
  };
}

/** Collects the wire paths of a root by their `data-wire` key (base, packet, glow share a key). */
export function pathsByKey(root: ParentNode): Map<string, SVGPathElement[]> {
  const map = new Map<string, SVGPathElement[]>();
  root.querySelectorAll<SVGPathElement>('path[data-wire]').forEach((path) => {
    const key = path.dataset.wire;
    if (!key) return;
    const list = map.get(key);
    if (list) list.push(path);
    else map.set(key, [path]);
  });
  return map;
}
