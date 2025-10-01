import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    globals: true,
    deps: {
      external: ['@openai/agents'],
    },
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
