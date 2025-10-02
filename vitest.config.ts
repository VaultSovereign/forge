import { defineConfig } from 'vitest/config';

const RELAX = process.env.COVERAGE_RELAX === '1';

export default defineConfig({
  // Move deprecated test.deps → server.deps to silence Vitest warning
  server: {
    deps: {
      external: ['@openai/agents'],
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts', 'reality_ledger/**/*.spec.ts'],
    globals: true,
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
