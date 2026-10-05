import type { Localized } from '@/i18n';

export interface ProcessStep {
  title: string;
  text: string;
}

export interface ProcessCopy {
  eyebrow: string;
  title: string;
  lead: string;
  steps: ProcessStep[];
  cta: string;
  /** Mono label in front of the "03 / 07" progress counter. */
  stepLabel: string;
}

export const processSection: Localized<ProcessCopy> = {
  ru: {
    eyebrow: 'Процесс',
    title: 'Как мы работаем',
    lead: 'Прозрачный процесс из семи шагов: вы всегда знаете, что происходит с проектом и что будет дальше.',
    steps: [
      { title: 'Анализ', text: 'Разбираем бизнес-задачу, аудиторию и ограничения. Формулируем цели и критерии успеха.' },
      { title: 'Архитектура', text: 'Проектируем структуру системы, интеграции и данные. Оцениваем сроки и бюджет.' },
      { title: 'Дизайн', text: 'Прототипы и интерфейсы, которые согласовываем с вами до начала разработки.' },
      { title: 'Разработка', text: 'Итерации с регулярными демо: вы видите прогресс, а не только финальный результат.' },
      { title: 'Тестирование', text: 'Проверяем функциональность, скорость и работу на разных устройствах.' },
      { title: 'Запуск', text: 'Настраиваем серверы, домены и аналитику. Публикуем в сторах, если это приложение.' },
      { title: 'Поддержка', text: 'Сопровождаем после запуска: обновления, мониторинг и развитие продукта.' },
    ],
    cta: 'Получить консультацию',
    stepLabel: 'Шаг',
  },
  uz: {
    eyebrow: 'Jarayon',
    title: 'Qanday ishlaymiz',
    lead: "Yetti bosqichli shaffof jarayon: loyiha bilan nima bo'layotganini va keyin nima bo'lishini doim bilasiz.",
    steps: [
      { title: 'Tahlil', text: 'Biznes vazifasi, auditoriya va cheklovlarni tahlil qilamiz. Maqsad va muvaffaqiyat mezonlarini belgilaymiz.' },
      { title: 'Arxitektura', text: "Tizim tuzilmasi, integratsiyalar va ma'lumotlarni loyihalaymiz. Muddat va byudjetni baholaymiz." },
      { title: 'Dizayn', text: 'Ishlab chiqishdan oldin siz bilan kelishiladigan prototip va interfeyslar.' },
      { title: 'Ishlab chiqish', text: "Muntazam demo bilan iteratsiyalar: faqat yakuniy natijani emas, jarayonni ham ko'rasiz." },
      { title: 'Testlash', text: 'Funksionallik, tezlik va turli qurilmalarda ishlashini tekshiramiz.' },
      { title: 'Ishga tushirish', text: "Serverlar, domenlar va analitikani sozlaymiz. Agar ilova bo'lsa, do'konlarda nashr qilamiz." },
      { title: "Qo'llab-quvvatlash", text: 'Ishga tushirilgandan keyin hamrohlik qilamiz: yangilanishlar, monitoring va mahsulotni rivojlantirish.' },
    ],
    cta: 'Maslahat olish',
    stepLabel: 'Bosqich',
  },
};
