import type { Localized } from '@/i18n';

export type ServiceId = 'web' | 'ecommerce' | 'platforms' | 'mobile' | 'bots' | 'ai' | 'design' | 'devops';

export interface ServiceCopy {
  title: string;
  /** One-line business value — the headline of the service. */
  value: string;
  /** What exactly we do, revealed on hover / expand. */
  details: string;
  tags: string[];
}

export interface Service {
  id: ServiceId;
  /**
   * Value sent to Telegram in the lead form. Kept identical to the legacy form values
   * so existing lead parsing / habits do not change.
   */
  leadValue: string;
  copy: Localized<ServiceCopy>;
}

export interface ServicesSectionCopy {
  eyebrow: string;
  title: string;
  lead: string;
  cta: string;
}

export const servicesSection: Localized<ServicesSectionCopy> = {
  ru: {
    eyebrow: 'Услуги',
    title: 'Что мы создаём',
    lead: 'Восемь направлений — одна команда. Берём задачу целиком: от аналитики и дизайна до запуска и поддержки.',
    cta: 'Обсудить задачу',
  },
  uz: {
    eyebrow: 'Xizmatlar',
    title: 'Biz nimalar yaratamiz',
    lead: "Sakkiz yo'nalish — bitta jamoa. Vazifani to'liq olamiz: tahlil va dizayndan ishga tushirish va qo'llab-quvvatlashgacha.",
    cta: 'Vazifani muhokama qilish',
  },
};

export const services: Service[] = [
  {
    id: 'web',
    leadValue: 'Web Development',
    copy: {
      ru: {
        title: 'Веб-разработка',
        value: 'Сайты, которые продают: быстрые, адаптивные и понятные клиенту с первого экрана.',
        details:
          'Корпоративные и многостраничные сайты, лендинги для рекламы, SEO-основа и передача заявок прямо в Telegram или CRM.',
        tags: ['Корпоративные сайты', 'Лендинги', 'SEO', 'Адаптивность'],
      },
      uz: {
        title: 'Veb-ishlab chiqish',
        value: 'Sotadigan saytlar: tezkor, moslashuvchan va birinchi ekrandanoq mijozga tushunarli.',
        details:
          "Korporativ va ko'p sahifali saytlar, reklama uchun lendinglar, SEO-asos va arizalarni to'g'ridan-to'g'ri Telegram yoki CRM'ga yuborish.",
        tags: ['Korporativ saytlar', 'Lendinglar', 'SEO', 'Moslashuvchanlik'],
      },
    },
  },
  {
    id: 'ecommerce',
    leadValue: 'Internet Shop',
    copy: {
      ru: {
        title: 'Интернет-магазины',
        value: 'Онлайн-продажи без ограничений по времени и географии.',
        details:
          'Каталог, фильтры, корзина, онлайн-оплата и управление заказами — удобная и безопасная платформа для продажи ваших товаров и услуг.',
        tags: ['Каталог', 'Онлайн-оплата', 'Управление заказами'],
      },
      uz: {
        title: "Internet-do'konlar",
        value: 'Vaqt va geografiya cheklovlarisiz onlayn savdo.',
        details:
          "Katalog, filtrlar, savat, onlayn to'lov va buyurtmalarni boshqarish — mahsulot va xizmatlaringizni sotish uchun qulay va xavfsiz platforma.",
        tags: ['Katalog', "Onlayn to'lov", 'Buyurtmalarni boshqarish'],
      },
    },
  },
  {
    id: 'platforms',
    leadValue: 'Platform',
    copy: {
      ru: {
        title: 'Платформы, CRM и SaaS',
        value: 'Системы, которые автоматизируют процессы и снижают расходы.',
        details:
          'От CRM до сложных SaaS-систем: личные кабинеты, роли и доступы, интеграции и аналитика — платформа растёт вместе с бизнесом.',
        tags: ['CRM', 'SaaS', 'Личные кабинеты', 'Интеграции'],
      },
      uz: {
        title: 'Platformalar, CRM va SaaS',
        value: 'Jarayonlarni avtomatlashtiradigan va xarajatlarni kamaytiradigan tizimlar.',
        details:
          "CRM'dan murakkab SaaS-tizimlargacha: shaxsiy kabinetlar, rollar va ruxsatlar, integratsiyalar va analitika — platforma biznes bilan birga o'sadi.",
        tags: ['CRM', 'SaaS', 'Shaxsiy kabinetlar', 'Integratsiyalar'],
      },
    },
  },
  {
    id: 'mobile',
    leadValue: 'iOS-Android',
    copy: {
      ru: {
        title: 'Мобильные приложения',
        value: 'Ваш бизнес — в смартфоне клиента, на iOS и Android.',
        details:
          'Нативные приложения с интуитивным интерфейсом: от прототипа до публикации в App Store и Google Play.',
        tags: ['iOS', 'Android', 'App Store', 'Google Play'],
      },
      uz: {
        title: 'Mobil ilovalar',
        value: "Biznesingiz — mijozning smartfonida, iOS va Android'da.",
        details:
          "Intuitiv interfeysli native ilovalar: prototipdan App Store va Google Play'da nashr qilishgacha.",
        tags: ['iOS', 'Android', 'App Store', 'Google Play'],
      },
    },
  },
  {
    id: 'bots',
    leadValue: 'Telegram Bot',
    copy: {
      ru: {
        title: 'Telegram-боты',
        value: 'Автоматизация общения с клиентами там, где они уже есть.',
        details:
          'Боты для заказов, записи, поддержки и рассылок: принимают заявки, отвечают на вопросы и разгружают команду.',
        tags: ['Заказы', 'Запись', 'Поддержка', 'Рассылки'],
      },
      uz: {
        title: 'Telegram-botlar',
        value: "Mijozlar bilan muloqotni ular allaqachon bor joyda avtomatlashtirish.",
        details:
          "Buyurtma, yozilish, qo'llab-quvvatlash va xabar tarqatish uchun botlar: arizalarni qabul qiladi, savollarga javob beradi va jamoani yengillashtiradi.",
        tags: ['Buyurtmalar', 'Yozilish', "Qo'llab-quvvatlash", 'Xabarnomalar'],
      },
    },
  },
  {
    id: 'ai',
    leadValue: 'AI Automation',
    copy: {
      ru: {
        title: 'AI-решения и автоматизация',
        value: 'AI-агенты, которые берут на себя рутину и работают круглосуточно.',
        details:
          'Чат-боты с базой знаний, обработка заявок и документов, интеграция языковых моделей в ваши процессы и системы.',
        tags: ['AI-агенты', 'LLM', 'Базы знаний', 'Автоматизация'],
      },
      uz: {
        title: 'AI-yechimlar va avtomatlashtirish',
        value: "Bir xil ishlarni o'z zimmasiga oladigan va kecha-kunduz ishlaydigan AI-agentlar.",
        details:
          "Bilimlar bazasiga ega chat-botlar, ariza va hujjatlarni qayta ishlash, til modellarini jarayon va tizimlaringizga integratsiya qilish.",
        tags: ['AI-agentlar', 'LLM', 'Bilimlar bazasi', 'Avtomatlashtirish'],
      },
    },
  },
  {
    id: 'design',
    leadValue: 'UI/UX Design',
    copy: {
      ru: {
        title: 'UI/UX-дизайн',
        value: 'Интерфейсы, в которых клиенту легко сделать следующий шаг.',
        details:
          'Исследование, прототипы и дизайн-системы для сайтов и приложений — до того, как написана первая строка кода.',
        tags: ['Прототипы', 'Дизайн-системы', 'UX-исследования'],
      },
      uz: {
        title: 'UI/UX-dizayn',
        value: 'Mijoz keyingi qadamni oson qiladigan interfeyslar.',
        details:
          'Saytlar va ilovalar uchun tadqiqot, prototiplar va dizayn-tizimlar — birinchi kod satri yozilishidan oldin.',
        tags: ['Prototiplar', 'Dizayn-tizimlar', 'UX-tadqiqotlar'],
      },
    },
  },
  {
    id: 'devops',
    leadValue: 'DevOps',
    copy: {
      ru: {
        title: 'DevOps и инфраструктура',
        value: 'Стабильная работа продукта и быстрые релизы без простоев.',
        details:
          'CI/CD, мониторинг, резервное копирование и масштабирование: сопровождаем проект после запуска и быстро реагируем на изменения.',
        tags: ['CI/CD', 'Мониторинг', 'Облако', 'Бэкапы'],
      },
      uz: {
        title: 'DevOps va infratuzilma',
        value: "Mahsulotning barqaror ishlashi va to'xtovsiz tezkor relizlar.",
        details:
          "CI/CD, monitoring, zaxira nusxalash va masshtablash: loyihani ishga tushirilgandan keyin ham kuzatib boramiz va o'zgarishlarga tez javob beramiz.",
        tags: ['CI/CD', 'Monitoring', 'Bulut', 'Zaxira nusxalar'],
      },
    },
  },
];
