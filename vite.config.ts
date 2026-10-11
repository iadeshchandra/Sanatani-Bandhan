import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'script',
        includeAssets: [
          'favicon.png',
          'logo.png',
          'logo.svg',
          'logo-light.svg',
          'logo-dark.svg',
          'icon.png',
          'icon-16x16.png',
          'icon-32x32.png',
          'icon-48x48.png',
          'icon-72x72.png',
          'icon-96x96.png',
          'icon-128x128.png',
          'icon-144x144.png',
          'icon-152x152.png',
          'icon-180x180.png',
          'icon-192x192.png',
          'icon-384x384.png',
          'icon-512x512.png'
        ],
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
          maximumFileSizeToCacheInBytes: 5000000,
          navigateFallback: '/index.html',
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'others',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // <== 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            }
          ]
        },
        manifest: {
          name: 'Sanatani Bandhan',
          short_name: 'Bandhan',
          description: 'Digital Vedic Command ERP for Mandirs, Goshalas, and Ashrams',
          theme_color: '#ea580c',
          background_color: '#1c1917',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/icon-16x16.png',
              sizes: '16x16',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icon-32x32.png',
              sizes: '32x32',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icon-48x48.png',
              sizes: '48x48',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icon-72x72.png',
              sizes: '72x72',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icon-96x96.png',
              sizes: '96x96',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icon-128x128.png',
              sizes: '128x128',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icon-144x144.png',
              sizes: '144x144',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icon-152x152.png',
              sizes: '152x152',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icon-180x180.png',
              sizes: '180x180',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/icon-384x384.png',
              sizes: '384x384',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
