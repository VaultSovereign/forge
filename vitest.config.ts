import { defineConfig } from 'vitest/config';

const RELAX = process.env.COVERAGE_RELAX === '1';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts', 'reality_ledger/**/*.spec.ts'],
    globals: true,
    deps: {
      external: ['@openai/agents'],
    },
    coverage: {
      reporter: ['text', 'json', 'lcov', 'html'],
      ...(RELAX
        ? {}
        : {
            thresholds: {
              lines: 25,
              statements: 25,
              functions: 20,
              branches: 20,
            },
          }),
    },
  },
});
