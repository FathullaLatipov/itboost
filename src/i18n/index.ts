export const languages = ['ru', 'uz'] as const;

export type Lang = (typeof languages)[number];

export const defaultLang: Lang = 'ru';

/** Every piece of copy is stored per language and must exist in both. */
export type Localized<T> = Record<Lang, T>;

export const htmlLang: Record<Lang, string> = {
  ru: 'ru',
  uz: 'uz',
};

export const ogLocale: Record<Lang, string> = {
  ru: 'ru_RU',
  uz: 'uz_UZ',
};

export const langLabel: Record<Lang, { short: string; full: string }> = {
  ru: { short: 'RU', full: 'Русский' },
  uz: { short: 'UZ', full: "O'zbekcha" },
};

/** Root path of the home page for a language: ru → "/", uz → "/uz/". */
export function homePath(lang: Lang): string {
  return lang === defaultLang ? '/' : `/${lang}/`;
}

/** In-page anchor on the home page of the given language. */
export function anchor(lang: Lang, id: string): string {
  return `${homePath(lang)}#${id}`;
}

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (languages as readonly string[]).includes(value);
}

/** Russian-style plural picker: one / few / many. Uzbek has no plural agreement with numerals. */
export function plural(lang: Lang, n: number, forms: { one: string; few: string; many: string }): string {
  if (lang === 'uz') return forms.one;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms.one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms.few;
  return forms.many;
}
