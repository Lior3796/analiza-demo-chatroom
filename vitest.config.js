import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        test: {
          name: 'server',
          environment: 'node',
          include: ['server/__tests__/**/*.test.js'],
          env: { DB_PATH: ':memory:' },
        },
      },
      {
        plugins: [react()],
        test: {
          name: 'client',
          environment: 'jsdom',
          include: ['client/src/__tests__/**/*.test.jsx'],
          setupFiles: ['client/src/__tests__/setup.js'],
        },
      },
    ],
  },
});
