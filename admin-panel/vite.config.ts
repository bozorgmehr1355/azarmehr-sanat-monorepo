import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    // در توسعه، درخواست‌های /api را به backend (پورت 3002) پروکسی کن،
    // تا بدون پروکسی در production / hardcode آدرس، اتصال درست برقرار شود.
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});