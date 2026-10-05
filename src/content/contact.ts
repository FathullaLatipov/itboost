import type { Localized } from '@/i18n';

export interface ContactCopy {
  eyebrow: string;
  title: string;
  lead: string;
  details: {
    phone: string;
    email: string;
    address: string;
    /** Screen-reader hint for links that open a new tab. */
    newTab: string;
  };
  form: {
    /** Mono caption at the top of the form panel. */
    title: string;
    requiredNote: string;
    /** Shown only when JavaScript is disabled (the form needs JS to send). */
    noscript: string;
    name: string;
    namePlaceholder: string;
    phone: string;
    phonePlaceholder: string;
    service: string;
    servicePlaceholder: string;
    message: string;
    messagePlaceholder: string;
    submit: string;
    sending: string;
    success: string;
    error: string;
    consent: string;
    errors: {
      name: string;
      phone: string;
      service: string;
      message: string;
    };
  };
}

export const contact: Localized<ContactCopy> = {
  ru: {
    eyebrow: 'Контакты',
    title: 'Обсудим ваш проект?',
    lead: 'Оставьте заявку — бесплатно проконсультируем, оценим задачу и предложим решение.',
    details: {
      phone: 'Телефон',
      email: 'Email',
      address: 'Адрес',
      newTab: '(откроется в новой вкладке)',
    },
    form: {
      title: 'Заявка',
      requiredNote: 'Все поля обязательны',
      noscript: 'Для отправки формы включите JavaScript — или просто позвоните нам:',
      name: 'Ваше имя',
      namePlaceholder: 'Как к вам обращаться',
      phone: 'Номер телефона',
      phonePlaceholder: '+998 90 123-45-67',
      service: 'Услуга',
      servicePlaceholder: 'Выберите услугу',
      message: 'О задаче',
      messagePlaceholder: 'Например: нужен интернет-магазин с онлайн-оплатой',
      submit: 'Отправить заявку',
      sending: 'Отправляем…',
      success: 'Спасибо! Заявка отправлена — мы свяжемся с вами в ближайшее время.',
      error: 'Не удалось отправить заявку. Позвоните нам или попробуйте ещё раз.',
      consent: 'Отправляя форму, вы соглашаетесь на обработку контактных данных для связи с вами.',
      errors: {
        name: 'Укажите имя',
        phone: 'Укажите корректный номер телефона',
        service: 'Выберите услугу',
        message: 'Опишите задачу в паре предложений',
      },
    },
  },
  uz: {
    eyebrow: 'Aloqa',
    title: 'Loyihangizni muhokama qilamizmi?',
    lead: 'Ariza qoldiring — bepul maslahat beramiz, vazifani baholaymiz va yechim taklif qilamiz.',
    details: {
      phone: 'Telefon',
      email: 'Email',
      address: 'Manzil',
      newTab: '(yangi oynada ochiladi)',
    },
    form: {
      title: 'Ariza',
      requiredNote: 'Barcha maydonlar majburiy',
      noscript: "Formani yuborish uchun JavaScript'ni yoqing — yoki bizga qo'ng'iroq qiling:",
      name: 'Ismingiz',
      namePlaceholder: 'Sizga qanday murojaat qilaylik',
      phone: 'Telefon raqamingiz',
      phonePlaceholder: '+998 90 123-45-67',
      service: 'Xizmat',
      servicePlaceholder: 'Xizmatni tanlang',
      message: 'Vazifa haqida',
      messagePlaceholder: "Masalan: onlayn to'lovli internet-do'kon kerak",
      submit: 'Ariza yuborish',
      sending: 'Yuborilmoqda…',
      success: "Rahmat! Ariza yuborildi — tez orada siz bilan bog'lanamiz.",
      error: "Arizani yuborib bo'lmadi. Bizga qo'ng'iroq qiling yoki qayta urinib ko'ring.",
      consent: "Formani yuborish orqali siz bog'lanish uchun aloqa ma'lumotlaringizni qayta ishlashga rozilik bildirasiz.",
      errors: {
        name: 'Ismingizni kiriting',
        phone: "To'g'ri telefon raqamini kiriting",
        service: 'Xizmatni tanlang',
        message: 'Vazifani bir-ikki gapda yozing',
      },
    },
  },
};
