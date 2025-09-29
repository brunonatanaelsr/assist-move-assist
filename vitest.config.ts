import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./apps/frontend/src/__tests__/setup.ts'],
    css: true,
    include: ['apps/frontend/src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules/', 'apps/backend/**/*', 'tests/e2e/**/*', '**/*.config.*', '**/coverage/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'apps/frontend/src/__tests__/',
        'apps/backend/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        'apps/frontend/src/main.tsx',
        'apps/frontend/src/vite-env.d.ts',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/frontend/src'),
      '@assist/types': path.resolve(__dirname, './packages/types/src'),
      '@assist/types/*': path.resolve(__dirname, './packages/types/src/*'),
    },
  },
});
