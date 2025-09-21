/// <reference types="vitest" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: ['tests/**', 'tests-examples/**', 'node_modules/**'],
    setupFiles: ['./src/test-setup.ts'],
  },
});