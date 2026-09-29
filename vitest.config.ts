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
    // Логические тесты без DOM помечены '// @vitest-environment node' в шапке файла
    // (environmentMatchGlobs удалён в Vitest 4)
    coverage: {
      include: ['services/**', 'constants.ts'],
      exclude: ['services/supabase.ts'],
    },
  },
});
