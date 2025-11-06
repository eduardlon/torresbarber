import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    tailwind()
  ],
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  server: {
    port: 4322,
    host: true // Permite acceso desde cualquier interfaz de red
  },
  vite: {
    server: {
      host: '0.0.0.0',
      port: 4322,
      strictPort: false,
      hmr: false, // Deshabilitar HMR para evitar problemas de WebSocket desde móvil
      watch: {
        usePolling: true
      }
    }
  }
});
