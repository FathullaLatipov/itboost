import type { Localized } from '@/i18n';

/** Label forms for a number in front of it (see `plural()` in `@/i18n`). Uzbek uses `one` only. */
export interface CountLabel {
  one: string;
  few: string;
  many: string;
}

export interface HeroCopy {
  eyebrow: string;
  /** Display headline split into visual lines. `accent` marks the line rendered in Boost Blue. */
  title: { text: string; accent?: boolean }[];
  lead: string;
  ctaPrimary: string;
  ctaSecondary: string;
  status: string;
  /** Labels that follow a computed number, e.g. "17 проектов в портфолио". */
  stats: {
    projects: CountLabel;
    services: CountLabel;
    team: CountLabel;
  };
  clientsLabel: string;
  /** Accessible name of the client-marquee pause toggle. */
  clientsPause: string;
  scrollHint: string;
}

export const hero: Localized<HeroCopy> = {
  ru: {
    eyebrow: 'IT-студия · Ташкент',
    title: [{ text: 'Цифровые системы,' }, { text: 'которые ускоряют', accent: true }, { text: 'ваш бизнес' }],
    lead: 'Сайты, платформы, мобильные приложения, Telegram-боты и AI-автоматизация — проектируем, разрабатываем и поддерживаем под задачи вашего бизнеса.',
    ctaPrimary: 'Обсудить проект',
    ctaSecondary: 'Смотреть проекты',
    status: 'Открыты для новых проектов',
    stats: {
      //   binds the short preposition to its noun: "проектов / в портфолио", never "в" at a line end.
      projects: { one: 'проект в портфолио', few: 'проекта в портфолио', many: 'проектов в портфолио' },
      services: { one: 'направление разработки', few: 'направления разработки', many: 'направлений разработки' },
      team: { one: 'специалист в команде', few: 'специалиста в команде', many: 'специалистов в команде' },
    },
    clientsLabel: 'Нам доверяют',
    clientsPause: 'Остановить ленту клиентов',
    scrollHint: 'Листайте',
  },
  uz: {
    eyebrow: 'IT-studiya · Toshkent',
    title: [{ text: 'Biznesingizni' }, { text: 'tezlashtiradigan', accent: true }, { text: 'raqamli tizimlar' }],
    lead: "Saytlar, platformalar, mobil ilovalar, Telegram-botlar va AI-avtomatlashtirish — biznesingiz vazifalari uchun loyihalaymiz, ishlab chiqamiz va qo'llab-quvvatlaymiz.",
    ctaPrimary: 'Loyihani muhokama qilish',
    ctaSecondary: "Loyihalarni ko'rish",
    status: 'Yangi loyihalarga ochiqmiz',
    // \u00AD (soft hyphen): the long words may break only where a 3-column stat at 320px needs it.
    stats: {
      projects: { one: 'portfoliodagi loyihalar', few: 'portfoliodagi loyihalar', many: 'portfoliodagi loyihalar' },
      services: {
        one: "ishlab chiqish yo'nalish\u00ADlari",
        few: "ishlab chiqish yo'nalish\u00ADlari",
        many: "ishlab chiqish yo'nalish\u00ADlari",
      },
      team: {
        one: 'jamoadagi mutaxas\u00ADsislar',
        few: 'jamoadagi mutaxas\u00ADsislar',
        many: 'jamoadagi mutaxas\u00ADsislar',
      },
    },
    clientsLabel: 'Bizga ishonishadi',
    clientsPause: "Mijozlar lentasini to'xtatish",
    scrollHint: 'Pastga',
  },
};
