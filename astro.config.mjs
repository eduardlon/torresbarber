import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless';

// https://astro.build/config
export default defineConfig({
  site: 'http://localhost:4322', // URL base del sitio para desarrollo
  integrations: [
    react(),
    tailwind()
  ],
  prefetch: true,
  output: 'server',
  adapter: vercel(),
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
