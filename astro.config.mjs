// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://itboost.uz',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  image: {
    responsiveStyles: false,
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'ru',
        locales: { ru: 'ru-RU', uz: 'uz-UZ' },
      },
    }),
  ],
  vite: {
    server: { fs: { strict: true } },
  },
});
