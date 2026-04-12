import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environmentMatchGlobs: [
      ['tests/componentLogic.test.ts', 'node'],
      ['tests/gameEngine*.test.ts', 'node'],
      ['tests/constants.test.ts', 'node'],
    ],
    coverage: {
      include: ['services/**', 'constants.ts'],
      exclude: ['services/supabase.ts'],
    },
  },
});
