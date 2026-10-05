/**
 * Global shell behaviour (Header.astro + MobileMenu.astro):
 *  1. Header states — `is-scrolled` past 24px; smart hide (`is-hidden`) on scroll down past 480px,
 *     shown again on any scroll up. Never hidden while the menu is open or keyboard focus is inside.
 *  2. Active section — IntersectionObserver probe line at 35% of the viewport height; drives
 *     `aria-current` on nav links and the sliding indicator (transform-only), with hover/focus preview.
 *  3. Mobile menu dialog — open/close, focus trap, Esc, scroll lock with scrollbar compensation,
 *     inert background, close-then-navigate on links, auto-close at ≥1024px.
 *     While open, <html> carries `is-menu-open` (hook for other components, e.g. pausing canvases).
 *  4. Language links keep the current section anchor when switching RU ↔ UZ.
 */

const SCROLLED_AT = 24;
const HIDE_AFTER = 480;
/** Ignore scroll jitter smaller than this (px) when deciding the scroll direction. */
const DIRECTION_THRESHOLD = 6;
/** Base width of the indicator element in CSS (scaleX is relative to it). */
const INDICATOR_BASE = 100;
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

const root = document.documentElement;
const header = document.querySelector<HTMLElement>('[data-header]');
const menu = document.querySelector<HTMLElement>('[data-menu]');
const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');

let menuOpen = false;

/* -------------------------------------------------------------------------- */
/* 1. Header scroll states                                                     */
/* -------------------------------------------------------------------------- */

function initScrollStates(bar: HTMLElement): { reveal: () => void } {
  let lastY = Math.max(0, window.scrollY);
  let scrolled = false;
  let hidden = false;
  let ticking = false;

  const setScrolled = (next: boolean): void => {
    if (next === scrolled) return;
    scrolled = next;
    bar.classList.toggle('is-scrolled', next);
  };

  const setHidden = (next: boolean): void => {
    if (next === hidden) return;
    hidden = next;
    bar.classList.toggle('is-hidden', next);
  };

  const keyboardFocusInside = (): boolean => bar.querySelector(':focus-visible') !== null;

  const update = (): void => {
    ticking = false;
    const y = Math.max(0, window.scrollY);
    setScrolled(y > SCROLLED_AT);

    if (menuOpen || y <= SCROLLED_AT) {
      setHidden(false);
      lastY = y;
      return;
    }

    const delta = y - lastY;
    // Accumulate small movements until they form a clear direction.
    if (Math.abs(delta) < DIRECTION_THRESHOLD) return;

    if (delta > 0 && y > HIDE_AFTER && !keyboardFocusInside()) setHidden(true);
    else if (delta < 0) setHidden(false);
    lastY = y;
  };

  const onScroll = (): void => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  // Keyboard focus entering a hidden header (e.g. Shift+Tab from content) brings it back.
  bar.addEventListener('focusin', () => setHidden(false));
  update();
  observeThemeUnderBar(bar);

  return { reveal: () => setHidden(false) };
}

/**
 * Tracks the theme of the content passing under the header's centre line (IntersectionObserver,
 * no scroll-time layout reads) and sets `is-over-light` so the glass can stay a crisp ink.
 */
function observeThemeUnderBar(bar: HTMLElement): void {
  const themed = Array.from(document.querySelectorAll<HTMLElement>('main [data-theme], footer[data-theme]'));
  if (!themed.length) return;
  const under = new Set<HTMLElement>();
  let io: IntersectionObserver | null = null;
  let resizeTimer = 0;

  const apply = (): void => {
    // Last match in document order = the innermost themed element under the line.
    let theme: string | null = null;
    for (const el of themed) if (under.has(el)) theme = el.getAttribute('data-theme');
    bar.classList.toggle('is-over-light', theme === 'light');
  };

  const connect = (): void => {
    io?.disconnect();
    under.clear();
    const line = Math.round(bar.offsetHeight / 2);
    const bottom = Math.max(0, window.innerHeight - line - 1);
    io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target;
          if (!(el instanceof HTMLElement)) continue;
          if (entry.isIntersecting) under.add(el);
          else under.delete(el);
        }
        apply();
      },
      { rootMargin: `-${line}px 0px -${bottom}px 0px`, threshold: 0 },
    );
    themed.forEach((el) => io?.observe(el));
  };

  connect();
  window.addEventListener(
    'resize',
    () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(connect, 150);
    },
    { passive: true },
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Active section + sliding indicator                                       */
/* -------------------------------------------------------------------------- */

/** Raw id of the section under the probe line (also used by the language links). */
let currentSection: string | null = null;

function initActiveSection(): void {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('main section[id]'));
  const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-nav-link]'));
  const list = document.querySelector<HTMLElement>('[data-nav-list]');
  const indicator = document.querySelector<HTMLElement>('[data-nav-indicator]');
  if (!sections.length || !navLinks.length) return;

  const navIds = new Set(navLinks.map((link) => link.dataset.navLink ?? ''));
  const barLinks = new Map<string, HTMLAnchorElement>();
  if (list) {
    list.querySelectorAll<HTMLAnchorElement>('[data-nav-link]').forEach((link) => {
      const id = link.dataset.navLink;
      if (id) barLinks.set(id, link);
    });
  }

  let activeId: string | null = null;
  let shownId: string | null = null;

  const placeIndicator = (id: string | null): void => {
    if (!indicator) return;
    shownId = id;
    const link = id ? barLinks.get(id) : undefined;
    if (!link || !link.offsetParent) {
      indicator.classList.add('is-hidden');
      return;
    }
    // The label's offsetParent is the positioned <nav>, which also contains the indicator.
    const label = link.firstElementChild instanceof HTMLElement ? link.firstElementChild : link;
    const x = label.offsetLeft;
    const w = label.offsetWidth;
    const wasHidden = indicator.classList.contains('is-hidden');
    indicator.style.transform = `translate3d(${x}px, 0, 0) scaleX(${w / INDICATOR_BASE})`;
    if (wasHidden) {
      // Commit the new position without a slide, then fade in.
      void getComputedStyle(indicator).transform;
      indicator.classList.remove('is-hidden');
    }
  };

  const setActive = (sectionId: string | null): void => {
    currentSection = sectionId;
    const next = sectionId && navIds.has(sectionId) ? sectionId : null;
    if (next === activeId) return;
    activeId = next;
    for (const link of navLinks) {
      if (link.dataset.navLink === next) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
    placeIndicator(next);
  };

  // A thin band at 35% of the viewport height acts as the probe line.
  const intersecting = new Set<string>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) intersecting.add(entry.target.id);
        else intersecting.delete(entry.target.id);
      }
      let current: string | null = null;
      for (const section of sections) if (intersecting.has(section.id)) current = section.id;

      // Past the last section (footer): keep the last one active.
      if (current === null) {
        const last = sections[sections.length - 1];
        if (last && last.getBoundingClientRect().bottom < window.innerHeight * 0.35) current = last.id;
      }
      setActive(current);
    },
    { rootMargin: '-35% 0px -64.5% 0px', threshold: 0 },
  );
  sections.forEach((section) => io.observe(section));

  if (!list || !indicator) return;

  // Hover / keyboard preview, returning to the active link afterwards.
  list.addEventListener('pointerover', (event) => {
    if (event.pointerType !== 'mouse') return;
    const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('[data-nav-link]') : null;
    const id = target?.dataset.navLink;
    if (id && id !== shownId) placeIndicator(id);
  });
  list.addEventListener('pointerleave', () => {
    if (shownId !== activeId) placeIndicator(activeId);
  });
  list.addEventListener('focusin', (event) => {
    const target = event.target instanceof HTMLAnchorElement ? event.target : null;
    if (target?.matches(':focus-visible') && target.dataset.navLink) placeIndicator(target.dataset.navLink);
  });
  list.addEventListener('focusout', (event) => {
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !list.contains(next)) placeIndicator(activeId);
  });

  // Fonts loading or viewport changes shift link positions — re-measure.
  const ro = new ResizeObserver(() => placeIndicator(shownId));
  ro.observe(list);
}

/* -------------------------------------------------------------------------- */
/* 3. Mobile menu dialog                                                       */
/* -------------------------------------------------------------------------- */

function initMenu(panel: HTMLElement, opener: HTMLButtonElement, revealHeader: () => void): void {
  const closer = panel.querySelector<HTMLButtonElement>('[data-menu-close]');
  const desktop = window.matchMedia('(min-width: 1024px)');
  const labelOpen = opener.dataset.labelOpen ?? opener.getAttribute('aria-label') ?? '';
  const labelClose = opener.dataset.labelClose ?? labelOpen;
  let madeInert: HTMLElement[] = [];

  const setIconState = (state: 'open' | 'closed'): void => {
    opener.dataset.state = state;
    if (closer) closer.dataset.state = state;
  };

  const lockScroll = (): void => {
    const gap = Math.max(0, window.innerWidth - root.clientWidth);
    root.style.setProperty('--scroll-lock-gap', `${gap}px`);
    root.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    if (gap) document.body.style.paddingRight = `${gap}px`;
  };

  const unlockScroll = (): void => {
    root.style.removeProperty('--scroll-lock-gap');
    root.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  };

  const setBackgroundInert = (inert: boolean): void => {
    if (inert) {
      madeInert = Array.from(document.body.children).filter(
        (el): el is HTMLElement => el instanceof HTMLElement && el !== panel && !el.inert && el.tagName !== 'SCRIPT',
      );
      madeInert.forEach((el) => (el.inert = true));
    } else {
      madeInert.forEach((el) => (el.inert = false));
      madeInert = [];
    }
  };

  const focusables = (): HTMLElement[] =>
    Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key !== 'Tab') return;
    const items = focusables();
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    const active = document.activeElement;
    const outside = !(active instanceof Node) || !panel.contains(active);
    if (event.shiftKey && (active === first || outside)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || outside)) {
      event.preventDefault();
      first.focus();
    }
  };

  function open(): void {
    if (menuOpen || desktop.matches) return;
    menuOpen = true;
    revealHeader();
    lockScroll();
    panel.classList.add('is-open');
    root.classList.add('is-menu-open');
    opener.setAttribute('aria-expanded', 'true');
    opener.setAttribute('aria-label', labelClose);
    setIconState('open');
    setBackgroundInert(true);
    document.addEventListener('keydown', onKeydown);
    const firstLink = panel.querySelector<HTMLElement>('[data-menu-link]');
    firstLink?.focus({ preventScroll: true });
  }

  function close(restoreFocus: boolean): void {
    if (!menuOpen) return;
    menuOpen = false;
    panel.classList.remove('is-open');
    root.classList.remove('is-menu-open');
    opener.setAttribute('aria-expanded', 'false');
    opener.setAttribute('aria-label', labelOpen);
    setIconState('closed');
    setBackgroundInert(false);
    unlockScroll();
    document.removeEventListener('keydown', onKeydown);
    if (restoreFocus) {
      opener.focus({ preventScroll: true });
    } else if (document.activeElement instanceof HTMLElement && panel.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  }

  opener.addEventListener('click', () => (menuOpen ? close(true) : open()));
  closer?.addEventListener('click', () => close(true));

  // Links close the menu first (unlocking scroll synchronously), then the default navigation runs.
  panel.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest('[data-menu-link]') : null;
    if (link) close(false);
  });

  desktop.addEventListener('change', (event) => {
    if (event.matches) close(false);
  });

  // Back/forward cache can restore a page with the menu open — reset it.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) close(false);
  });
}

/* -------------------------------------------------------------------------- */
/* 4. Language links keep the current section                                  */
/* -------------------------------------------------------------------------- */

function initLanguageLinks(): void {
  document.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-lang-link]') : null;
    if (!link || link.getAttribute('aria-current') === 'true') return;
    const url = new URL(link.href, window.location.href);
    url.hash = currentSection && currentSection !== 'top' ? currentSection : '';
    link.href = url.href;
  });
}

/* -------------------------------------------------------------------------- */

let revealHeader = (): void => {};
if (header) revealHeader = initScrollStates(header).reveal;
initActiveSection();
if (menu && toggle) initMenu(menu, toggle, revealHeader);
initLanguageLinks();

// iOS Safari only applies `:active` (the press feedback in base.css) once a touch listener exists.
// Passive and empty: it never delays or blocks scrolling.
document.addEventListener('touchstart', () => {}, { passive: true });

export {};
