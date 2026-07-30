/**
 * Superficie de composición de esquema del módulo identity.
 *
 * Existe para que `src/platform/database/schema.ts` pueda construir el esquema Drizzle
 * completo (incluidas las tablas propias de Better Auth, que el adaptador necesita).
 *
 * Único consumidor de producción permitido: `src/platform/database/schema.ts`.
 * Ningún módulo de dominio importa este archivo (ADR-006 T6-R3). La regla se hace cumplir
 * en `eslint.config.mjs` y en `tests/module-boundary.test.ts`.
 */
export { domainUsers } from './internal/schema';
export { authUser, authSession, authAccount, authVerification } from './internal/better-auth-schema';
