import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// import { visualizer } from 'rollup-plugin-visualizer';
import { splitVendorChunkPlugin } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Enable SWC for faster builds
      jsxRuntime: 'automatic',
    }),
    // Split vendor chunks automatically
    splitVendorChunkPlugin(),
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
    target: 'es2015',
    minify: 'terser',
    sourcemap: process.env.NODE_ENV === 'development',
    // Increase chunk size limit for better optimization
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      // External dependencies que no deben bundlearse
      external: [],
      output: {
        // Optimized manual chunks para mejor code splitting
        manualChunks: (id) => {
          // Vendor chunks más granulares
          if (id.includes('node_modules')) {
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react';
            }
            
            // React Router
            if (id.includes('react-router')) {
              return 'router';
            }
            
            // Material UI ecosystem
            if (id.includes('@mui') || id.includes('@emotion')) {
              return 'mui';
            }
            
            // TanStack Query
            if (id.includes('@tanstack/react-query')) {
              return 'query';
            }
            
            // Charts libraries
            if (id.includes('chart.js') || id.includes('recharts') || id.includes('react-chartjs')) {
              return 'charts';
            }
            
            // Maps libraries
            if (id.includes('mapbox') || id.includes('leaflet')) {
              return 'maps';
            }
            
            // Form libraries
            if (id.includes('react-hook-form') || id.includes('yup') || id.includes('formik')) {
              return 'forms';
            }
            
            // Utility libraries
            if (id.includes('axios') || id.includes('date-fns') || id.includes('lodash') || id.includes('xlsx')) {
              return 'utils';
            }
            
            // Error boundary
            if (id.includes('react-error-boundary')) {
              return 'error-handling';
            }
            
            // Other vendor dependencies
            return 'vendor';
          }
          
          // App code chunks basados en features
          if (id.includes('/src/pages/auth/')) {
            return 'auth';
          }
          
          if (id.includes('/src/pages/properties/') || id.includes('/src/components/properties/')) {
            return 'properties';
          }
          
          if (id.includes('/src/pages/contracts/') || id.includes('/src/components/contracts/')) {
            return 'contracts';
          }
          
          if (id.includes('/src/pages/payments/') || id.includes('/src/components/payments/')) {
            return 'payments';
          }
          
          if (id.includes('/src/pages/messages/') || id.includes('/src/components/messages/')) {
            return 'messages';
          }
          
          if (id.includes('/src/pages/dashboard/') || id.includes('/src/components/dashboard/')) {
            return 'dashboard';
          }
          
          if (id.includes('/src/components/ratings/')) {
            return 'ratings';
          }
          
          if (id.includes('/src/services/')) {
            return 'services';
          }
          
          if (id.includes('/src/hooks/')) {
            return 'hooks';
          }
          
          if (id.includes('/src/utils/')) {
            return 'utils-app';
          }
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace(/\.\w+$/, '')
            : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
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
        // Enable aggressive tree shaking
        moduleSideEffects: false,
        propertyReadSideEffects: false,
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
        target: 'http://127.0.0.1:8000',
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
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      // Pre-bundle estos paquetes para mejor performance en dev
      'react',
      'react-dom',
      '@mui/material',
      '@mui/lab',
      '@mui/icons-material',
      '@emotion/react',
      '@emotion/styled',
      '@tanstack/react-query',
      'react-router-dom',
      'axios',
    ],
    exclude: [
      // Excluir paquetes que causan problemas con pre-bundling
    ],
    // Force optimize algunos paquetes problemáticos
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