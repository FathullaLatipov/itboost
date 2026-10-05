/**
 * Project screenshot lightbox (native <dialog>, markup in components/sections/work/Lightbox.astro).
 *
 * Triggers: any element with `data-lightbox="<id>"` and `data-lb-*` attributes generated at build
 * time (see components/sections/work/media.ts). The large image is requested only on open.
 * Navigation order = visible cards of the project index ([data-work-grid]), so ← / → follow the
 * active filter. Esc and backdrop clicks close; focus returns to the trigger; page scroll is locked.
 */
import { prefersReducedMotion } from './motion';

type Device = 'desktop' | 'phone';

interface LightboxItem {
  id: string;
  src: string;
  srcset: string;
  width: number;
  height: number;
  alt: string;
  name: string;
  url: string;
  label: string;
  device: Device;
}

const CLOSE_MS = 240;
const SWIPE_PX = 50;

const isDevice = (value: unknown): value is Device => value === 'desktop' || value === 'phone';

function readItem(el: HTMLElement): LightboxItem | null {
  const d = el.dataset;
  const width = Number(d.lbW);
  const height = Number(d.lbH);
  if (!d.lightbox || !d.lbSrc || !d.lbName || !d.lbUrl || !Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }
  return {
    id: d.lightbox,
    src: d.lbSrc,
    srcset: d.lbSrcset ?? '',
    width,
    height,
    alt: d.lbAlt ?? d.lbName,
    name: d.lbName,
    url: d.lbUrl,
    label: d.lbLabel ?? d.lbUrl,
    device: isDevice(d.lbDevice) ? d.lbDevice : 'desktop',
  };
}

const isItem = (value: LightboxItem | null): value is LightboxItem => value !== null;
const pad = (n: number): string => String(n).padStart(2, '0');

function sizesFor(device: Device): string {
  return device === 'phone' ? '(min-width: 768px) 440px, 82vw' : '(min-width: 1540px) 1440px, 94vw';
}

function query<T extends Element>(root: ParentNode, selector: string, ctor: { new (): T }): T | null {
  const el = root.querySelector(selector);
  return el instanceof ctor ? el : null;
}

function init(): void {
  const dialog = query(document, '[data-lightbox-dialog]', HTMLDialogElement);
  if (!dialog) return;

  const img = query(dialog, '[data-lb-img]', HTMLImageElement);
  const stage = query(dialog, '[data-lb-stage]', HTMLElement);
  const title = query(dialog, '[data-lb-title]', HTMLElement);
  const link = query(dialog, '[data-lb-link]', HTMLAnchorElement);
  const linkLabel = query(dialog, '[data-lb-linklabel]', HTMLElement);
  const indexEl = query(dialog, '[data-lb-index]', HTMLElement);
  const totalEl = query(dialog, '[data-lb-total]', HTMLElement);
  const status = query(dialog, '[data-lb-status]', HTMLElement);
  const closeBtn = query(dialog, '[data-lb-close]', HTMLButtonElement);
  const prevBtn = query(dialog, '[data-lb-prev]', HTMLButtonElement);
  const nextBtn = query(dialog, '[data-lb-next]', HTMLButtonElement);
  if (!img || !stage || !title || !link || !linkLabel || !indexEl || !totalEl || !closeBtn || !prevBtn || !nextBtn) {
    return;
  }

  const root = document.documentElement;
  let items: LightboxItem[] = [];
  let current = 0;
  let trigger: HTMLElement | null = null;
  let loadToken = 0;
  let closeTimer = 0;

  const gridTriggers = (visibleOnly: boolean): HTMLElement[] =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-work-grid] [data-lightbox]')).filter(
      (el) => !visibleOnly || el.closest('[hidden]') === null,
    );

  const preload = (item: LightboxItem): void => {
    const probe = new Image();
    probe.sizes = sizesFor(item.device);
    if (item.srcset) probe.srcset = item.srcset;
    probe.src = item.src;
  };

  const render = (index: number, announce: boolean): void => {
    const item = items[index];
    if (!item) return;
    current = index;
    const token = ++loadToken;

    stage.classList.remove('is-loaded');
    stage.classList.add('is-loading');
    img.removeAttribute('srcset');
    img.removeAttribute('src');
    img.alt = item.alt;
    img.width = item.width;
    img.height = item.height;
    img.dataset.device = item.device;
    img.sizes = sizesFor(item.device);

    img.onload = (): void => {
      if (token !== loadToken) return;
      stage.classList.remove('is-loading');
      stage.classList.add('is-loaded');
      const next = items[(current + 1) % items.length];
      if (next && next !== item) preload(next);
    };
    img.onerror = (): void => {
      if (token !== loadToken) return;
      stage.classList.remove('is-loading');
    };

    if (item.srcset) img.srcset = item.srcset;
    img.src = item.src;

    title.textContent = item.name;
    link.href = item.url;
    linkLabel.textContent = item.label;
    indexEl.textContent = pad(index + 1);
    totalEl.textContent = pad(items.length);

    const single = items.length < 2;
    prevBtn.hidden = single;
    nextBtn.hidden = single;

    if (announce && status) status.textContent = `${item.name} — ${index + 1} / ${items.length}`;
  };

  const go = (step: number): void => {
    if (items.length < 2) return;
    render((current + step + items.length) % items.length, true);
  };

  const lockScroll = (): void => {
    root.style.scrollbarGutter = 'stable';
    root.style.overflow = 'hidden';
  };

  const unlockScroll = (): void => {
    root.style.removeProperty('overflow');
    root.style.removeProperty('scrollbar-gutter');
  };

  const open = (source: HTMLElement): void => {
    const id = source.dataset.lightbox;
    let list = gridTriggers(true);
    if (!list.some((el) => el.dataset.lightbox === id)) list = gridTriggers(false);
    items = list.map(readItem).filter(isItem);
    if (!items.some((item) => item.id === id)) {
      const own = readItem(source);
      items = own ? [own] : [];
    }
    if (items.length === 0) return;

    window.clearTimeout(closeTimer);
    trigger = source;
    if (status) status.textContent = '';
    render(Math.max(0, items.findIndex((item) => item.id === id)), false);
    lockScroll();
    if (!dialog.open) dialog.showModal();
    closeBtn.focus({ preventScroll: true });
    requestAnimationFrame(() => dialog.classList.add('is-open'));
  };

  const close = (): void => {
    if (!dialog.open) return;
    dialog.classList.remove('is-open');
    window.clearTimeout(closeTimer);
    if (prefersReducedMotion()) {
      dialog.close();
      return;
    }
    closeTimer = window.setTimeout(() => dialog.close(), CLOSE_MS);
  };

  // Swipe state (touch): a swipe must not also count as a backdrop tap.
  let startX = 0;
  let startY = 0;
  let tracking = false;
  let swiped = false;

  // ---- Events ----------------------------------------------------------------
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const source = target.closest<HTMLElement>('[data-lightbox]');
    if (!source || dialog.contains(source)) return;
    event.preventDefault();
    open(source);
  });

  dialog.addEventListener('close', () => {
    loadToken++;
    dialog.classList.remove('is-open');
    img.removeAttribute('srcset');
    img.removeAttribute('src');
    stage.classList.remove('is-loaded', 'is-loading');
    unlockScroll();
    trigger?.focus({ preventScroll: true });
    trigger = null;
  });

  // Esc → animated close instead of the instant native one.
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });

  dialog.addEventListener('click', (event) => {
    if (swiped) {
      swiped = false;
      return;
    }
    const target = event.target;
    if (target === dialog || (target instanceof HTMLElement && target.hasAttribute('data-lb-dismiss'))) close();
  });

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => go(1));

  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(1);
    }
  });

  // Horizontal swipe on touch screens.
  stage.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') return;
    tracking = true;
    startX = event.clientX;
    startY = event.clientY;
  });
  stage.addEventListener('pointerup', (event) => {
    if (!tracking) return;
    tracking = false;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiped = true;
      window.setTimeout(() => {
        swiped = false;
      }, 350);
      go(dx < 0 ? 1 : -1);
    }
  });
  stage.addEventListener('pointercancel', () => {
    tracking = false;
  });
}

init();

export {};
