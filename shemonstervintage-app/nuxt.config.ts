// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  modules: ['@nuxt/image', '@nuxt/eslint', '@nuxtjs/i18n'],
  i18n: {
    strategy: 'prefix',
    defaultLocale: 'en',
    lazy: true,
    langDir: 'locales/',
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'de', name: 'Deutsch', file: 'de.json' }
    ],
    experimental: {
      bundle: {
        optimizeTranslationDirective: false
      }
    },
  },
  css: [
    'bootstrap/dist/css/bootstrap.css',
    'bootstrap-vue-3/dist/bootstrap-vue-3.css',
  ],
  app: {
    head: {
      title: 'She Monster Vintage',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { charset: 'utf-8' },
        { name: 'description', content: 'She Monster Vintage - Unique Vintage Clothing' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ],
      noscript: [
        // <noscript>JavaScript is required</noscript>
        { textContent: 'JavaScript is required' }
      ],
    }
  }
})