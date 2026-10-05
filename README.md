# itboost.uz

Сайт IT-студии ITBoost. Статический сайт на [Astro 7](https://astro.build): русская версия на `/`,
узбекская на `/uz/`.

## Быстрый старт

```bash
npm ci
cp .env.example .env     # заполнить настройки формы заявок (см. docs/DEPLOY.md)
npm run dev              # http://localhost:4321
npm run build            # astro check + сборка в dist/
npm run preview          # проверить dist/ локально
npm run serve            # собрать и сразу открыть как на хостинге (http://localhost:4321)
```

> `npm run dev` предназначен для разработки: картинки там пережимаются «на лету» при первом
> показе, поэтому скролл заметно тяжелее. Скорость и плавность оценивайте через `npm run serve`.

Нужен Node 22.12+.

## Структура

| Путь | Что там |
|---|---|
| `src/content/*.ts` | Весь текст сайта (RU + UZ), проекты, услуги, команда, контакты |
| `src/components/sections/` | Секции главной страницы |
| `src/components/layout/` | Шапка, мобильное меню, футер, курсор, SEO |
| `src/components/ui/` | Базовые компоненты: Button, SectionHeading, Badge, Icon… |
| `src/styles/` | Дизайн-токены и базовые стили |
| `src/scripts/` | Анимации и поведение (TypeScript, без зависимостей) |
| `src/assets/` | Изображения (оптимизируются при сборке в AVIF/WebP) |
| `public/` | Иконки, OG-картинка, robots.txt, .htaccess, PHP-прокси формы |

- Как добавить проект в портфолио: положить скриншот в `src/assets/portfolio/` и добавить
  запись в `src/content/projects.ts`. Счётчик в hero пересчитается сам.
- Дизайн-система и правила анимаций описаны в [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md).
- Деплой на cPanel, настройка формы заявок и замена токена бота описаны в [docs/DEPLOY.md](docs/DEPLOY.md).
- Визуальная проверка: `python tools/qa.py --base http://localhost:4321` (скриншоты по
  брейкпоинтам + поиск горизонтального переполнения).

Старая версия сайта удалена из рабочей копии; при необходимости её можно достать из истории
ветки `master`. Исходники фото без обработки лежат в `src/assets/team/originals/` (в сборку не
попадают).
