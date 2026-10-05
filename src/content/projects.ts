import type { ImageMetadata } from 'astro';
import type { Localized } from '@/i18n';

import akfa from '@/assets/portfolio/akfa.png';
import yourservice from '@/assets/portfolio/yourservice.png';
import uskunalar from '@/assets/portfolio/uskunalar.png';
import tsu from '@/assets/portfolio/tsu.png';
import nayuta from '@/assets/portfolio/nayuta.png';
import brightMedia from '@/assets/portfolio/marketing.jpg';
import sunpina from '@/assets/portfolio/sunpina.png';
import nobel from '@/assets/portfolio/nobel.jpg';
import logist from '@/assets/portfolio/logic.png';
import taminot24 from '@/assets/portfolio/taminot24.png';
import kingsman from '@/assets/portfolio/kingsman.png';
import ibrat from '@/assets/portfolio/ibrat.jpg';
import jalousie from '@/assets/portfolio/jalousie.png';
import tabletka from '@/assets/portfolio/tabletka.png';
import onestaff from '@/assets/portfolio/onestaff.png';
import globalEducation from '@/assets/portfolio/globaleducation.png';
import deltavision from '@/assets/portfolio/deltavision.png';

export type ProjectCategory = 'web' | 'shop' | 'platform' | 'mobile' | 'bot';

/** "desktop" screenshots are landscape site captures; "phone" are portrait app/bot captures. */
export type ProjectDevice = 'desktop' | 'phone';

export interface ProjectCopy {
  /** Format of the deliverable, e.g. "Корпоративный сайт". */
  format: string;
  /** Industry — only where it is evident from the client/project itself. */
  industry?: string;
  summary: string;
  /**
   * Optional case-study fields. Rendered only when filled.
   * TODO(itboost): fill problem / solution / result for featured projects with REAL data.
   * Do not invent numbers.
   */
  problem?: string;
  solution?: string;
  result?: string;
}

export interface Project {
  id: string;
  name: string;
  url: string;
  /** Human-readable link label (domain or store). */
  linkLabel: string;
  image: ImageMetadata;
  device: ProjectDevice;
  category: ProjectCategory;
  /** Platform labels shown as badges. Only factual ones (Web / iOS / Telegram). */
  platforms: string[];
  /** Featured projects get a large case-study layout. Order matters. */
  featured?: boolean;
  copy: Localized<ProjectCopy>;
}

export interface WorkSectionCopy {
  eyebrow: string;
  title: string;
  lead: string;
  allTitle: string;
  filters: Record<'all' | ProjectCategory, string>;
  labels: {
    industry: string;
    format: string;
    platform: string;
    problem: string;
    solution: string;
    result: string;
    open: string;
    zoom: string;
    close: string;
    view: string;
    caseNo: string;
    /** Accessible name of the filter group. */
    filterBy: string;
    /** Screen-reader announcement after filtering: "<shown>: N". */
    shown: string;
    /** Appended (visually hidden) to links that open in a new tab. */
    newTab: string;
    /** Screenshot alt text template — `{name}` is replaced with the project name. */
    shot: string;
    prev: string;
    next: string;
    /** Phone-width "show the rest" button under the project grid: "<showMore> (N)". */
    showMore: string;
  };
  cta: {
    title: string;
    button: string;
  };
}

export const workSection: Localized<WorkSectionCopy> = {
  ru: {
    eyebrow: 'Проекты',
    title: 'Избранные работы',
    lead: 'Сайты, платформы, приложения и боты, которые мы запустили для компаний в Узбекистане и за рубежом.',
    allTitle: 'Все проекты',
    filters: {
      all: 'Все',
      web: 'Сайты',
      shop: 'Интернет-магазины',
      platform: 'Платформы',
      mobile: 'Приложения',
      bot: 'Telegram-боты',
    },
    labels: {
      industry: 'Отрасль',
      format: 'Формат',
      platform: 'Платформа',
      problem: 'Задача',
      solution: 'Решение',
      result: 'Результат',
      open: 'Открыть проект',
      zoom: 'Увеличить скриншот',
      close: 'Закрыть',
      view: 'Смотреть',
      caseNo: 'Кейс',
      filterBy: 'Фильтр проектов по типу',
      shown: 'Показано проектов',
      newTab: 'откроется в новой вкладке',
      shot: 'Скриншот проекта {name}',
      prev: 'Предыдущий проект',
      next: 'Следующий проект',
      showMore: 'Показать ещё',
    },
    cta: {
      title: 'Нужен похожий проект?',
      button: 'Получить оценку проекта',
    },
  },
  uz: {
    eyebrow: 'Loyihalar',
    title: 'Tanlangan ishlar',
    lead: "O'zbekiston va xorijdagi kompaniyalar uchun ishga tushirgan saytlar, platformalar, ilovalar va botlar.",
    allTitle: 'Barcha loyihalar',
    filters: {
      all: 'Hammasi',
      web: 'Saytlar',
      shop: "Internet-do'konlar",
      platform: 'Platformalar',
      mobile: 'Ilovalar',
      bot: 'Telegram-botlar',
    },
    labels: {
      industry: 'Soha',
      format: 'Format',
      platform: 'Platforma',
      problem: 'Vazifa',
      solution: 'Yechim',
      result: 'Natija',
      open: 'Loyihani ochish',
      zoom: 'Skrinshotni kattalashtirish',
      close: 'Yopish',
      view: "Ko'rish",
      caseNo: 'Keys',
      filterBy: "Loyihalarni turi bo'yicha saralash",
      shown: "Ko'rsatilgan loyihalar",
      newTab: 'yangi oynada ochiladi',
      shot: '{name} loyihasi skrinshoti',
      prev: 'Oldingi loyiha',
      next: 'Keyingi loyiha',
      showMore: "Yana ko'rsatish",
    },
    cta: {
      title: "Shunga o'xshash loyiha kerakmi?",
      button: 'Loyiha bahosini olish',
    },
  },
};

const MULTIPAGE: Localized<string> = { ru: 'Многостраничный сайт', uz: "Ko'p sahifali sayt" };
const LANDING: Localized<string> = { ru: 'Лендинг', uz: 'Lending' };
const BOT: Localized<string> = { ru: 'Telegram-бот', uz: 'Telegram-bot' };

export const projects: Project[] = [
  {
    id: 'akfa',
    name: 'Akfa Group',
    url: 'https://akfagroup.com/',
    linkLabel: 'akfagroup.com',
    image: akfa,
    device: 'desktop',
    category: 'web',
    platforms: ['Web'],
    featured: true,
    copy: {
      ru: {
        format: 'Корпоративный многостраничный сайт',
        industry: 'Производство',
        summary:
          'Корпоративный сайт группы компаний: многостраничная структура, представление направлений бизнеса и адаптивный интерфейс для всех устройств.',
      },
      uz: {
        format: "Korporativ ko'p sahifali sayt",
        industry: 'Ishlab chiqarish',
        summary:
          "Kompaniyalar guruhining korporativ sayti: ko'p sahifali tuzilma, biznes yo'nalishlari taqdimoti va barcha qurilmalar uchun moslashuvchan interfeys.",
      },
    },
  },
  {
    id: 'yourservice',
    name: 'Yourservice',
    url: 'https://yourservice.ae/',
    linkLabel: 'yourservice.ae',
    image: yourservice,
    device: 'desktop',
    category: 'platform',
    platforms: ['Web'],
    featured: true,
    copy: {
      ru: {
        format: 'Платформа для поиска мастеров',
        industry: 'Сервисы · ОАЭ',
        summary:
          'Платформа, которая соединяет клиентов с мастерами: каталог услуг, поиск исполнителя и удобный путь от запроса до заказа.',
      },
      uz: {
        format: 'Ustalarni topish platformasi',
        industry: "Xizmatlar · BAA",
        summary:
          "Mijozlarni ustalar bilan bog'laydigan platforma: xizmatlar katalogi, ijrochini qidirish va so'rovdan buyurtmagacha qulay yo'l.",
      },
    },
  },
  {
    id: 'uskunalar',
    name: 'Uskunalar.uz',
    url: 'https://uskunalar.uz',
    linkLabel: 'uskunalar.uz',
    image: uskunalar,
    device: 'desktop',
    category: 'shop',
    platforms: ['Web'],
    featured: true,
    copy: {
      ru: {
        format: 'Интернет-магазин оборудования',
        industry: 'E-commerce',
        summary:
          'Интернет-магазин оборудования с каталогом товаров и карточками продуктов — продажи онлайн без ограничений по времени.',
      },
      uz: {
        format: "Uskunalar internet-do'koni",
        industry: 'E-commerce',
        summary:
          "Mahsulotlar katalogi va kartochkalariga ega uskunalar internet-do'koni — vaqt cheklovisiz onlayn savdo.",
      },
    },
  },
  {
    id: 'tsu',
    name: 'TSU',
    url: 'https://truckservice-usap.vercel.app/',
    linkLabel: 'truckservice-usap.vercel.app',
    image: tsu,
    device: 'desktop',
    category: 'platform',
    platforms: ['Web'],
    copy: {
      ru: { format: 'Платформа для логистики', industry: 'Логистика', summary: 'Веб-платформа для логистической компании.' },
      uz: { format: 'Logistika platformasi', industry: 'Logistika', summary: 'Logistika kompaniyasi uchun veb-platforma.' },
    },
  },
  {
    id: 'nayuta',
    name: 'Nayuta',
    url: 'https://nayuta.uz',
    linkLabel: 'nayuta.uz',
    image: nayuta,
    device: 'desktop',
    category: 'web',
    platforms: ['Web'],
    copy: {
      ru: { format: MULTIPAGE.ru, summary: 'Многостраничный сайт компании с адаптивной вёрсткой.' },
      uz: { format: MULTIPAGE.uz, summary: "Moslashuvchan dizaynli ko'p sahifali kompaniya sayti." },
    },
  },
  {
    id: 'bright-media',
    name: 'Bright Media',
    url: 'https://fathullalatipov.github.io/br/',
    linkLabel: 'Bright Media',
    image: brightMedia,
    device: 'desktop',
    category: 'web',
    platforms: ['Web'],
    copy: {
      ru: { format: MULTIPAGE.ru, industry: 'Маркетинг', summary: 'Сайт маркетингового агентства.' },
      uz: { format: MULTIPAGE.uz, industry: 'Marketing', summary: 'Marketing agentligi sayti.' },
    },
  },
  {
    id: 'sunpina',
    name: 'Sunpina',
    url: 'https://sunpinamebel.uz/',
    linkLabel: 'sunpinamebel.uz',
    image: sunpina,
    device: 'desktop',
    category: 'web',
    platforms: ['Web'],
    copy: {
      ru: { format: LANDING.ru, industry: 'Мебель', summary: 'Лендинг мебельной компании.' },
      uz: { format: LANDING.uz, industry: 'Mebel', summary: 'Mebel kompaniyasi uchun lending.' },
    },
  },
  {
    id: 'nobel',
    name: 'Nobel Trade',
    url: 'https://nobeltrade.uz/',
    linkLabel: 'nobeltrade.uz',
    image: nobel,
    device: 'desktop',
    category: 'web',
    platforms: ['Web'],
    copy: {
      ru: { format: MULTIPAGE.ru, industry: 'Торговля', summary: 'Многостраничный сайт торговой компании.' },
      uz: { format: MULTIPAGE.uz, industry: 'Savdo', summary: "Savdo kompaniyasining ko'p sahifali sayti." },
    },
  },
  {
    id: 'logist-academy',
    name: 'Logist Academy',
    url: 'https://www.logistacademy.uz/',
    linkLabel: 'logistacademy.uz',
    image: logist,
    device: 'desktop',
    category: 'web',
    platforms: ['Web'],
    copy: {
      ru: { format: LANDING.ru, industry: 'Образование', summary: 'Лендинг образовательной академии.' },
      uz: { format: LANDING.uz, industry: "Ta'lim", summary: "Ta'lim akademiyasi uchun lending." },
    },
  },
  {
    id: 'taminot24',
    name: 'Taminot24',
    url: 'https://taminot24.uz',
    linkLabel: 'taminot24.uz',
    image: taminot24,
    device: 'desktop',
    category: 'web',
    platforms: ['Web'],
    copy: {
      ru: { format: MULTIPAGE.ru, summary: 'Многостраничный сайт компании.' },
      uz: { format: MULTIPAGE.uz, summary: "Kompaniyaning ko'p sahifali sayti." },
    },
  },
  {
    id: 'jalousie-profi',
    name: 'Jalousie Profi',
    url: 'https://www.jalousieprofi.uz/',
    linkLabel: 'jalousieprofi.uz',
    image: jalousie,
    device: 'desktop',
    category: 'web',
    platforms: ['Web'],
    copy: {
      ru: { format: LANDING.ru, industry: 'Интерьер', summary: 'Лендинг компании по производству жалюзи.' },
      uz: { format: LANDING.uz, industry: 'Interyer', summary: 'Jalyuzi ishlab chiqaruvchi kompaniya uchun lending.' },
    },
  },
  {
    id: 'onestaff',
    name: 'One Staff',
    url: 'https://www.onestaff.uz/?lang=ru',
    linkLabel: 'onestaff.uz',
    image: onestaff,
    device: 'desktop',
    category: 'web',
    platforms: ['Web'],
    copy: {
      ru: { format: LANDING.ru, industry: 'HR и персонал', summary: 'Лендинг кадровой компании.' },
      uz: { format: LANDING.uz, industry: 'HR va xodimlar', summary: 'Kadrlar kompaniyasi uchun lending.' },
    },
  },
  {
    id: 'global-education',
    name: 'Global Education',
    url: 'https://www.globaleducation.uz/',
    linkLabel: 'globaleducation.uz',
    image: globalEducation,
    device: 'desktop',
    category: 'web',
    platforms: ['Web'],
    copy: {
      ru: { format: MULTIPAGE.ru, industry: 'Образование', summary: 'Многостраничный сайт образовательной компании.' },
      uz: { format: MULTIPAGE.uz, industry: "Ta'lim", summary: "Ta'lim kompaniyasining ko'p sahifali sayti." },
    },
  },
  {
    id: 'deltavision',
    name: 'Deltavision',
    url: 'https://www.deltavision.uz/',
    linkLabel: 'deltavision.uz',
    image: deltavision,
    device: 'desktop',
    category: 'web',
    platforms: ['Web'],
    copy: {
      ru: { format: 'Рекламный лендинг', summary: 'Одностраничный рекламный сайт.' },
      uz: { format: 'Reklama lendingi', summary: 'Bir sahifali reklama sayti.' },
    },
  },
  {
    id: 'ibrat-academy',
    name: 'Ibrat Academy',
    url: 'https://apps.apple.com/uz/app/ibrat-academy/id6447472950',
    linkLabel: 'App Store',
    image: ibrat,
    device: 'phone',
    category: 'mobile',
    platforms: ['iOS'],
    copy: {
      ru: { format: 'Мобильное приложение', industry: 'Образование', summary: 'Образовательное мобильное приложение в App Store.' },
      uz: { format: 'Mobil ilova', industry: "Ta'lim", summary: "App Store'dagi ta'limiy mobil ilova." },
    },
  },
  {
    id: 'kingsman-bot',
    name: 'Kingsman Bot',
    url: 'https://t.me/Kingsmanuz_bot',
    linkLabel: '@Kingsmanuz_bot',
    image: kingsman,
    device: 'phone',
    category: 'bot',
    platforms: ['Telegram'],
    copy: {
      ru: { format: BOT.ru, summary: 'Telegram-бот Kingsman.' },
      uz: { format: BOT.uz, summary: 'Kingsman Telegram-boti.' },
    },
  },
  {
    id: 'tabletka',
    name: 'Tabletka',
    url: 'https://t.me/tabletka_uzbot',
    linkLabel: '@tabletka_uzbot',
    image: tabletka,
    device: 'phone',
    category: 'bot',
    platforms: ['Telegram'],
    copy: {
      ru: { format: BOT.ru, summary: 'Telegram-бот Tabletka.' },
      uz: { format: BOT.uz, summary: 'Tabletka Telegram-boti.' },
    },
  },
];

export const featuredProjects = projects.filter((p) => p.featured === true);

/** Distinct clients shown in the trust marquee (real portfolio names only). */
export const clientNames: string[] = projects.map((p) => p.name);
