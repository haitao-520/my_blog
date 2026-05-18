import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vue from '@astrojs/vue';

export default defineConfig({
  integrations: [tailwind(), vue()],
  output: 'server',
  devToolbar: { enabled: false },
  vite: {
    server: {
      allowedHosts: ['www.haitaos.asia', 'haitaos.asia'],
      proxy: {
        '/api': 'http://localhost:3000',
        '/uploads': 'http://localhost:3000',
      },
    },
  },
});