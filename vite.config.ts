import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/** Build version: vYYYY.MM.DD-<shortsha>, e.g. v2026.10.16-a1b2c3d */
function buildVersion(): { version: string; sha: string; buildTime: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${now.getUTCFullYear()}.${pad(now.getUTCMonth() + 1)}.${pad(now.getUTCDate())}`;
  let sha = 'nogit';
  try {
    sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
      .slice(0, 7) || 'nogit';
  } catch {
    /* not a git checkout (local agent tree) — date-only version */
  }
  return { version: `v${date}-${sha}`, sha, buildTime: now.toISOString() };
}

/**
 * Writes dist/version.json at the end of every production build.
 * The app fetches this with cache:'no-store' and compares it against the
 * baked-in __APP_VERSION__ — if they differ, an update prompt is shown.
 * Set CRITICAL_UPDATE=true in the build env to force a blocking prompt.
 */
function versionJsonPlugin(info: { version: string; sha: string; buildTime: string }): Plugin {
  return {
    name: 'sanatani-version-json',
    apply: 'build',
    closeBundle() {
      const manifest = {
        version: info.version,
        buildTime: info.buildTime,
        sha: info.sha,
        critical: process.env.CRITICAL_UPDATE === 'true',
      };
      try {
        fs.writeFileSync(
          path.resolve(__dirname, 'dist/version.json'),
          JSON.stringify(manifest, null, 2) + '\n',
        );
        console.log(`[version-json] wrote dist/version.json ${info.version} critical=${manifest.critical}`);
      } catch (err) {
        console.warn('[version-json] failed to write dist/version.json', err);
      }
    },
  };
}

export default defineConfig(() => {
  // GitHub Pages serves project sites under /<repo>/ — set GITHUB_PAGES=true
  // in the deploy workflow so asset URLs and the PWA manifest resolve there.
  // Local dev and other hosts keep base '/'.
  const base = process.env.GITHUB_PAGES === 'true' ? '/Sanatani-Bandhan/' : '/';
  const ver = buildVersion();
  return {
    base,
    define: {
      __APP_VERSION__: JSON.stringify(ver.version),
      __APP_BUILD_SHA__: JSON.stringify(ver.sha),
      __APP_BUILD_TIME__: JSON.stringify(ver.buildTime),
    },
    build: {
      rollupOptions: {
        output: {
          // @mlc-ai/web-llm is a 6.8MB CJS-only bundle. Its dynamic imports
          // were NOT splitting it out of the entry chunk (Rollup CJS interop),
          // which pushed the main chunk past the PWA precache limit and broke
          // production builds (2026-10-18). Force it into its own chunk —
          // it only ever loads when the user touches the on-device voice.
          manualChunks: {
            'web-llm': ['@mlc-ai/web-llm'],
          },
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      versionJsonPlugin(ver),
      VitePWA({
        // 'prompt' (not 'autoUpdate'): the SW stages the new version in the
        // background and our UpdatePrompt component asks the user to apply it.
        // Silent auto-updates left users running stale code with no signal.
        registerType: 'prompt',
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
          // web-llm is a 5.9MB on-demand chunk (dynamic import only when the
          // user enables the on-device voice). Precaching it would force every
          // devotee to download it; it loads lazily via import() instead.
          globIgnores: ['**/web-llm-*.js'],
          maximumFileSizeToCacheInBytes: 5000000,
          // M-6: base-relative fallback — absolute '/index.html' 404s under
          // the GitHub Pages /Sanatani-Bandhan/ subpath.
          navigateFallback: `${base}index.html`,
          runtimeCaching: [
            {
              // Bulletproof updates: version.json must NEVER be served from
              // any cache — it is the handshake that detects stale deploys
              // (e.g. Firebase CDN edge inconsistency). NetworkOnly, and the
              // app treats failure as "no update info" (offline-safe).
              urlPattern: ({ url }: { url: URL }) =>
                url.origin === self.origin && url.pathname.endsWith('/version.json'),
              handler: 'NetworkOnly',
            },
            {
              // Bahi-Khata Seva Phase 2: the OCR "Reading Pack" (engine
              // core + ben/hin/eng data, ~10 MB one-time) lives under
              // /ocr/*. CacheFirst so a goshala courtyard with no signal
              // can still scan register pages fully offline. Must come
              // BEFORE the same-origin NetworkFirst rule below.
              urlPattern: ({ url }: { url: URL }) =>
                url.origin === self.origin && url.pathname.includes('/ocr/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'ocr-reading-pack',
                expiration: {
                  maxEntries: 16,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
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
              // M-7: scoped to SAME-ORIGIN app assets only. The old /.*/i
              // catch-all cached Firestore (*.googleapis.com) and /api
              // responses for 30 days — stale financial/ledger data served
              // as fresh. Those origins are never cached now.
              urlPattern: ({ url }: { url: URL }) =>
                url.origin === self.origin && !url.pathname.startsWith('/api'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'app-assets',
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
          description: 'Digital command platform for Mandirs, Goshalas, Ashrams, Gurukuls and Sanghas',
          theme_color: '#ea580c',
          background_color: '#1c1917',
          display: 'standalone',
          orientation: 'portrait',
          start_url: base,
          scope: base,
          icons: [
            {
              src: 'icon-16x16.png',
              sizes: '16x16',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'icon-32x32.png',
              sizes: '32x32',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'icon-48x48.png',
              sizes: '48x48',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'icon-72x72.png',
              sizes: '72x72',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'icon-96x96.png',
              sizes: '96x96',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'icon-128x128.png',
              sizes: '128x128',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'icon-144x144.png',
              sizes: '144x144',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'icon-152x152.png',
              sizes: '152x152',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'icon-180x180.png',
              sizes: '180x180',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: 'icon-384x384.png',
              sizes: '384x384',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'icon-512x512.png',
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
      // Proxy API calls to the Express backend during local development.
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  };
});
