/**
 * Mobile action dock (src/components/layout/MobileDock.astro).
 *
 * The dock is visible when ALL of these hold:
 *   - viewport below 1024px,
 *   - the hero (#top) has scrolled out of the viewport (upwards),
 *   - neither the contact section (#contact) nor the footer is in the viewport,
 *   - the mobile menu is closed (`html.is-menu-open`, set by header.ts),
 *   - no form field has focus (the on-screen keyboard would push the dock over the field),
 *   - no <dialog> is open (e.g. the project lightbox).
 *
 * Every input is event-driven — IntersectionObserver, MutationObserver, focus and media-query
 * events — so nothing runs per scroll frame. Show/hide is a transform + opacity transition in CSS
 * (instant under reduced motion via the global kill-switch). Hidden = `visibility: hidden` + `inert`.
 * While visible, <html> carries `is-dock-visible` (adds a matching scroll-padding-bottom).
 */

const DESKTOP = '(min-width: 1024px)';

/** Controls that raise the on-screen keyboard (or a native picker) when focused. */
const FIELD_SELECTOR = [
  'textarea',
  'select',
  '[contenteditable]:not([contenteditable="false"])',
  'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]):not([type="hidden"])',
].join(', ');

const isField = (target: EventTarget | null): boolean => target instanceof Element && target.matches(FIELD_SELECTOR);

interface DockState {
  pastHero: boolean;
  inEndZone: boolean;
  menuOpen: boolean;
  fieldFocused: boolean;
  dialogOpen: boolean;
}

function initDock(dock: HTMLElement): void {
  const root = document.documentElement;
  const desktop = window.matchMedia(DESKTOP);
  const hero = document.getElementById('top');
  const endZones = [document.getElementById('contact'), document.querySelector('body > footer')].filter(
    (el): el is HTMLElement => el instanceof HTMLElement,
  );

  const state: DockState = {
    // Pages without a hero show the dock from the start.
    pastHero: hero === null,
    inEndZone: false,
    menuOpen: root.classList.contains('is-menu-open'),
    fieldFocused: isField(document.activeElement),
    dialogOpen: document.querySelector('dialog[open]') !== null,
  };
  let visible = false;

  const render = (): void => {
    const next =
      !desktop.matches &&
      state.pastHero &&
      !state.inEndZone &&
      !state.menuOpen &&
      !state.fieldFocused &&
      !state.dialogOpen;
    // Always re-assert `inert`: header.ts toggles it on every body child while the menu is open.
    dock.inert = !next;
    if (next === visible) return;
    visible = next;
    dock.classList.toggle('is-visible', next);
    root.classList.toggle('is-dock-visible', next);
  };

  // 1. Hero has left the viewport — upwards only (entering from below is impossible for #top).
  if (hero) {
    new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        state.pastHero = !entry.isIntersecting && entry.boundingClientRect.bottom <= 0;
        render();
      },
      { threshold: 0 },
    ).observe(hero);
  }

  // 2. Contact section / footer in view: the form and direct contacts are right there.
  if (endZones.length > 0) {
    const inView = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inView.add(entry.target);
          else inView.delete(entry.target);
        }
        state.inEndZone = inView.size > 0;
        render();
      },
      { threshold: 0 },
    );
    endZones.forEach((el) => io.observe(el));
  }

  // 3. Mobile menu (class on <html>, owned by header.ts).
  new MutationObserver(() => {
    state.menuOpen = root.classList.contains('is-menu-open');
    render();
  }).observe(root, { attributes: true, attributeFilter: ['class'] });

  // 4. Any <dialog open> (only `open` attribute mutations are delivered).
  new MutationObserver(() => {
    state.dialogOpen = document.querySelector('dialog[open]') !== null;
    render();
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });

  // 5. Focused form field → the on-screen keyboard is (likely) up.
  document.addEventListener('focusin', (event) => {
    const next = isField(event.target);
    if (next === state.fieldFocused) return;
    state.fieldFocused = next;
    render();
  });
  document.addEventListener('focusout', (event) => {
    // Moving between fields keeps the dock hidden; leaving them shows it again.
    if (!state.fieldFocused || isField(event.relatedTarget)) return;
    state.fieldFocused = false;
    render();
  });

  desktop.addEventListener('change', render);

  // Back/forward cache restores the old DOM state — re-evaluate.
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    state.menuOpen = root.classList.contains('is-menu-open');
    state.fieldFocused = isField(document.activeElement);
    state.dialogOpen = document.querySelector('dialog[open]') !== null;
    render();
  });

  render();
}

const dock = document.querySelector<HTMLElement>('[data-dock]');
if (dock) initDock(dock);

export {};
