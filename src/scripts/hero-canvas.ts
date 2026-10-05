/**
 * Hero L3 visual — "hex network".
 *
 * The brand hexagon tiled into a flat-top lattice. One cell — the core — is drawn as the BrandMark;
 * Boost-Blue data pulses travel along lattice edges into it (data flowing into ITBoost → systems).
 * Fine pointers get a spotlight that brightens the lattice and a subtle parallax drift.
 *
 * Performance contract
 * - Geometry + static lattice are computed/drawn once per resize (debounced ResizeObserver).
 * - The FX canvas only draws pulses, the spotlight and the core each frame; parallax is a
 *   compositor-only transform on the wrapper.
 * - Starts after first paint (idle), DPR ≤ 1.5 with a pixel budget, pauses when the hero is
 *   off-screen or the tab is hidden.
 * - Coarse pointer / narrow screens: fewer pulses, ~30fps, no spotlight/parallax.
 * - prefers-reduced-motion: a single static frame.
 */
import { clamp, hasFinePointer, observeVisibility, prefersReducedMotion } from './motion';

type RGB = readonly [number, number, number];

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Pulse {
  from: number;
  to: number;
  /** Distance travelled along the current edge, px. */
  pos: number;
  speed: number;
  /** Previously visited vertices, most recent last. */
  trail: number[];
  age: number;
}

interface Geometry {
  w: number;
  h: number;
  R: number;
  cx: number;
  cy: number;
  /** False when no spot clears the copy: the core then sits off-canvas and only the flow towards it shows. */
  coreVisible: boolean;
  vx: Float32Array;
  vy: Float32Array;
  /** Field intensity per vertex (0..1): how visible the lattice is there. */
  vw: Float32Array;
  /** Up to 3 neighbours per vertex, -1 when absent. */
  adj: Int32Array;
  /** Graph distance (edges) to the core cell; -1 when unreachable. */
  dist: Int16Array;
  ea: Int32Array;
  eb: Int32Array;
  ew: Float32Array;
  mx: Float32Array;
  my: Float32Array;
  spawn: Int32Array;
  mark: Path2D;
  hex: (radius: number) => Path2D;
}

/* ---- Constants ------------------------------------------------------------ */

const INSET = 16; // wrapper bleed so the parallax never reveals an edge (px)
const PARALLAX = 12; // max drift (px)
const SPOT_RADIUS = 220;
const DPR_CAP = 1.5;
const PIXEL_BUDGET = 2_400_000; // per canvas, device pixels (fx canvas is re-uploaded to the GPU every frame)
const BUCKETS = 10;
const SQRT3 = Math.sqrt(3);

/* BrandMark geometry (ui/BrandMark.astro): ring is a flat-top hexagon centred at (353.5, 220), R = 186.5 */
const MARK_PATH =
  'M143 75 173 127 119 220 173 313 143 365 60 220Z M563 75 647 220 563 365 533 313 587 220 533 127Z M260 58H447L540 220 447 382H260L167 220ZM289 111H416L479 220 416 329H289L227 220ZM265 68H440L428 89H277ZM277 351H428L440 372H265Z';
const MARK_CX = 353.5;
const MARK_CY = 220;
const MARK_R = 186.5;

/* ---- Helpers --------------------------------------------------------------- */

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

function parseColor(value: string, fallback: RGB): RGB {
  const v = value.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
  if (hex) {
    const h = hex[1];
    const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h;
    return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
  }
  const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(v);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return fallback;
}

const rgba = (c: RGB, a: number): string => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;

/**
 * Union rect of an element's visible text boxes, relative to `origin` (+ canvas inset).
 * `data-hero-text="box"` measures the element's border box instead (pills, chips).
 */
function textRect(el: HTMLElement, origin: DOMRect): Rect | null {
  const words = el.querySelectorAll('.split-word');
  let rects: DOMRect[] = [];
  if (el.dataset.heroText === 'box') {
    rects = [el.getBoundingClientRect()];
  } else if (words.length > 0) {
    rects = Array.from(words, (w) => w.getBoundingClientRect());
  } else {
    const range = document.createRange();
    range.selectNodeContents(el);
    rects = Array.from(range.getClientRects());
  }
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const r of rects) {
    if (r.width === 0 || r.height === 0) continue;
    x0 = Math.min(x0, r.left);
    y0 = Math.min(y0, r.top);
    x1 = Math.max(x1, r.right);
    y1 = Math.max(y1, r.bottom);
  }
  if (!Number.isFinite(x0)) return null;
  return { x: x0 - origin.left + INSET, y: y0 - origin.top + INSET, w: x1 - x0, h: y1 - y0 };
}

function distToRect(x: number, y: number, r: Rect): number {
  const dx = Math.max(r.x - x, 0, x - (r.x + r.w));
  const dy = Math.max(r.y - y, 0, y - (r.y + r.h));
  return Math.hypot(dx, dy);
}

/* ---- Geometry -------------------------------------------------------------- */

interface LayoutInput {
  w: number;
  h: number;
  desktop: boolean;
  texts: Rect[];
  /** Vertical centre of the headline, the preferred anchor for the core on small screens. */
  titleY: number | null;
  footTop: number;
  headerBottom: number;
}

interface CorePlacement {
  R: number;
  cx: number;
  cy: number;
  visible: boolean;
}

/** Picks the cell size and core position that keep the core clear of the copy. */
function placeCore(input: LayoutInput): CorePlacement {
  const { w, h, desktop, texts, titleY, footTop, headerBottom } = input;
  const R = desktop ? clamp(w / 30, 38, 60) : clamp(w / 21, 24, 40);
  // Horizontal reach of the mark (chevrons) + breathing room.
  const reach = 1.6 * R + (desktop ? 0.9 * R : 0.45 * R);
  const maxX = desktop ? w - INSET - 2.6 * R : w - INSET - 1.75 * R;

  const clearY = (desktop ? 1.05 : 1.2) * R;
  const needAt = (y: number): number => {
    let need = 0;
    for (const r of texts) {
      if (r.y < y + clearY && r.y + r.h > y - clearY) need = Math.max(need, r.x + r.w + reach);
    }
    return need;
  };

  const contentTop = texts.reduce((m, r) => Math.min(m, r.y), Infinity);
  const contentBottom = texts.reduce((m, r) => Math.max(m, r.y + r.h), -Infinity);
  const hasText = Number.isFinite(contentTop);

  if (desktop) {
    const preferred = hasText ? contentTop + (contentBottom - contentTop) * 0.56 : h * 0.45;
    const top = (hasText ? contentTop : headerBottom) + R;
    const bottom = Math.max(top, footTop - 1.6 * R);
    let best: { cx: number; cy: number; score: number } | null = null;
    for (let y = top; y <= bottom; y += R / 3) {
      const need = needAt(y);
      if (need > maxX) continue;
      const score = Math.abs(y - preferred);
      if (!best || score < best.score) best = { cx: clamp(Math.max(w * 0.77, need), 0, maxX), cy: y, score };
    }
    if (best) return { R, cx: best.cx, cy: best.cy, visible: true };
    return { R, cx: maxX, cy: clamp(preferred, top, bottom), visible: true };
  }

  // Small screens: sit at the right edge beside the headline, as close to its middle as the copy allows.
  const top = headerBottom + 1.4 * R;
  const limit = Math.max(top, (hasText ? contentBottom : footTop) - R);
  const preferred = titleY ?? top;
  let best: { cy: number; score: number } | null = null;
  for (let y = top; y <= limit; y += R / 3) {
    if (needAt(y) > maxX) continue;
    const score = Math.abs(y - preferred);
    if (!best || score < best.score) best = { cy: y, score };
  }
  if (best) return { R, cx: maxX, cy: best.cy, visible: true };
  // Nothing clears the copy (e.g. long Uzbek words at 320px): never put the mark on top of text —
  // keep it just off-canvas, top-right, so pulses still flow towards it.
  return { R, cx: w + 0.6 * R, cy: headerBottom, visible: false };
}

function buildGeometry(input: LayoutInput): Geometry {
  const { w, h, desktop, texts, footTop, headerBottom } = input;
  const { R, cx, cy, visible: coreVisible } = placeCore(input);
  const colStep = 1.5 * R;
  const rowStep = SQRT3 * R;

  const index = new Map<string, number>();
  const xs: number[] = [];
  const ys: number[] = [];
  const nbrs: number[][] = [];
  const ea: number[] = [];
  const eb: number[] = [];
  const edgeSet = new Set<number>();

  const vertexId = (x: number, y: number): number => {
    const key = `${Math.round(x * 4)},${Math.round(y * 4)}`;
    const found = index.get(key);
    if (found !== undefined) return found;
    const id = xs.length;
    index.set(key, id);
    xs.push(x);
    ys.push(y);
    nbrs.push([]);
    return id;
  };

  const cMin = Math.floor(-cx / colStep) - 2;
  const cMax = Math.ceil((w - cx) / colStep) + 2;
  const rMin = Math.floor(-cy / rowStep) - 2;
  const rMax = Math.ceil((h - cy) / rowStep) + 2;
  let coreCorners: number[] = [];

  for (let c = cMin; c <= cMax; c++) {
    const hx = cx + c * colStep;
    if (hx < -2 * R || hx > w + 2 * R) continue;
    for (let r = rMin; r <= rMax; r++) {
      const hy = cy + r * rowStep + (Math.abs(c) % 2 === 1 ? rowStep / 2 : 0);
      if (hy < -2 * R || hy > h + 2 * R) continue;
      const ids: number[] = [];
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k;
        ids.push(vertexId(hx + R * Math.cos(a), hy + R * Math.sin(a)));
      }
      if (c === 0 && r === 0) coreCorners = ids;
      for (let k = 0; k < 6; k++) {
        const a = ids[k];
        const b = ids[(k + 1) % 6];
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        const key = lo * 1_000_000 + hi;
        if (edgeSet.has(key)) continue;
        edgeSet.add(key);
        ea.push(lo);
        eb.push(hi);
        nbrs[lo].push(hi);
        nbrs[hi].push(lo);
      }
    }
  }

  const n = xs.length;
  const vx = Float32Array.from(xs);
  const vy = Float32Array.from(ys);
  const adj = new Int32Array(n * 3).fill(-1);
  for (let i = 0; i < n; i++) {
    const list = nbrs[i];
    for (let k = 0; k < Math.min(3, list.length); k++) adj[i * 3 + k] = list[k];
  }

  // BFS distances to the core cell.
  const dist = new Int16Array(n).fill(-1);
  const queue: number[] = [];
  for (const id of coreCorners) {
    dist[id] = 0;
    queue.push(id);
  }
  for (let head = 0; head < queue.length; head++) {
    const v = queue[head];
    for (let k = 0; k < 3; k++) {
      const nb = adj[v * 3 + k];
      if (nb >= 0 && dist[nb] < 0) {
        dist[nb] = dist[v] + 1;
        queue.push(nb);
      }
    }
  }

  // Visibility field: bright around the core, dimmed under the copy and towards the stats band.
  const reach = desktop ? Math.max(w * 0.62, h * 0.9) : Math.max(w * 1.1, h * 0.75);
  const feather = 1.6 * R;
  const field = (x: number, y: number): number => {
    const radial = 1 - smoothstep(0, reach, Math.hypot(x - cx, (y - cy) * 1.15));
    let nearest = Infinity;
    for (const r of texts) nearest = Math.min(nearest, distToRect(x, y, r));
    const text = texts.length > 0 ? smoothstep(0, feather, nearest) : 1;
    const foot = 1 - 0.7 * smoothstep(footTop - 1.5 * R, footTop + 0.5 * R, y);
    // Keep the zone under the fixed header calm.
    const header = 0.25 + 0.75 * smoothstep(headerBottom - 0.5 * R, headerBottom + 2 * R, y);
    return (0.2 + 0.8 * radial * radial) * (0.32 + 0.68 * text) * foot * header;
  };

  const vw = new Float32Array(n);
  for (let i = 0; i < n; i++) vw[i] = field(vx[i], vy[i]);

  const m = ea.length;
  const mx = new Float32Array(m);
  const my = new Float32Array(m);
  const ew = new Float32Array(m);
  for (let e = 0; e < m; e++) {
    mx[e] = (vx[ea[e]] + vx[eb[e]]) / 2;
    my[e] = (vy[ea[e]] + vy[eb[e]]) / 2;
    ew[e] = field(mx[e], my[e]);
  }

  const maxSteps = desktop ? 14 : 10;
  const spawnList: number[] = [];
  for (let i = 0; i < n; i++) {
    if (dist[i] >= 3 && dist[i] <= maxSteps && vw[i] > 0.24 && vx[i] > 0 && vx[i] < w && vy[i] > headerBottom && vy[i] < h) {
      spawnList.push(i);
    }
  }

  const scale = R / MARK_R;
  const mark = new Path2D();
  mark.addPath(new Path2D(MARK_PATH), new DOMMatrix([scale, 0, 0, scale, cx - MARK_CX * scale, cy - MARK_CY * scale]));

  const hex = (radius: number): Path2D => {
    const p = new Path2D();
    for (let k = 0; k < 6; k++) {
      const a = (Math.PI / 3) * k;
      const x = cx + radius * Math.cos(a);
      const y = cy + radius * Math.sin(a);
      if (k === 0) p.moveTo(x, y);
      else p.lineTo(x, y);
    }
    p.closePath();
    return p;
  };

  return {
    w,
    h,
    R,
    cx,
    cy,
    coreVisible,
    vx,
    vy,
    vw,
    adj,
    dist,
    ea: Int32Array.from(ea),
    eb: Int32Array.from(eb),
    ew,
    mx,
    my,
    spawn: Int32Array.from(spawnList),
    mark,
    hex,
  };
}

/* ---- Engine ---------------------------------------------------------------- */

function boot(hero: HTMLElement): void {
  const wrapEl = hero.querySelector<HTMLElement>('[data-hero-visual]');
  const baseEl = hero.querySelector<HTMLCanvasElement>('[data-hero-lattice]');
  const fxEl = hero.querySelector<HTMLCanvasElement>('[data-hero-fx]');
  if (!wrapEl || !baseEl || !fxEl) return;
  const baseCtx = baseEl.getContext('2d');
  const fxCtx = fxEl.getContext('2d');
  if (!baseCtx || !fxCtx) return;
  // Non-null bindings: narrowing does not carry into the (hoisted) helpers below.
  const wrap: HTMLElement = wrapEl;
  const baseCanvas: HTMLCanvasElement = baseEl;
  const fxCanvas: HTMLCanvasElement = fxEl;
  const base: CanvasRenderingContext2D = baseCtx;
  const fx: CanvasRenderingContext2D = fxCtx;

  const reduced = prefersReducedMotion();
  const styles = getComputedStyle(hero);
  const FG = parseColor(styles.getPropertyValue('--fg'), [238, 241, 245]);
  const ACCENT = parseColor(styles.getPropertyValue('--accent'), [72, 170, 255]);

  let geo: Geometry | null = null;
  let dpr = 1;
  let interactive = false;
  let lite = false;
  let glow: HTMLCanvasElement | null = null;
  const pulses: Pulse[] = [];
  const ripples: number[] = [];
  let flash = 0;
  let lastRipple = -10;
  let time = 0;

  // Pointer / parallax state
  let pointerX = 0;
  let pointerY = 0;
  let pointerIn = false;
  let spot = 0;
  let offX = 0;
  let offY = 0;

  /* -- Layout ---------------------------------------------------------------- */

  function layout(): void {
    const heroRect = hero.getBoundingClientRect();
    const w = Math.round(heroRect.width + INSET * 2);
    const h = Math.round(heroRect.height + INSET * 2);
    if (w <= INSET * 2 || h <= INSET * 2) return;

    const desktop = heroRect.width >= 1024;
    interactive = !reduced && hasFinePointer() && heroRect.width >= 768;
    lite = !hasFinePointer() || heroRect.width < 768;
    if (!interactive) {
      // e.g. the window was narrowed mid-drift: drop any parallax offset / spotlight.
      offX = 0;
      offY = 0;
      spot = 0;
      pointerIn = false;
      wrap.style.transform = '';
    }

    const texts: Rect[] = [];
    let titleTop = Infinity;
    let titleBottom = -Infinity;
    hero.querySelectorAll<HTMLElement>('[data-hero-text]').forEach((el) => {
      const r = textRect(el, heroRect);
      if (!r) return;
      texts.push(r);
      if (el.dataset.heroText === 'title') {
        titleTop = Math.min(titleTop, r.y);
        titleBottom = Math.max(titleBottom, r.y + r.h);
      }
    });
    const titleY = Number.isFinite(titleTop) ? (titleTop + titleBottom) / 2 : null;
    const foot = hero.querySelector('[data-hero-foot]');
    const footTop = foot ? foot.getBoundingClientRect().top - heroRect.top + INSET : h;
    const headerBottom = INSET + (heroRect.width < 768 ? 64 : 72);

    geo = buildGeometry({ w, h, desktop, texts, titleY, footTop, headerBottom });

    const ideal = Math.min(window.devicePixelRatio || 1, lite ? 1.25 : DPR_CAP);
    dpr = Math.max(1, Math.min(ideal, Math.sqrt(PIXEL_BUDGET / (w * h))));
    for (const canvas of [baseCanvas, fxCanvas]) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
    base.setTransform(dpr, 0, 0, dpr, 0, 0);
    fx.setTransform(dpr, 0, 0, dpr, 0, 0);

    glow = makeGlow(geo.R);
    drawLattice(geo);
    resetPulses(geo);
    if (!running) drawFx(0);
  }

  function makeGlow(R: number): HTMLCanvasElement {
    const size = Math.ceil(R * 7);
    const c = document.createElement('canvas');
    c.width = Math.round(size * dpr);
    c.height = Math.round(size * dpr);
    const g = c.getContext('2d');
    if (g) {
      g.scale(dpr, dpr);
      const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, rgba(ACCENT, 0.32));
      grad.addColorStop(0.35, rgba(ACCENT, 0.12));
      grad.addColorStop(1, rgba(ACCENT, 0));
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
    }
    return c;
  }

  /* -- Static lattice ---------------------------------------------------------- */

  function drawLattice(g: Geometry): void {
    base.clearRect(0, 0, g.w, g.h);
    base.lineWidth = 1;
    const paths: Path2D[] = Array.from({ length: BUCKETS }, () => new Path2D());
    for (let e = 0; e < g.ea.length; e++) {
      const b = Math.min(BUCKETS - 1, Math.floor(g.ew[e] * BUCKETS));
      paths[b].moveTo(g.vx[g.ea[e]], g.vy[g.ea[e]]);
      paths[b].lineTo(g.vx[g.eb[e]], g.vy[g.eb[e]]);
    }
    paths.forEach((p, b) => {
      base.strokeStyle = rgba(FG, 0.014 + 0.074 * ((b + 0.5) / BUCKETS));
      base.stroke(p);
    });

    const dots: Path2D[] = Array.from({ length: BUCKETS }, () => new Path2D());
    const r = g.R > 34 ? 1.25 : 1;
    for (let i = 0; i < g.vx.length; i++) {
      const b = Math.min(BUCKETS - 1, Math.floor(g.vw[i] * BUCKETS));
      dots[b].moveTo(g.vx[i] + r, g.vy[i]);
      dots[b].arc(g.vx[i], g.vy[i], r, 0, Math.PI * 2);
    }
    dots.forEach((p, b) => {
      base.fillStyle = rgba(FG, 0.03 + 0.15 * ((b + 0.5) / BUCKETS));
      base.fill(p);
    });

    // The cells around the core pick up the accent — the mark radiates into the grid.
    if (!g.coreVisible) return;
    const ringReach = g.R * 2.7;
    const ring: Path2D[] = Array.from({ length: 4 }, () => new Path2D());
    for (let e = 0; e < g.ea.length; e++) {
      const d = Math.hypot(g.mx[e] - g.cx, g.my[e] - g.cy);
      if (d >= ringReach) continue;
      const b = Math.min(3, Math.floor((1 - d / ringReach) * 4));
      ring[b].moveTo(g.vx[g.ea[e]], g.vy[g.ea[e]]);
      ring[b].lineTo(g.vx[g.eb[e]], g.vy[g.eb[e]]);
    }
    ring.forEach((p, b) => {
      base.strokeStyle = rgba(ACCENT, 0.07 + 0.11 * b);
      base.stroke(p);
    });
  }

  /* -- Pulses ------------------------------------------------------------------ */

  function randomSpawn(g: Geometry): number {
    if (g.spawn.length === 0) return -1;
    return g.spawn[Math.floor(Math.random() * g.spawn.length)];
  }

  function nextVertex(g: Geometry, v: number): number {
    const d = g.dist[v];
    let choice = -1;
    let seen = 0;
    for (let k = 0; k < 3; k++) {
      const nb = g.adj[v * 3 + k];
      if (nb >= 0 && g.dist[nb] >= 0 && g.dist[nb] < d) {
        seen++;
        if (Math.random() * seen < 1) choice = nb; // reservoir pick
      }
    }
    return choice;
  }

  function spawnPulse(g: Geometry, p: Pulse, warm: boolean): boolean {
    let from = randomSpawn(g);
    if (from < 0) return false;
    let to = nextVertex(g, from);
    if (to < 0) return false;
    // Warm start: begin somewhere along the route so pulses do not arrive in sync.
    if (warm) {
      const skip = Math.floor(Math.random() * Math.max(0, g.dist[from] - 2));
      for (let s = 0; s < skip; s++) {
        const nx = nextVertex(g, to);
        if (nx < 0 || g.dist[to] <= 1) break;
        from = to;
        to = nx;
      }
    }
    p.from = from;
    p.to = to;
    p.pos = warm ? Math.random() * g.R : 0;
    p.speed = (lite ? 70 : 85) + Math.random() * 70;
    p.trail.length = 0;
    p.age = warm ? -Math.random() * 1.2 : -Math.random() * 0.6;
    return true;
  }

  function resetPulses(g: Geometry): void {
    pulses.length = 0;
    if (reduced) return;
    const count = lite ? 6 : 14;
    for (let i = 0; i < count; i++) {
      const p: Pulse = { from: 0, to: 0, pos: 0, speed: 0, trail: [], age: 0 };
      if (spawnPulse(g, p, true)) pulses.push(p);
    }
  }

  function stepPulses(g: Geometry, dt: number): void {
    for (const p of pulses) {
      p.age += dt;
      if (p.age < 0) continue;
      p.pos += p.speed * dt;
      while (p.pos >= g.R) {
        p.pos -= g.R;
        p.trail.push(p.from);
        if (p.trail.length > 4) p.trail.shift();
        p.from = p.to;
        if (g.dist[p.from] === 0) {
          arrive();
          spawnPulse(g, p, false);
          break;
        }
        const nx = nextVertex(g, p.from);
        if (nx < 0) {
          spawnPulse(g, p, false);
          break;
        }
        p.to = nx;
      }
    }
  }

  function arrive(): void {
    flash = Math.min(1, flash + 0.5);
    if (time - lastRipple > 1.6 && ripples.length < 3) {
      ripples.push(0);
      lastRipple = time;
    }
  }

  /* -- FX frame ---------------------------------------------------------------- */

  function drawFx(dt: number): void {
    const g = geo;
    if (!g) return;
    fx.clearRect(0, 0, g.w, g.h);

    // Spotlight: brighten edges and nodes near the pointer.
    if (spot > 0.01) {
      const lx = pointerX;
      const ly = pointerY;
      const r2 = SPOT_RADIUS * SPOT_RADIUS;
      const levels = 4;
      const edgePaths: Path2D[] = Array.from({ length: levels }, () => new Path2D());
      for (let e = 0; e < g.ea.length; e++) {
        const dx = g.mx[e] - lx;
        const dy = g.my[e] - ly;
        const d2 = dx * dx + dy * dy;
        if (d2 >= r2) continue;
        const f = 1 - Math.sqrt(d2) / SPOT_RADIUS;
        const b = Math.min(levels - 1, Math.floor(f * f * levels));
        edgePaths[b].moveTo(g.vx[g.ea[e]], g.vy[g.ea[e]]);
        edgePaths[b].lineTo(g.vx[g.eb[e]], g.vy[g.eb[e]]);
      }
      fx.lineWidth = 1;
      edgePaths.forEach((p, b) => {
        fx.strokeStyle = rgba(FG, spot * (0.05 + 0.2 * ((b + 1) / levels)));
        fx.stroke(p);
      });
      const dotPath = new Path2D();
      for (let i = 0; i < g.vx.length; i++) {
        const dx = g.vx[i] - lx;
        const dy = g.vy[i] - ly;
        if (dx * dx + dy * dy >= r2 * 0.36) continue;
        dotPath.moveTo(g.vx[i] + 1.5, g.vy[i]);
        dotPath.arc(g.vx[i], g.vy[i], 1.5, 0, Math.PI * 2);
      }
      fx.fillStyle = rgba(FG, spot * 0.45);
      fx.fill(dotPath);
    }

    // Data pulses.
    fx.lineCap = 'round';
    fx.lineJoin = 'round';
    const trailLen = g.R * 1.35;
    for (const p of pulses) {
      if (p.age < 0) continue;
      const ax = g.vx[p.from];
      const ay = g.vy[p.from];
      const bx = g.vx[p.to];
      const by = g.vy[p.to];
      const t = p.pos / g.R;
      const hx = ax + (bx - ax) * t;
      const hy = ay + (by - ay) * t;
      const vis = clamp(g.vw[p.to] * 1.15 + 0.12, 0, 1) * Math.min(1, p.age / 0.5);
      if (vis < 0.02) continue;

      // Walk back along the route to build the trail polyline.
      const pts: number[] = [hx, hy];
      let left = trailLen;
      let px = hx;
      let py = hy;
      const route = [p.from, ...p.trail.slice().reverse()];
      for (const v of route) {
        const tx = g.vx[v];
        const ty = g.vy[v];
        const seg = Math.hypot(px - tx, py - ty);
        if (seg >= left) {
          const k = left / (seg || 1);
          pts.push(px + (tx - px) * k, py + (ty - py) * k);
          left = 0;
          break;
        }
        pts.push(tx, ty);
        left -= seg;
        px = tx;
        py = ty;
      }
      const tailX = pts[pts.length - 2];
      const tailY = pts[pts.length - 1];
      const grad = fx.createLinearGradient(tailX, tailY, hx, hy);
      grad.addColorStop(0, rgba(ACCENT, 0));
      grad.addColorStop(1, rgba(ACCENT, 0.9 * vis));
      fx.strokeStyle = grad;
      fx.lineWidth = 1.5;
      fx.beginPath();
      fx.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) fx.lineTo(pts[i], pts[i + 1]);
      fx.stroke();

      fx.fillStyle = rgba(ACCENT, 0.16 * vis);
      fx.beginPath();
      fx.arc(hx, hy, 5, 0, Math.PI * 2);
      fx.fill();
      fx.fillStyle = rgba(FG, 0.95 * vis);
      fx.beginPath();
      fx.arc(hx, hy, 1.4, 0, Math.PI * 2);
      fx.fill();
    }

    // Core: breathing glow, arrival ripples, the mark itself.
    flash *= Math.exp(-dt * 2.6);
    if (!g.coreVisible) {
      ripples.length = 0;
      return;
    }
    if (glow) {
      const size = glow.width / dpr;
      fx.globalAlpha = clamp(0.62 + (reduced ? 0 : 0.12 * Math.sin(time * 1.1)) + 0.38 * flash, 0, 1);
      fx.drawImage(glow, g.cx - size / 2, g.cy - size / 2, size, size);
      fx.globalAlpha = 1;
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      ripples[i] += dt;
      const life = ripples[i] / 1.6;
      if (life >= 1) {
        ripples.splice(i, 1);
        continue;
      }
      const eased = 1 - Math.pow(1 - life, 3);
      fx.strokeStyle = rgba(ACCENT, 0.42 * (1 - life));
      fx.lineWidth = 1;
      fx.stroke(g.hex(g.R * (1.15 + 2.1 * eased)));
    }

    fx.fillStyle = rgba(ACCENT, 1);
    fx.fill(g.mark, 'evenodd');
    if (flash > 0.01) {
      fx.fillStyle = rgba(FG, 0.4 * flash);
      fx.fill(g.mark, 'evenodd');
    }
  }

  /* -- Loop -------------------------------------------------------------------- */

  let running = false;
  let visible = true;
  let raf = 0;
  let last = 0;
  let lastDraw = 0;
  /** Drawing is skipped while the page is actively scrolling — scroll smoothness wins. */
  let scrollingUntil = 0;
  window.addEventListener(
    'scroll',
    () => {
      scrollingUntil = performance.now() + 140;
    },
    { passive: true },
  );

  function frame(now: number): void {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (now < scrollingUntil) {
      last = now;
      lastDraw = now;
      return;
    }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (lite && now - lastDraw < 30) return;
    const step = lite ? Math.min(0.08, (now - lastDraw) / 1000) : dt;
    lastDraw = now;
    time += step;

    const g = geo;
    if (!g) return;

    if (interactive) {
      const k = 1 - Math.exp(-step * 3.2);
      const heroW = g.w - INSET * 2;
      const heroH = g.h - INSET * 2;
      const tx = pointerIn ? -((pointerX - INSET) / heroW - 0.5) * 2 * PARALLAX : 0;
      const ty = pointerIn ? -((pointerY - INSET) / heroH - 0.5) * 2 * PARALLAX * 0.66 : 0;
      offX += (tx - offX) * k;
      offY += (ty - offY) * k;
      wrap.style.transform = `translate3d(${offX.toFixed(2)}px, ${offY.toFixed(2)}px, 0)`;
      spot += ((pointerIn ? 1 : 0) - spot) * (1 - Math.exp(-step * 6));
    }

    stepPulses(g, step);
    drawFx(step);
  }

  function start(): void {
    if (running || reduced || !geo) return;
    running = true;
    last = performance.now();
    lastDraw = last;
    raf = requestAnimationFrame(frame);
  }

  function stop(): void {
    running = false;
    cancelAnimationFrame(raf);
  }

  const sync = (): void => {
    if (visible && !document.hidden) start();
    else stop();
  };

  /* -- Wiring ------------------------------------------------------------------ */

  layout();
  wrap.classList.add('is-ready');
  if (reduced) {
    drawFx(0);
  } else {
    observeVisibility(hero, (v) => {
      visible = v;
      sync();
    });
    document.addEventListener('visibilitychange', sync);
    sync();
  }

  hero.addEventListener(
    'pointermove',
    (event: PointerEvent) => {
      if (!interactive || event.pointerType === 'touch') return;
      // Local canvas coordinates; the wrapper is offset by -INSET and the current parallax.
      const rect = hero.getBoundingClientRect();
      pointerX = event.clientX - rect.left + INSET - offX;
      pointerY = event.clientY - rect.top + INSET - offY;
      pointerIn = true;
    },
    { passive: true },
  );
  hero.addEventListener('pointerleave', () => {
    pointerIn = false;
  });

  let resizeTimer = 0;
  let lastW = hero.clientWidth;
  let lastH = hero.clientHeight;
  const ro = new ResizeObserver(() => {
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    if (Math.abs(w - lastW) < 1 && Math.abs(h - lastH) < 1) return;
    lastW = w;
    lastH = h;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(layout, 160);
  });
  ro.observe(hero);

  // Text metrics change once the web font is in — re-measure the copy mask.
  if (document.fonts.status !== 'loaded') {
    void document.fonts.ready.then(() => layout());
  }
}

/* ---- Start after first paint ------------------------------------------------ */

function whenIdle(cb: () => void): void {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(cb, { timeout: 900 });
  else window.setTimeout(cb, 200);
}

const heroEl = document.querySelector<HTMLElement>('[data-hero]');
if (heroEl && typeof Path2D === 'function' && typeof DOMMatrix === 'function') {
  requestAnimationFrame(() => requestAnimationFrame(() => whenIdle(() => boot(heroEl))));
}

export {};
