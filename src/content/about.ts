import type { Localized } from '@/i18n';
import type { ServiceId } from './services';

export interface Principle {
  title: string;
  text: string;
}

export interface ProblemSolution {
  problem: string;
  solution: string;
  service: ServiceId;
}

export interface AboutCopy {
  eyebrow: string;
  /** Large editorial statement; words light up as the user scrolls. */
  statement: string;
  principles: Principle[];
  problemsTitle: string;
  problemsLead: string;
  problemLabel: string;
  solutionLabel: string;
  /** Mono label in front of the linked service name. */
  serviceLabel: string;
  items: ProblemSolution[];
}

export const about: Localized<AboutCopy> = {
  ru: {
    eyebrow: 'О нас',
    statement:
      'Мы — ITBoost: инженеры и дизайнеры, которые превращают задачи бизнеса в надёжные цифровые продукты. Мы не просто пишем код — мы проектируем системы, которые экономят время, снижают затраты и приводят клиентов.',
    principles: [
      {
        title: 'Опыт и профессионализм',
        text: 'Senior-разработчики, дизайнеры и AI-инженер в одной команде: от архитектуры до запуска.',
      },
      {
        title: 'Качество и индивидуальный подход',
        text: 'Решения под ваши процессы, а не шаблоны. Каждый проект начинается с разбора задачи.',
      },
      {
        title: 'Безопасность и надёжность',
        text: 'Защита данных, стабильная инфраструктура и поддержка после запуска.',
      },
    ],
    problemsTitle: 'С какими задачами к нам приходят',
    problemsLead: 'Мы начинаем не с технологий, а с того, что мешает вашему бизнесу расти.',
    problemLabel: 'Задача',
    solutionLabel: 'Решение',
    serviceLabel: 'Направление',
    items: [
      {
        problem: 'Сайт не приводит клиентов',
        solution:
          'Быстрый сайт с понятной структурой, SEO-основой и формой заявки, которая отправляет лиды прямо в Telegram.',
        service: 'web',
      },
      {
        problem: 'Продажи держатся на звонках и переписке',
        solution: 'Интернет-магазин с каталогом, корзиной и онлайн-оплатой, который продаёт круглосуточно.',
        service: 'ecommerce',
      },
      {
        problem: 'Процессы живут в таблицах и мессенджерах',
        solution: 'CRM или платформа под ваши процессы: заявки, задачи, склад и отчёты в одной системе.',
        service: 'platforms',
      },
      {
        problem: 'Команда тратит часы на рутину',
        solution:
          'Telegram-боты и AI-агенты, которые отвечают клиентам, принимают заказы и обрабатывают документы.',
        service: 'ai',
      },
      {
        problem: 'Клиенты ищут вас в смартфоне',
        solution: 'Нативные приложения для iOS и Android с удобным интерфейсом и публикацией в сторах.',
        service: 'mobile',
      },
      {
        problem: 'Сервис не выдерживает нагрузку',
        solution: 'DevOps-сопровождение: CI/CD, мониторинг и масштабируемая инфраструктура.',
        service: 'devops',
      },
    ],
  },
  uz: {
    eyebrow: 'Biz haqimizda',
    statement:
      "Biz — ITBoost: biznes vazifalarini ishonchli raqamli mahsulotlarga aylantiradigan muhandislar va dizaynerlar. Biz shunchaki kod yozmaymiz — vaqtni tejaydigan, xarajatlarni kamaytiradigan va mijozlarni olib keladigan tizimlarni loyihalaymiz.",
    principles: [
      {
        title: 'Tajriba va professionallik',
        text: 'Senior-dasturchilar, dizaynerlar va AI-muhandis bitta jamoada: arxitekturadan ishga tushirishgacha.',
      },
      {
        title: 'Sifat va individual yondashuv',
        text: "Shablonlar emas, jarayonlaringizga mos yechimlar. Har bir loyiha vazifani tahlil qilishdan boshlanadi.",
      },
      {
        title: 'Xavfsizlik va ishonchlilik',
        text: "Ma'lumotlar himoyasi, barqaror infratuzilma va ishga tushirilgandan keyin qo'llab-quvvatlash.",
      },
    ],
    problemsTitle: 'Bizga qanday vazifalar bilan murojaat qilishadi',
    problemsLead: "Biz texnologiyalardan emas, biznesingiz o'sishiga nima xalaqit berayotganidan boshlaymiz.",
    problemLabel: 'Vazifa',
    solutionLabel: 'Yechim',
    serviceLabel: "Yo'nalish",
    items: [
      {
        problem: 'Sayt mijoz olib kelmayapti',
        solution:
          "Tushunarli tuzilma, SEO-asos va arizalarni to'g'ridan-to'g'ri Telegramga yuboradigan forma bilan tezkor sayt.",
        service: 'web',
      },
      {
        problem: "Savdo qo'ng'iroq va yozishmalarga bog'liq",
        solution: "Katalog, savat va onlayn to'lovga ega, kecha-kunduz sotadigan internet-do'kon.",
        service: 'ecommerce',
      },
      {
        problem: 'Jarayonlar jadvallar va messenjerlarda',
        solution: 'Jarayonlaringizga mos CRM yoki platforma: arizalar, vazifalar, ombor va hisobotlar bitta tizimda.',
        service: 'platforms',
      },
      {
        problem: 'Jamoa soatlab bir xil ishlarni bajaradi',
        solution:
          'Mijozlarga javob beradigan, buyurtma qabul qiladigan va hujjatlarni qayta ishlaydigan Telegram-botlar va AI-agentlar.',
        service: 'ai',
      },
      {
        problem: 'Mijozlar sizni smartfonda qidirishadi',
        solution: "Qulay interfeysli va do'konlarda nashr etiladigan iOS va Android uchun native ilovalar.",
        service: 'mobile',
      },
      {
        problem: 'Servis yuklamaga bardosh bermaydi',
        solution: 'DevOps-hamrohlik: CI/CD, monitoring va kengaytiriladigan infratuzilma.',
        service: 'devops',
      },
    ],
  },
};
