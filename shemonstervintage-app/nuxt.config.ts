  import { defineNuxtConfig } from 'nuxt/config'
  import { fileURLToPath } from 'node:url'
  import { URL } from 'node:url'

  export default defineNuxtConfig({
    ssr: true, // or false if you only need SPA
    compatibilityDate: '2025-05-15',
    devtools: { enabled: true },
    plugins: process.env.NODE_ENV === 'production'
    ? [{ src: '~/plugins/three.prod.client.ts', mode: 'client' }]
    : [],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '~': fileURLToPath(new URL('./src', import.meta.url)),
      }
    },
    modules: ['@nuxt/image', '@nuxt/eslint', '@nuxtjs/i18n'],

    i18n: {
      strategy: 'prefix',
      defaultLocale: 'en',
      lazy: true,
      langDir: 'locales/',
      locales: [
        { code: 'en', name: 'English', file: 'en.json' },
        { code: 'de', name: 'Deutsch', file: 'de.json' }
      ]
    },

    css: [
      'bootstrap/dist/css/bootstrap.css',
      'bootstrap-vue-3/dist/bootstrap-vue-3.css',
    ],

    app: {
      // 👇 Adjust this to your subfolder (important for all-inkl)
      baseURL: '/test/',
      buildAssetsDir: '_nuxt/',

      head: {
        title: 'She Monster Vintage',
        meta: [
          { name: 'viewport', content: 'width=device-width, initial-scale=1' },
          { charset: 'utf-8' },
          { name: 'description', content: 'She Monster Vintage - Unique Vintage Clothing' }
        ],
        link: [
          { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
        ]
      }
    },
    vite: {
      resolve: {
        alias: {
          three: fileURLToPath(new URL("node_modules/three", import.meta.url)),
          "super-three": fileURLToPath(new URL("node_modules/three", import.meta.url)),
          "three/examples/jsm": fileURLToPath(
            new URL("node_modules/three/examples/jsm", import.meta.url)
          )
        }
      }
    }
  })
