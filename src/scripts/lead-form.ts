/**
 * Lead form behaviour: validation, submission states, and the cross-section
 * `[data-lead-service]` → service preselect contract.
 *
 * - Validates on submit, then on blur (and live-clears errors on input) after the first submit.
 * - Errors: `aria-invalid` + text in the element referenced by `aria-describedby`; the first
 *   invalid field receives focus.
 * - While sending: submit button `aria-disabled` (keeps focus), spinner, `form.sending` label;
 *   a flag makes double submission impossible.
 * - Result is announced in a polite live region and stays visible (scrolled into view if needed).
 * - Phone field: "+998 " is prefilled on focus and the number is formatted to "+998 90 123-45-67"
 *   while typing — only when the caret is at the end, so mid-string edits are never fought.
 * - Enter in a field with `enterkeyhint="next"` moves to the next field instead of submitting.
 */
import { isLang } from '@/i18n';
import type { Lang } from '@/i18n';
import { submitLead } from '@/lib/lead';
import type { LeadPayload } from '@/lib/lead';
import { prefersReducedMotion } from './motion';

type FieldName = 'name' | 'phone' | 'service' | 'message';
type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

interface Field {
  name: FieldName;
  control: Control;
  wrapper: HTMLElement;
  error: HTMLElement;
  message: string;
}

const FIELD_NAMES: readonly FieldName[] = ['name', 'phone', 'service', 'message'];

const PHONE_CHARS = /^[+\d\s().-]+$/;

const VALIDATORS: Record<FieldName, (value: string) => boolean> = {
  name: (value) => value.trim().length >= 2,
  phone: (value) => {
    const digits = value.replace(/\D/g, '').length;
    return PHONE_CHARS.test(value.trim()) && digits >= 9 && digits <= 15;
  },
  service: (value) => value !== '',
  message: (value) => value.trim().length >= 2,
};

const isControl = (el: unknown): el is Control =>
  el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement;

/** Collapses whitespace runs; keeps line breaks in the message. */
const clean = (value: string, multiline = false): string =>
  multiline
    ? value
        .replace(/\r\n?/g, '\n')
        .replace(/[^\S\n]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    : value.replace(/\s+/g, ' ').trim();

/* ---- Phone input: +998 prefill + progressive formatting ------------------------ */

const UZ_PREFIX = '+998';
const UZ_PREFILL = `${UZ_PREFIX} `;
/** Digits after the country code in an Uzbek number (operator code + 7). */
const UZ_SUBSCRIBER_LENGTH = 9;

/** "+998 90 123-45-67" built from up to 9 subscriber digits. Never ends with a separator. */
function formatUzPhone(subscriber: string): string {
  const d = subscriber.slice(0, UZ_SUBSCRIBER_LENGTH);
  let out = UZ_PREFIX;
  if (d.length > 0) out += ` ${d.slice(0, 2)}`;
  if (d.length > 2) out += ` ${d.slice(2, 5)}`;
  if (d.length > 5) out += `-${d.slice(5, 7)}`;
  if (d.length > 7) out += `-${d.slice(7, 9)}`;
  return out;
}

/** Subscriber digits if the value is a "+998…" / "998…" number, otherwise null (left as typed). */
function uzSubscriber(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\+?\s*9\s*9\s*8/.test(trimmed)) return null;
  return trimmed.replace(/\D/g, '').slice(3);
}

/** True for a single typed character (not paste, autofill, drop or IME composition). */
const isKeystroke = (event: Event): boolean =>
  event instanceof InputEvent && event.inputType === 'insertText' && !event.isComposing && (event.data ?? '').length === 1;

function bindPhoneInput(input: HTMLInputElement): void {
  const caretAtEnd = (): boolean => {
    const end = input.value.length;
    return input.selectionStart === end && input.selectionEnd === end;
  };
  const caretToEnd = (): void => {
    const end = input.value.length;
    input.setSelectionRange(end, end);
  };
  const setValue = (next: string): void => {
    if (next === input.value) return;
    input.value = next;
    caretToEnd();
  };

  input.addEventListener('focus', () => {
    if (input.value !== '') return;
    input.value = UZ_PREFILL;
    caretToEnd();
    // Touch browsers place the caret at the tap point after focusing — settle it at the end.
    requestAnimationFrame(() => {
      const collapsed = input.selectionStart === input.selectionEnd; // never undo a user's selection
      if (document.activeElement === input && input.value === UZ_PREFILL && collapsed) caretToEnd();
    });
  });

  // A tap inside the bare prefix would otherwise leave the caret before "998".
  input.addEventListener('click', () => {
    if (input.value === UZ_PREFILL && input.selectionStart === input.selectionEnd && !caretAtEnd()) caretToEnd();
  });

  input.addEventListener('input', (event) => {
    if (event instanceof InputEvent && event.isComposing) return;
    if (!caretAtEnd()) return; // mid-string edit: leave it exactly as the user made it
    const subscriber = uzSubscriber(input.value);
    if (subscriber === null) return; // not a +998 number: keep as typed
    if (subscriber.length > UZ_SUBSCRIBER_LENGTH) {
      // An extra typed digit is dropped (mask behaviour); pasted / autofilled text is never cut.
      if (isKeystroke(event)) setValue(formatUzPhone(subscriber));
      return;
    }
    setValue(formatUzPhone(subscriber));
  });

  input.addEventListener('paste', (event) => {
    const text = event.clipboardData?.getData('text') ?? '';
    const digits = text.replace(/\D/g, '');
    if (digits === '') return;
    // Take over only when the paste replaces everything (empty field, bare prefix or full selection).
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const kept = (input.value.slice(0, start) + input.value.slice(end)).trim();
    if (kept !== '' && kept !== UZ_PREFIX) return;

    let next = text.trim();
    if (digits.length === UZ_SUBSCRIBER_LENGTH + 3 && digits.startsWith('998')) next = formatUzPhone(digits.slice(3));
    else if (digits.length === UZ_SUBSCRIBER_LENGTH && !next.startsWith('+')) next = formatUzPhone(digits);

    event.preventDefault();
    input.value = next;
    caretToEnd();
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  // Registered before the validation listeners, so they see the tidied value.
  input.addEventListener('blur', () => {
    const value = input.value.trim();
    if (value === UZ_PREFIX) {
      input.value = ''; // only the prefill — treat as empty
      return;
    }
    const subscriber = uzSubscriber(value);
    if (subscriber !== null && subscriber.length <= UZ_SUBSCRIBER_LENGTH) input.value = formatUzPhone(subscriber);
  });
}

/* ---------------------------------------------------------------------------- */

interface LeadFormApi {
  preselect: (serviceId: string) => boolean;
}

function initLeadForm(form: HTMLFormElement): LeadFormApi | null {
  const langValue = form.dataset.lang;
  if (!isLang(langValue)) {
    console.error('[lead] form is missing a valid data-lang');
    return null;
  }
  const lang: Lang = langValue;

  const fields: Field[] = [];
  for (const name of FIELD_NAMES) {
    const control = form.elements.namedItem(name);
    const wrapper = form.querySelector<HTMLElement>(`[data-field="${name}"]`);
    const error = wrapper?.querySelector<HTMLElement>('[data-error]');
    if (!isControl(control) || !wrapper || !error) {
      console.error(`[lead] field "${name}" markup is incomplete`);
      return null;
    }
    fields.push({ name, control, wrapper, error, message: error.dataset.error ?? '' });
  }

  const honeypot = form.elements.namedItem('company');
  const status = form.querySelector<HTMLElement>('[data-lead-status]');
  const submit = form.querySelector<HTMLButtonElement>('[data-lead-submit]');
  const submitLabel = submit?.querySelector<HTMLElement>('.btn__label') ?? null;
  const idleLabel = submitLabel?.textContent?.trim() ?? '';
  const sendingLabel = form.dataset.sending ?? idleLabel;
  if (!status || !submit) {
    console.error('[lead] status region or submit button missing');
    return null;
  }

  // JS takes over validation (custom, localized messages).
  form.noValidate = true;

  let attempted = false;
  let sending = false;

  /* ---- validation ---- */

  const setInvalid = (field: Field, invalid: boolean): void => {
    field.wrapper.classList.toggle('is-invalid', invalid);
    if (invalid) {
      field.control.setAttribute('aria-invalid', 'true');
      if (field.error.textContent !== field.message) field.error.textContent = field.message;
    } else {
      field.control.removeAttribute('aria-invalid');
      field.error.textContent = '';
    }
  };

  const validate = (field: Field): boolean => {
    const valid = VALIDATORS[field.name](field.control.value);
    setInvalid(field, !valid);
    return valid;
  };

  const phone = fields.find((f) => f.name === 'phone')?.control;
  if (phone instanceof HTMLInputElement) bindPhoneInput(phone);

  // "Next" on the on-screen keyboard (enterkeyhint="next") moves on instead of submitting.
  fields.forEach((field, i) => {
    if (field.control.getAttribute('enterkeyhint') !== 'next') return;
    field.control.addEventListener('keydown', (event) => {
      if (!(event instanceof KeyboardEvent) || event.key !== 'Enter' || event.isComposing) return;
      if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
      const next = fields[i + 1]?.control;
      if (!next) return;
      event.preventDefault();
      next.focus();
    });
  });

  for (const field of fields) {
    field.control.addEventListener('blur', () => {
      if (attempted) validate(field);
    });
    const live = (): void => {
      // Clear an error as soon as it is fixed; do not nag while typing.
      if (field.wrapper.classList.contains('is-invalid')) validate(field);
    };
    field.control.addEventListener('input', live);
    field.control.addEventListener('change', live);
  }

  /* ---- status ---- */

  const clearStatus = (): void => {
    status.replaceChildren();
  };

  const showStatus = (kind: 'success' | 'error'): void => {
    const template = form.querySelector<HTMLTemplateElement>(`template[data-lead-template="${kind}"]`);
    if (!template) {
      console.error(`[lead] status template "${kind}" missing`);
      return;
    }
    status.replaceChildren(template.content.cloneNode(true));
    // Make sure the result is actually seen — on phones it often lands below the fold or under the
    // fixed header. scrollIntoView honours the page's scroll-padding (header / dock clearance).
    const rect = status.getBoundingClientRect();
    const style = getComputedStyle(document.documentElement);
    const topClear = Number.parseFloat(style.scrollPaddingTop) || 0;
    const bottomClear = Number.parseFloat(style.scrollPaddingBottom) || 0;
    const viewH = window.visualViewport?.height ?? window.innerHeight;
    if (rect.top < topClear || rect.bottom > viewH - bottomClear) {
      status.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  };

  const setSending = (value: boolean): void => {
    sending = value;
    form.setAttribute('aria-busy', String(value));
    submit.classList.toggle('is-sending', value);
    if (value) submit.setAttribute('aria-disabled', 'true');
    else submit.removeAttribute('aria-disabled');
    if (submitLabel) submitLabel.textContent = value ? sendingLabel : idleLabel;
  };

  /* ---- submit ---- */

  const valueOf = (name: FieldName): string => fields.find((f) => f.name === name)?.control.value ?? '';

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (sending) return;

    attempted = true;
    const invalid = fields.filter((field) => !validate(field));
    if (invalid.length > 0) {
      clearStatus();
      invalid[0]?.control.focus();
      return;
    }

    const payload: LeadPayload = {
      name: clean(valueOf('name')),
      phone: clean(valueOf('phone')),
      service: valueOf('service'),
      message: clean(valueOf('message'), true),
      lang,
      page: window.location.href,
      company: honeypot instanceof HTMLInputElement ? honeypot.value : '',
    };

    clearStatus();
    setSending(true);

    void submitLead(payload)
      .then((result) => {
        if (result.ok) {
          form.reset();
          fields.forEach((field) => setInvalid(field, false));
          attempted = false;
          showStatus('success');
        } else {
          showStatus('error');
        }
      })
      .catch((error: unknown) => {
        // submitLead never throws by contract — this is a last-resort guard.
        console.error('[lead] unexpected failure', error);
        showStatus('error');
      })
      .finally(() => setSending(false));
  });

  /* ---- preselect ---- */

  const serviceField = fields.find((f) => f.name === 'service');

  const highlight = (wrapper: HTMLElement): void => {
    const run = (): void => {
      wrapper.classList.remove('is-highlight');
      void wrapper.offsetWidth; // restart the animation
      wrapper.classList.add('is-highlight');
      window.setTimeout(() => wrapper.classList.remove('is-highlight'), 1700);
    };
    // Links usually scroll to #contact first: flash once the select is actually on screen.
    if (!('IntersectionObserver' in window)) {
      run();
      return;
    }
    let done = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (done || !entries.some((entry) => entry.isIntersecting)) return;
        done = true;
        io.disconnect();
        window.setTimeout(run, 120);
      },
      { threshold: 0.9 },
    );
    io.observe(wrapper);
    window.setTimeout(() => {
      if (done) return;
      done = true;
      io.disconnect();
    }, 4000);
  };

  const preselect = (serviceId: string): boolean => {
    if (!serviceField || !(serviceField.control instanceof HTMLSelectElement)) return false;
    const select = serviceField.control;
    const option = Array.from(select.options).find((o) => o.dataset.serviceId === serviceId);
    if (!option) {
      console.warn(`[lead] unknown data-lead-service "${serviceId}"`);
      return false;
    }
    select.value = option.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    highlight(serviceField.wrapper);
    return true;
  };

  return { preselect };
}

/* ---------------------------------------------------------------------------- */

function init(): void {
  const forms = Array.from(document.querySelectorAll<HTMLFormElement>('form[data-lead-form]'));
  const apis = forms.map(initLeadForm).filter((api): api is LeadFormApi => api !== null);
  if (apis.length === 0) return;

  // Contract: any element with data-lead-service="<ServiceId>" preselects that service.
  // Delegated, so sections rendered later (or by other components) work too. Focus is not moved.
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const trigger = target.closest<HTMLElement>('[data-lead-service]');
    const serviceId = trigger?.dataset.leadService;
    if (!serviceId) return;
    apis.forEach((api) => api.preselect(serviceId));
  });
}

init();

export {};
