import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/admin',
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: ['www.haitaos.asia', 'haitaos.asia'],
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
});