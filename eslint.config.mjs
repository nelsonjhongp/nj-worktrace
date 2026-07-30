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

/**
 * Ni las rutas ni la capa de aplicación ni la traducción HTTP acceden a datos: pasan por la
 * superficie pública de un módulo (ADR-004 §3.3, ADR-001 §c).
 *
 * Cada frontera basada en una ruta del proyecto se declara DOS veces: con el alias `@/…` y con la
 * forma de comodín que atrapa el especificador relativo equivalente. Sin la segunda, escribir
 * `../../platform/database/client` en vez de `@/platform/database/client` evade la regla.
 */
const dataAccess = {
  group: [
    'drizzle-orm',
    'drizzle-orm/*',
    '@/platform/database',
    '@/platform/database/*',
    '**/platform/database',
    '**/platform/database/*',
  ],
  message:
    'Aquí no se accede a datos: toda lectura pasa por la superficie pública de un módulo (ADR-004 §3.3).',
};

/** El motor de autorización y la capa de aplicación no conocen el framework (ADR-004 §3.5). */
const nextFramework = {
  group: ['next', 'next/*'],
  message:
    'src/application/ y src/platform/http/ no dependen de Next.js: la adaptación al framework vive en src/app/ (ADR-004 §3.5).',
};

/** La dependencia con la traducción HTTP va en un solo sentido (ADR-009 §5). */
const platformHttp = {
  group: [
    '@/platform/http',
    '@/platform/http/*',
    '**/platform/http',
    '**/platform/http/*',
  ],
  message:
    'src/application/ no conoce HTTP: platform/http traduce resultados de aplicación, nunca al revés (ADR-009 §5).',
};

/** Un módulo de dominio no autoriza (ADR-001, regla derivada 3). */
const applicationAuthorization = {
  group: [
    '@/application/authorization',
    '@/application/authorization/*',
    '**/application/authorization',
    '**/application/authorization/*',
  ],
  message:
    'La autorización nunca se implementa ni se consulta dentro de un módulo de dominio (ADR-001, regla 3).',
};

/** El motor puro tiene un solo consumidor: el orquestador de autorización (ADR-009 §4). */
const policyEngine = {
  group: [
    '@/application/authorization/workspace-policy',
    '**/authorization/workspace-policy',
  ],
  message:
    'El motor de políticas se consume a través de authorizeWorkspaceAction, no directamente (ADR-009 §4).',
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
    // Módulos de dominio: no autorizan y no orquestan.
    files: ['src/modules/**/*.{ts,tsx}'],
    rules: restrict([
      foreignInternals,
      betterAuth,
      identityDatabaseSchema,
      applicationAuthorization,
    ]),
  },
  {
    // Dueño de Better Auth.
    files: ['src/modules/identity/**/*.{ts,tsx}'],
    rules: restrict([foreignInternals, identityDatabaseSchema, applicationAuthorization]),
  },
  {
    // Único consumidor de producción de la superficie de composición de esquema.
    files: ['src/platform/database/schema.ts'],
    rules: restrict([foreignInternals, betterAuth]),
  },
  {
    // Capa transversal: compone superficies de módulo. Sin datos, sin framework, sin HTTP.
    files: ['src/application/**/*.{ts,tsx}'],
    rules: restrict([
      foreignInternals,
      betterAuth,
      identityDatabaseSchema,
      dataAccess,
      nextFramework,
      platformHttp,
    ]),
  },
  {
    // Traducción HTTP: solo conoce el vocabulario de resultados. Sin datos, sin políticas.
    files: ['src/platform/http/**/*.{ts,tsx}'],
    rules: restrict([
      foreignInternals,
      betterAuth,
      identityDatabaseSchema,
      dataAccess,
      nextFramework,
      policyEngine,
    ]),
  },
  {
    // Enrutado y composición: sin acceso a datos y sin políticas propias.
    files: ['src/app/**/*.{ts,tsx}'],
    rules: restrict([
      foreignInternals,
      betterAuth,
      identityDatabaseSchema,
      dataAccess,
      policyEngine,
    ]),
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
