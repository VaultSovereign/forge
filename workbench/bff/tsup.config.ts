import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  dts: true,
  target: 'es2022',
  sourcemap: false,
  clean: true,
  // Keep provider libs external so the bundle doesn't need them at build time
  external: ['@openai/agents'],
});
