declare module 'fastify-type-provider-zod' {
  import type { FastifyTypeProvider } from 'fastify';
  // Minimal type-only stub; real package provides full typings
  export interface ZodTypeProvider extends FastifyTypeProvider {}
}
