import type { Localized } from '@/i18n';

/** Business facts. Single source of truth for contacts — do not hardcode elsewhere. */
export const site = {
  name: 'ITBoost',
  url: 'https://itboost.uz',
  email: 'itboost.uz@gmail.com',
  phone: {
    display: '+998 95 123-44-00',
    href: 'tel:+998951234400',
  },
  address: {
    ru: 'Ташкент, Узбекистан',
    uz: "Toshkent, O'zbekiston",
  } satisfies Localized<string>,
  mapUrl: 'https://maps.google.com/?q=Tashkent,+Uzbekistan',
  /**
   * Social profiles. Leave empty to hide a link.
   * TODO(itboost): add real Instagram / Telegram channel URLs (the old site linked to "#").
   */
  social: {
    instagram: '',
    telegram: '',
  },
} as const;
