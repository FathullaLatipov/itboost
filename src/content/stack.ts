import type { Localized } from '@/i18n';

/**
 * Technology ecosystem.
 * Items are limited to what is evidenced by the site's services and team roles.
 * TODO(itboost): replace generic items with the team's actual stack
 * (frameworks, languages, databases, cloud providers). Do not add tools you do not use.
 */

export type LayerId = 'frontend' | 'backend' | 'mobile' | 'ai' | 'infra' | 'integrations' | 'design';

export interface StackLayerCopy {
  name: string;
  caption: string;
  items: string[];
}

export interface StackLayer {
  id: LayerId;
  copy: Localized<StackLayerCopy>;
}

export interface StackSectionCopy {
  eyebrow: string;
  title: string;
  lead: string;
  core: string;
  /** Phone carousel of the layers: region name + prev / next button labels. */
  carousel: { label: string; prev: string; next: string; roledescription: string };
}

export const stackSection: Localized<StackSectionCopy> = {
  ru: {
    eyebrow: 'Технологии',
    title: 'Экосистема, в которой мы работаем',
    lead: 'Подбираем технологии под задачу, а не наоборот. За каждым слоем стоят конкретные специалисты команды.',
    core: 'ITBoost',
    carousel: {
      label: 'Технологические слои',
      prev: 'Предыдущий слой',
      next: 'Следующий слой',
      roledescription: 'карусель',
    },
  },
  uz: {
    eyebrow: 'Texnologiyalar',
    title: 'Biz ishlaydigan ekotizim',
    lead: 'Texnologiyalarni vazifaga qarab tanlaymiz, aksincha emas. Har bir qatlam ortida jamoaning aniq mutaxassislari turadi.',
    core: 'ITBoost',
    carousel: {
      label: 'Texnologiya qatlamlari',
      prev: 'Oldingi qatlam',
      next: 'Keyingi qatlam',
      roledescription: 'karusel',
    },
  },
};

export const stackLayers: StackLayer[] = [
  {
    id: 'frontend',
    copy: {
      ru: { name: 'Frontend', caption: 'Интерфейсы сайтов и веб-приложений', items: ['HTML · CSS', 'JavaScript', 'Адаптивная вёрстка', 'SEO'] },
      uz: { name: 'Frontend', caption: 'Sayt va veb-ilovalar interfeyslari', items: ['HTML · CSS', 'JavaScript', 'Moslashuvchan vyorstka', 'SEO'] },
    },
  },
  {
    id: 'backend',
    copy: {
      ru: { name: 'Backend', caption: 'Логика, данные и API', items: ['REST API', 'Базы данных', 'Личные кабинеты', 'Платежи'] },
      uz: { name: 'Backend', caption: "Mantiq, ma'lumotlar va API", items: ['REST API', "Ma'lumotlar bazalari", 'Shaxsiy kabinetlar', "To'lovlar"] },
    },
  },
  {
    id: 'mobile',
    copy: {
      ru: { name: 'Mobile', caption: 'Нативные приложения', items: ['iOS', 'Android', 'App Store', 'Google Play'] },
      uz: { name: 'Mobile', caption: 'Native ilovalar', items: ['iOS', 'Android', 'App Store', 'Google Play'] },
    },
  },
  {
    id: 'ai',
    copy: {
      ru: { name: 'AI', caption: 'Интеллектуальная автоматизация', items: ['LLM-интеграции', 'AI-агенты', 'Базы знаний', 'Обработка документов'] },
      uz: { name: 'AI', caption: 'Aqlli avtomatlashtirish', items: ['LLM-integratsiyalar', 'AI-agentlar', 'Bilimlar bazasi', 'Hujjatlarni qayta ishlash'] },
    },
  },
  {
    id: 'infra',
    copy: {
      ru: { name: 'Infrastructure', caption: 'Стабильность и релизы', items: ['DevOps', 'CI/CD', 'Мониторинг', 'Облачные серверы'] },
      uz: { name: 'Infrastructure', caption: 'Barqarorlik va relizlar', items: ['DevOps', 'CI/CD', 'Monitoring', 'Bulut serverlari'] },
    },
  },
  {
    id: 'integrations',
    copy: {
      ru: { name: 'Integrations', caption: 'Связь между системами', items: ['Telegram Bot API', 'CRM', 'Платёжные системы', 'Внешние API'] },
      uz: { name: 'Integrations', caption: "Tizimlar o'rtasidagi aloqa", items: ['Telegram Bot API', 'CRM', "To'lov tizimlari", 'Tashqi API'] },
    },
  },
  {
    id: 'design',
    copy: {
      ru: { name: 'Design', caption: 'Опыт пользователя', items: ['UX-исследования', 'Прототипы', 'UI-дизайн', 'Дизайн-системы'] },
      uz: { name: 'Design', caption: 'Foydalanuvchi tajribasi', items: ['UX-tadqiqotlar', 'Prototiplar', 'UI-dizayn', 'Dizayn-tizimlar'] },
    },
  },
];
