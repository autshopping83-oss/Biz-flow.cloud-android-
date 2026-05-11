import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
  ],
  
  build: {
    chunkSizeWarningLimit: 1000,
    
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-pdf': ['jspdf', 'html2canvas'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-capacitor': ['@capacitor/core'],
        },
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.warn'],
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
    
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: true,
  },
  
  esbuild: {
    treeShaking: true,
    legalComments: 'none',
  },
  
  server: {
    port: 5173,
    strictPort: true,
  },
  
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@services': '/src/services',
      '@pages': '/src/pages',
    },
  },
});
