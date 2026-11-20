import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function pianoramaVersionPlugin(versionPayload: { buildId: string; builtAt: string }) {
  return {
    name: 'pianorama-version-json',
    configureServer(server: {
      middlewares: {
        use: (
          path: string,
          handler: (
            req: unknown,
            res: { setHeader: (k: string, v: string) => void; end: (b: string) => void }
          ) => void
        ) => void;
      };
    }) {
      server.middlewares.use('/version.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify(versionPayload, null, 2));
      });
    },
    generateBundle(this: {
      emitFile: (file: { type: 'asset'; fileName: string; source: string }) => void;
    }) {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify(versionPayload, null, 2),
      });
    },
  };
}

export default defineConfig(() => {
  const buildDate = new Date();
  const buildId =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ||
    buildDate.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const builtAt = buildDate.toISOString();

  return {
    define: {
      __APP_BUILD_ID__: JSON.stringify(buildId),
      __APP_BUILT_AT__: JSON.stringify(builtAt),
    },
    plugins: [
      react(),
      tailwindcss(),
      pianoramaVersionPlugin({ buildId, builtAt }),
      VitePWA({
        registerType: 'prompt',
        includeAssets: [
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'PIANORAMA — Il laboratorio dei piani di lavoro',
          short_name: 'PIANORAMA',
          description:
            'Laboratorio offline-first per le programmazioni didattiche disciplinari della scuola secondaria di primo grado.',
          theme_color: '#1F3864',
          background_color: '#F8FAFC',
          display: 'standalone',
          orientation: 'any',
          lang: 'it',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json}'],
          globIgnores: ['**/version.json'],
          navigateFallbackDenylist: [/^\/version\.json$/],
          runtimeCaching: [
            {
              urlPattern: /\/version\.json(\?.*)?$/i,
              handler: 'NetworkOnly',
            },
          ],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 1800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('pdfjs-dist')) return 'vendor-pdfjs';
            if (id.includes('docx') || id.includes('jszip')) return 'vendor-docx';
            if (id.includes('jspdf')) return 'vendor-jspdf';
            if (id.includes('xlsx')) return 'vendor-xlsx';
            if (id.includes('dexie')) return 'vendor-storage';
            if (id.includes('react') || id.includes('lucide-react') || id.includes('motion')) {
              return 'vendor-ui';
            }
            return undefined;
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
