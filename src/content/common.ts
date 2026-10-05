import type { Localized } from '@/i18n';

export interface NavItem {
  id: string;
  label: string;
}

export interface CommonCopy {
  meta: {
    title: string;
    description: string;
  };
  skipLink: string;
  nav: NavItem[];
  /** Accessible name of the primary navigation landmark. */
  navLabel: string;
  navCta: string;
  menu: {
    open: string;
    close: string;
    label: string;
  };
  language: string;
  /** Mobile action dock (MobileDock.astro, < 1024px). */
  dock: {
    /** Accessible name of the dock region. */
    label: string;
    /** Short visible label of the call button (hidden on the narrowest phones). */
    call: string;
    /** Full accessible name of the call button; the phone number is appended. */
    callLabel: string;
    /** Primary action — scrolls to the contact form. */
    cta: string;
  };
  /** Screen-reader hint appended to links that open in a new tab. */
  newTab: string;
  footer: {
    tagline: string;
    /** Eyebrow above the large e-mail link in the footer top band. */
    writeUs: string;
    /** Lead-in before the phone number in the footer top band. */
    orCall: string;
    navTitle: string;
    servicesTitle: string;
    contactTitle: string;
    rights: string;
    backToTop: string;
    openMap: string;
  };
  notFound: {
    title: string;
    text: string;
    cta: string;
  };
}

export const common: Localized<CommonCopy> = {
  ru: {
    meta: {
      title: 'ITBoost — разработка сайтов, приложений и AI-автоматизация в Ташкенте',
      description:
        'ITBoost — IT-студия из Ташкента. Создаём сайты, интернет-магазины, платформы и CRM, мобильные приложения для iOS и Android, Telegram-боты и AI-автоматизацию для бизнеса.',
    },
    skipLink: 'Перейти к содержанию',
    nav: [
      { id: 'services', label: 'Услуги' },
      { id: 'ai', label: 'AI' },
      { id: 'work', label: 'Проекты' },
      { id: 'process', label: 'Процесс' },
      { id: 'team', label: 'Команда' },
      { id: 'contact', label: 'Контакты' },
    ],
    navLabel: 'Основная навигация',
    navCta: 'Обсудить проект',
    menu: {
      open: 'Открыть меню',
      close: 'Закрыть меню',
      label: 'Меню',
    },
    language: 'Язык',
    dock: {
      label: 'Быстрые действия',
      call: 'Позвонить',
      callLabel: 'Позвонить',
      cta: 'Обсудить проект',
    },
    newTab: '(откроется в новой вкладке)',
    footer: {
      tagline: 'Проектируем и разрабатываем цифровые системы для бизнеса — от сайта до AI-агента.',
      writeUs: 'Есть задача? Напишите нам',
      orCall: 'или позвоните',
      navTitle: 'Навигация',
      servicesTitle: 'Услуги',
      contactTitle: 'Контакты',
      rights: 'Все права защищены.',
      backToTop: 'Наверх',
      openMap: 'Открыть на карте',
    },
    notFound: {
      title: 'Страница не найдена',
      text: 'Возможно, ссылка устарела. Вернитесь на главную — там всё самое важное.',
      cta: 'На главную',
    },
  },
  uz: {
    meta: {
      title: 'ITBoost — Toshkentda sayt, mobil ilova va AI-avtomatlashtirish',
      description:
        "ITBoost — Toshkentdagi IT-studiya. Biznes uchun saytlar, internet-do'konlar, platforma va CRM, iOS va Android ilovalar, Telegram-botlar va AI-avtomatlashtirish yaratamiz.",
    },
    skipLink: "Asosiy qismga o'tish",
    nav: [
      { id: 'services', label: 'Xizmatlar' },
      { id: 'ai', label: 'AI' },
      { id: 'work', label: 'Loyihalar' },
      { id: 'process', label: 'Jarayon' },
      { id: 'team', label: 'Jamoa' },
      { id: 'contact', label: 'Aloqa' },
    ],
    navLabel: 'Asosiy navigatsiya',
    navCta: 'Loyihani muhokama qilish',
    menu: {
      open: 'Menyuni ochish',
      close: 'Menyuni yopish',
      label: 'Menyu',
    },
    language: 'Til',
    dock: {
      label: 'Tezkor amallar',
      call: "Qo'ng'iroq",
      callLabel: "Qo'ng'iroq qilish",
      cta: 'Loyihani muhokama qilish',
    },
    newTab: '(yangi oynada ochiladi)',
    footer: {
      tagline: 'Biznes uchun raqamli tizimlarni loyihalaymiz va ishlab chiqamiz — saytdan AI-agentgacha.',
      writeUs: 'Vazifa bormi? Bizga yozing',
      orCall: "yoki qo'ng'iroq qiling",
      navTitle: 'Navigatsiya',
      servicesTitle: 'Xizmatlar',
      contactTitle: 'Aloqa',
      rights: 'Barcha huquqlar himoyalangan.',
      backToTop: 'Yuqoriga',
      openMap: 'Xaritada ochish',
    },
    notFound: {
      title: 'Sahifa topilmadi',
      text: "Havola eskirgan bo'lishi mumkin. Bosh sahifaga qayting — eng muhimi o'sha yerda.",
      cta: 'Bosh sahifa',
    },
  },
};
