import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    global: 'globalThis',
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Node.js polyfills for simple-peer
      stream: 'stream-browserify',
      events: 'events',
      util: 'util/',
      buffer: 'buffer/',
    },
  },
  optimizeDeps: {
    include: ['simple-peer', 'events', 'util', 'buffer', 'stream-browserify'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  server: {
    port: 5173,
    warmup: {
      clientFiles: ['./src/main.jsx', './src/App.jsx', './src/styles/global.css'],
    },
    watch: {
      ignored: ['**/release/**', '**/build/**', '**/node_modules/**', '**/.git/**', '**/assests/**'],
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
