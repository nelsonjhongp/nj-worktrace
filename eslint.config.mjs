import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/** Nadie importa el `internal/` de otro módulo: se importa su superficie pública. */
const foreignInternals = {
  group: ['@/modules/*/internal/*'],
  message:
    'Importing from internal/ of another module is forbidden. Use the module\'s public index.ts instead.',
};

/** Better Auth solo existe dentro de identity (ADR-006 T6-9). */
const betterAuth = {
  group: ['better-auth', 'better-auth/*', '@better-auth/*'],
  message:
    'Better Auth solo se importa dentro de src/modules/identity/ (ADR-006 T6-9). Usa @/modules/identity/server.',
};

/** La composición de esquema no es superficie de dominio (ADR-006 T6-R3). */
const identityDatabaseSchema = {
  group: ['@/modules/identity/database-schema'],
  message:
    'La superficie de composición de esquema solo la consume src/platform/database/schema.ts (ADR-006 T6-R3).',
};

/** Las rutas no consultan la base: pasan por un servicio de aplicación (ADR-004 §3.3). */
const dataAccessFromRoutes = {
  group: ['drizzle-orm', 'drizzle-orm/*', '@/platform/database/*'],
  message:
    'src/app/ no accede a datos: toda lectura pasa por un servicio de aplicación (ADR-004 §3.3).',
};

const restrict = (patterns) => ({
  'no-restricted-imports': ['error', { patterns }],
});

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      ...restrict([foreignInternals, betterAuth, identityDatabaseSchema]),
    },
  },
  {
    // Dueño de Better Auth.
    files: ['src/modules/identity/**/*.{ts,tsx}'],
    rules: restrict([foreignInternals, identityDatabaseSchema]),
  },
  {
    // Único consumidor de producción de la superficie de composición de esquema.
    files: ['src/platform/database/schema.ts'],
    rules: restrict([foreignInternals, betterAuth]),
  },
  {
    // Enrutado y composición: sin acceso a datos.
    files: ['src/app/**/*.{ts,tsx}'],
    rules: restrict([foreignInternals, betterAuth, identityDatabaseSchema, dataAccessFromRoutes]),
  },
  {
    // Las pruebas pueden inspeccionar el esquema; no pueden importar Better Auth.
    files: ['tests/**/*.ts', 'scripts/**/*.ts'],
    rules: restrict([foreignInternals, betterAuth]),
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'coverage/**'],
  },
];
