/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@visapi/frontend-data': path.resolve(__dirname, '../../libs/frontend/data-access/src/index.ts'),
      '@visapi/shared-types': path.resolve(__dirname, '../../libs/shared/types/src/index.ts'),
      '@visapi/shared-utils': path.resolve(__dirname, '../../libs/shared/utils/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
});
