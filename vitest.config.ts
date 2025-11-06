import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Configuración del entorno de testing
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    
    // Configuración de archivos
    include: [
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'tests/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.astro',
      'coverage',
      'e2e',
    ],
    
    // Configuración de coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.{js,ts,mjs}',
        '**/coverage/**',
        '**/dist/**',
        '**/.astro/**',
        '**/public/**',
        '**/*.test.{js,ts,jsx,tsx}',
        '**/*.spec.{js,ts,jsx,tsx}',
        '**/types/**',
        '**/mocks/**',
        '**/fixtures/**',
      ],
      include: [
        'src/**/*.{js,ts,jsx,tsx}',
      ],
      // Umbrales de coverage
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    
    // Configuración de reporters
    reporters: [
      'default',
      'json',
      'html',
    ],
    
    // Configuración de timeouts
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Configuración de retry
    retry: 2,
    
    // Configuración de paralelización
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 1,
      },
    },
    

    
    // Configuración de mocks
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    
    // Configuración de UI
    ui: true,
    open: false,
    

  },
  
  // Configuración de resolución de módulos
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/layouts': resolve(__dirname, './src/layouts'),
      '@/pages': resolve(__dirname, './src/pages'),
      '@/styles': resolve(__dirname, './src/styles'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/hooks': resolve(__dirname, './src/hooks'),
      '@/types': resolve(__dirname, './src/types'),
      '@/assets': resolve(__dirname, './src/assets'),
      '@/test': resolve(__dirname, './src/test'),
    },
  },
  
  // Configuración de define para variables globales
  define: {
    'import.meta.vitest': 'undefined',
  },
  
  // Configuración de optimización de dependencias
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@testing-library/react',
      '@testing-library/jest-dom',
      '@testing-library/user-event',
    ],
  },
  
  // Configuración de esbuild
  esbuild: {
    target: 'node14',
  },
});