import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Enable SWC for faster builds
      jsxRuntime: 'automatic',
    }),
    // PWA Support
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'images/**/*',
        'placeholder-property.jpg',
        'placeholder-property.svg',
      ],
      manifest: {
        name: 'VeriHome - Plataforma Inmobiliaria',
        short_name: 'VeriHome',
        description:
          'Plataforma integral para conectar arrendadores, arrendatarios y prestadores de servicios inmobiliarios en Colombia',
        theme_color: '#1976d2',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'es-CO',
        orientation: 'portrait-primary',
        categories: ['business', 'productivity'],
        icons: [
          {
            src: '/images/icon-48x48.svg',
            sizes: '48x48',
            type: 'image/svg+xml',
          },
          {
            src: '/images/icon-72x72.svg',
            sizes: '72x72',
            type: 'image/svg+xml',
          },
          {
            src: '/images/icon-96x96.svg',
            sizes: '96x96',
            type: 'image/svg+xml',
          },
          {
            src: '/images/icon-144x144.svg',
            sizes: '144x144',
            type: 'image/svg+xml',
          },
          {
            src: '/images/icon-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: '/images/icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'Acceso directo al dashboard principal',
            url: '/app/dashboard',
          },
          {
            name: 'Propiedades',
            short_name: 'Propiedades',
            description: 'Ver y gestionar propiedades',
            url: '/app/properties',
          },
          {
            name: 'Mensajes',
            short_name: 'Mensajes',
            description: 'Centro de mensajes y comunicación',
            url: '/app/messages',
          },
        ],
      },
      workbox: {
        // Pre-cache app shell
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff,woff2}'],
        // No precachear opencv.js (~11MB, self-hosted): se carga on-demand solo
        // en el flujo biométrico VeriHome ID. Precachearlo rompe el build (excede
        // el límite del service worker) y desperdiciaría cuota offline.
        globIgnores: ['**/vendor/**'],
        // Runtime caching strategies
        runtimeCaching: [
          {
            // API calls: NetworkFirst with 24h cache
            urlPattern: /^https?:\/\/.*\/api\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            // Static assets: CacheFirst with 30d cache
            urlPattern: /\.(?:js|css|woff|woff2|ttf|eot)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Images: CacheFirst with 7d cache
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
    // Bundle analyzer (solo en build)
    // process.env.ANALYZE && visualizer({
    //   filename: 'dist/stats.html',
    //   open: true,
    //   gzipSize: true,
    //   brotliSize: true,
    // }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Define process.env for browser compatibility with some libraries
    'process.env': {},
  },
  build: {
    outDir: '../staticfiles/frontend',
    emptyOutDir: true,
    target: 'es2020',
    minify: 'terser',
    sourcemap: process.env.NODE_ENV === 'development',
    // Increase chunk size limit for better optimization
    // mapbox-gl pesa ~1.5MB y vive en su propio chunk lazy (cargado
    // sólo en /properties/new y /properties/:id/edit). Subimos el
    // umbral para no spamear warnings — todos los demás chunks
    // están bajo 500 kB tras el split de vendor.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      // External dependencies que no deben bundlearse
      external: [],
      output: {
        // Optimized manual chunks para mejor code splitting
        manualChunks: id => {
          // Vendor chunks más granulares
          if (id.includes('node_modules')) {
            // React core SOLAMENTE. Antes era `id.includes('react')`, un
            // match demasiado amplio que capturaba react-router, react-query,
            // @emotion/react, react-hook-form, etc. en este chunk (por ser la
            // 1ª condición) -> dependencias circulares entre chunks ->
            // "Cannot set properties of undefined (setting 'Children')" y
            // pantalla blanca en producción. Match preciso del runtime React:
            if (
              id.includes('/node_modules/react/') ||
              id.includes('/node_modules/react-dom/') ||
              id.includes('/node_modules/react-is/') ||
              id.includes('/node_modules/scheduler/') ||
              id.includes('/node_modules/use-sync-external-store/')
            ) {
              return 'react';
            }

            // React Router
            if (id.includes('react-router')) {
              return 'router';
            }

            // Material UI iconos (set enorme, raramente usado en su
            // totalidad) — separado para que el chunk core de MUI no
            // se infle a más de 1MB.
            if (id.includes('@mui/icons-material')) {
              return 'mui-icons';
            }

            // @mui/x-* (DataGrid, DatePickers) son pesados y opt-in.
            if (id.includes('@mui/x-')) {
              return 'mui-x';
            }

            // Material UI core + emotion
            if (id.includes('@mui') || id.includes('@emotion')) {
              return 'mui';
            }

            // Sentry SDK (>500KB).
            if (id.includes('@sentry')) {
              return 'sentry';
            }

            // Pasarelas de pago (cargadas on-demand).
            if (id.includes('@stripe') || id.includes('@paypal')) {
              return 'payments-vendor';
            }

            // i18n stack.
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'i18n';
            }

            // Drag & drop.
            if (id.includes('@hello-pangea/dnd')) {
              return 'dnd';
            }

            // TanStack Query
            if (id.includes('@tanstack/react-query')) {
              return 'query';
            }

            // Charts libraries
            if (
              id.includes('chart.js') ||
              id.includes('recharts') ||
              id.includes('react-chartjs')
            ) {
              return 'charts';
            }

            // Mapbox (>700KB minified) — chunk dedicado para que
            // páginas sin mapa no lo descarguen.
            if (id.includes('mapbox-gl') || id.includes('@mapbox')) {
              return 'mapbox';
            }

            // Otros mapas
            if (id.includes('leaflet')) {
              return 'maps';
            }

            // Form libraries
            if (
              id.includes('react-hook-form') ||
              id.includes('yup') ||
              id.includes('formik')
            ) {
              return 'forms';
            }

            // Utility libraries
            if (
              id.includes('axios') ||
              id.includes('date-fns') ||
              id.includes('lodash') ||
              id.includes('xlsx')
            ) {
              return 'utils';
            }

            // Error boundary
            if (id.includes('react-error-boundary')) {
              return 'error-handling';
            }

            // Other vendor dependencies
            return 'vendor';
          }

          // Código de app: SIN chunking manual por feature. Los React.lazy()
          // de las rutas ya hacen code-split por página; el split manual por
          // feature (services/hooks/components importándose entre sí) creaba
          // dependencias circulares entre chunks -> "Cannot access 'r' before
          // initialization" y pantalla blanca. Vite agrupa el resto.
        },
        chunkFileNames: chunkInfo => {
          // Para chunks nombrados via manualChunks (mui, mui-icons, vendor, …)
          // priorizar el nombre lógico — facilita debugging y análisis.
          if (chunkInfo.name && !chunkInfo.name.startsWith('chunk')) {
            return `js/${chunkInfo.name}-[hash].js`;
          }
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId
                .split('/')
                .pop()
                ?.replace(/\.\w+$/, '')
            : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: assetInfo => {
          const name = assetInfo.name || '';
          let extType = name.split('.').pop();

          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp|avif/i.test(extType || '')) {
            extType = 'img';
          } else if (/woff|woff2|eot|ttf|otf/i.test(extType || '')) {
            extType = 'fonts';
          } else if (/css/i.test(extType || '')) {
            extType = 'css';
          } else {
            extType = 'assets';
          }

          return `${extType}/[name]-[hash][extname]`;
        },
      },
      treeshake: {
        moduleSideEffects: true,
        propertyReadSideEffects: true,
        tryCatchDeoptimization: false,
      },
    },
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimized asset inlining
    assetsInlineLimit: 4096, // 4kb
    // Enable brotli compression for static assets
    reportCompressedSize: true,
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    // Enable HTTP/2
    https: false,
    proxy: {
      '/api/v1': {
        target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log(
              'Received Response from the Target:',
              proxyRes.statusCode,
              req.url,
            );
          });
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      '@mui/material',
      '@mui/lab',
      '@mui/icons-material',
      '@emotion/react',
      '@emotion/styled',
      '@tanstack/react-query',
      'react-router-dom',
      'axios',
    ],
    exclude: [],
    force: false,
  },
  // CSS optimization
  css: {
    devSourcemap: process.env.NODE_ENV === 'development',
    postcss: {
      plugins: [
        // Autoprefixer se incluye automáticamente
      ],
    },
  },
  // JSON optimization
  json: {
    namedExports: true,
    stringify: false,
  },
  // Worker optimization
  worker: {
    format: 'es',
    plugins: () => [
      // Plugins específicos para workers si los hay
    ],
  },
  // Preview configuration
  preview: {
    port: 4173,
    host: '0.0.0.0',
  },
});
