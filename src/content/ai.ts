import type { Localized } from '@/i18n';

export interface AiCapability {
  title: string;
  text: string;
}

export interface AiCopy {
  eyebrow: string;
  title: string;
  lead: string;
  flow: {
    inputsLabel: string;
    inputs: string[];
    agentLabel: string;
    agentCaption: string;
    actionsLabel: string;
    actions: string[];
    result: string;
  };
  capabilities: AiCapability[];
  /** Phone carousel of the capabilities: region name + prev / next button labels. */
  capabilitiesCarousel: { label: string; prev: string; next: string; roledescription: string };
  cta: string;
}

export const ai: Localized<AiCopy> = {
  ru: {
    eyebrow: 'AI и автоматизация',
    title: 'Не просто сайты. Интеллектуальные системы.',
    lead: 'Подключаем AI-агентов к вашим каналам и данным: они читают заявки, понимают запрос, действуют в ваших системах и возвращают готовый результат.',
    flow: {
      inputsLabel: 'Входящие',
      inputs: ['Заявка с сайта', 'Сообщение в Telegram', 'Документ или файл'],
      agentLabel: 'AI-агент',
      agentCaption: 'понимает · классифицирует · решает',
      actionsLabel: 'Действия',
      actions: ['CRM: создаёт сделку', 'Telegram: отвечает клиенту', 'Отчёт: обновляет аналитику'],
      result: 'Результат — без ручной рутины',
    },
    capabilities: [
      {
        title: 'AI-агенты для заявок',
        text: 'Квалифицируют лиды, отвечают на типовые вопросы и передают менеджеру только готовых клиентов.',
      },
      {
        title: 'Чат-боты с базой знаний',
        text: 'Отвечают на основе ваших документов, прайсов и регламентов — в Telegram и на сайте.',
      },
      {
        title: 'Обработка документов',
        text: 'Извлекают данные из счетов, договоров и заявок и переносят их в ваши системы.',
      },
      {
        title: 'Аналитика и отчёты',
        text: 'Собирают данные из разных источников в понятные дашборды и регулярные отчёты.',
      },
    ],
    capabilitiesCarousel: {
      label: 'Возможности AI',
      prev: 'Предыдущая возможность',
      next: 'Следующая возможность',
      roledescription: 'карусель',
    },
    cta: 'Запустить автоматизацию',
  },
  uz: {
    eyebrow: 'AI va avtomatlashtirish',
    title: 'Shunchaki saytlar emas. Aqlli tizimlar.',
    lead: "AI-agentlarni kanallaringiz va ma'lumotlaringizga ulaymiz: ular arizalarni o'qiydi, so'rovni tushunadi, tizimlaringizda harakat qiladi va tayyor natijani qaytaradi.",
    flow: {
      inputsLabel: 'Kiruvchi',
      inputs: ['Saytdan ariza', 'Telegramdagi xabar', 'Hujjat yoki fayl'],
      agentLabel: 'AI-agent',
      agentCaption: 'tushunadi · saralaydi · hal qiladi',
      actionsLabel: 'Harakatlar',
      actions: ['CRM: bitim yaratadi', 'Telegram: mijozga javob beradi', 'Hisobot: analitikani yangilaydi'],
      result: "Natija — qo'l mehnatisiz",
    },
    capabilities: [
      {
        title: 'Arizalar uchun AI-agentlar',
        text: 'Lidlarni saralaydi, odatiy savollarga javob beradi va menejerga faqat tayyor mijozlarni uzatadi.',
      },
      {
        title: 'Bilimlar bazasiga ega chat-botlar',
        text: 'Hujjatlaringiz, narxlar va reglamentlar asosida javob beradi — Telegramda va saytda.',
      },
      {
        title: 'Hujjatlarni qayta ishlash',
        text: "Hisob-faktura, shartnoma va arizalardan ma'lumotlarni ajratib, tizimlaringizga o'tkazadi.",
      },
      {
        title: 'Analitika va hisobotlar',
        text: "Turli manbalardan ma'lumotlarni tushunarli dashbordlar va muntazam hisobotlarga yig'adi.",
      },
    ],
    capabilitiesCarousel: {
      label: 'AI imkoniyatlari',
      prev: 'Oldingi imkoniyat',
      next: 'Keyingi imkoniyat',
      roledescription: 'karusel',
    },
    cta: 'Avtomatlashtirishni boshlash',
  },
};
