import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, posix } from 'path';

describe('Module Boundary', () => {
  const root = process.cwd();
  const srcDir = join(root, 'src');

  /** Ruta relativa con separadores normalizados: el mismo resultado en Windows y en CI. */
  function relative(fullPath: string): string {
    return fullPath.replace(root, '').replaceAll('\\', '/');
  }

  function getAllTsFiles(dir: string): string[] {
    const files: string[] = [];

    function walk(currentDir: string) {
      const entries = readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);

        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (
          entry.isFile() &&
          (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
          !entry.name.endsWith('.test.ts')
        ) {
          files.push(fullPath);
        }
      }
    }

    walk(dir);
    return files;
  }

  const allSourceFiles = getAllTsFiles(srcDir).map((fullPath) => ({
    path: relative(fullPath),
    content: readFileSync(fullPath, 'utf-8'),
  }));

  function importsMatching(
    files: typeof allSourceFiles,
    pattern: RegExp,
  ): string[] {
    return files.flatMap(({ path, content }) => {
      const matches = [...content.matchAll(new RegExp(pattern, 'g'))];
      return matches.map((match) => `${path}: ${match[0].trim()}`);
    });
  }

  function moduleName(path: string): string | undefined {
    return /^\/src\/modules\/([^/]+)\//.exec(path.replaceAll('\\', '/'))?.[1];
  }

  /** Resuelve aliases y rutas relativas a la misma forma POSIX en Windows y Linux. */
  function resolveImportPath(sourcePath: string, specifier: string): string {
    const normalizedSourcePath = sourcePath.replaceAll('\\', '/');

    return specifier.startsWith('@/')
      ? posix.normalize(`/${specifier.slice(2)}`)
      : posix.normalize(posix.join(posix.dirname(normalizedSourcePath), specifier));
  }

  function isForeignInternalImport(sourcePath: string, specifier: string): boolean {
    const resolvedPath = resolveImportPath(sourcePath, specifier);
    const targetModule = /^\/src\/modules\/([^/]+)\/internal(?:\/|$)/.exec(resolvedPath)?.[1];

    return targetModule !== undefined && moduleName(sourcePath) !== targetModule;
  }

  /**
   * Resuelve un especificador a una ruta con raíz en `/src`, **tanto si es un alias como si es
   * relativo**, y con el mismo resultado en Windows y en Linux.
   *
   * Difiere de `resolveImportPath` en que ancla el alias en `/src`: `@/platform/http` y
   * `../../platform/http` producen aquí la misma ruta, que es lo que permite comparar capas sin
   * duplicar cada regla en dos formas.
   */
  function resolveToSrcPath(sourcePath: string, specifier: string): string | undefined {
    const normalizedSourcePath = sourcePath.replaceAll('\\', '/');

    if (specifier.startsWith('@/')) {
      return posix.normalize(`/src/${specifier.slice(2)}`);
    }

    if (specifier.startsWith('.')) {
      return posix.normalize(posix.join(posix.dirname(normalizedSourcePath), specifier));
    }

    // Paquete externo: no es una ruta del proyecto y no participa en fronteras de capa.
    return undefined;
  }

  /** `true` si `resolved` es el objetivo o vive dentro de él. Evita casar prefijos parciales. */
  function isWithin(resolved: string, target: string): boolean {
    return resolved === target || resolved.startsWith(`${target}/`);
  }

  /**
   * Fronteras de capa que no dependen de la forma del especificador.
   *
   * Cada una se comprueba sobre la **ruta resuelta**, de modo que `@/platform/http/x` y
   * `../../platform/http/x` se detectan igual. Escribir `../..` en vez de `@/` fue exactamente la
   * vía que evadía la versión anterior de estas comprobaciones (ADR-009 T9-R13 y T9-R15).
   */
  const LAYER_BOUNDARIES = [
    {
      name: 'modules → application/authorization',
      from: '/src/modules',
      to: '/src/application/authorization',
    },
    {
      name: 'application → platform/http',
      from: '/src/application',
      to: '/src/platform/http',
    },
    {
      name: 'application → platform/database',
      from: '/src/application',
      to: '/src/platform/database',
    },
    {
      name: 'platform/http → workspace-policy',
      from: '/src/platform/http',
      to: '/src/application/authorization/workspace-policy',
    },
    {
      name: 'app → workspace-policy',
      from: '/src/app',
      to: '/src/application/authorization/workspace-policy',
    },
  ] as const;

  function crossesLayerBoundary(
    sourcePath: string,
    specifier: string,
    boundary: (typeof LAYER_BOUNDARIES)[number],
  ): boolean {
    if (!isWithin(posix.dirname(sourcePath.replaceAll('\\', '/')), boundary.from)) {
      return false;
    }

    const resolved = resolveToSrcPath(sourcePath, specifier);

    return resolved !== undefined && isWithin(resolved, boundary.to);
  }

  it('allows internal/ imports only from the module that owns them', () => {
    const violations = [
      ['/src/modules/workspaces/server.ts', '../identity/internal/session'],
      ['/src/application/access/resolve.ts', '../../modules/identity/internal/session'],
      ['/src/app/api/route.ts', '../../modules/identity/internal/session'],
    ] as const;
    const allowed = [
      ['/src/modules/identity/server.ts', './internal/session'],
      ['/src/modules/identity/internal/auth.ts', './session'],
    ] as const;

    for (const [sourcePath, specifier] of violations) {
      expect(resolveImportPath(sourcePath, specifier)).toMatch(/^\/src\/modules\/identity\/internal\//);
      expect(isForeignInternalImport(sourcePath, specifier)).toBe(true);
    }

    for (const [sourcePath, specifier] of allowed) {
      expect(isForeignInternalImport(sourcePath, specifier)).toBe(false);
    }
  });

  it('rejects imports of another module internal/ through aliases or relative paths', () => {
    const violations = allSourceFiles.flatMap(({ path, content }) =>
      [...content.matchAll(/from\s+['"]([^'"]+)['"]/g)]
        .filter(([, specifier]) => isForeignInternalImport(path, specifier!))
        .map(([, specifier]) => `${path}: ${specifier}`),
    );

    expect(violations).toEqual([]);
  });

  it('T6-9 · no file outside modules/identity imports Better Auth', () => {
    const outsideIdentity = allSourceFiles.filter(
      ({ path }) => !path.startsWith('/src/modules/identity/'),
    );

    const violations = importsMatching(
      outsideIdentity,
      /from\s+['"](?:better-auth|@better-auth)[^'"]*['"]/,
    );

    expect(violations).toEqual([]);
  });

  it('T6-R3 · the Better Auth tables are not exported from identity/index.ts', () => {
    const publicSurface = readFileSync(
      join(srcDir, 'modules', 'identity', 'index.ts'),
      'utf-8',
    );

    for (const table of ['authUser', 'authSession', 'authAccount', 'authVerification']) {
      expect(publicSurface).not.toContain(table);
    }
  });

  it('T6-R3 · only platform/database/schema.ts consumes identity/database-schema', () => {
    const violations = allSourceFiles
      .filter(({ path }) => path !== '/src/platform/database/schema.ts')
      .filter(({ content }) => content.includes('@/modules/identity/database-schema'))
      .map(({ path }) => path);

    expect(violations).toEqual([]);
  });

  it('modules do not depend on each other: workspaces never imports identity', () => {
    const workspacesFiles = allSourceFiles.filter(({ path }) =>
      path.startsWith('/src/modules/workspaces/'),
    );

    const violations = importsMatching(
      workspacesFiles,
      /from\s+['"]@\/modules\/identity[^'"]*['"]/,
    );

    expect(violations).toEqual([]);
  });

  it('modules do not depend on each other: identity never imports workspaces', () => {
    const identityFiles = allSourceFiles.filter(({ path }) =>
      path.startsWith('/src/modules/identity/'),
    );

    const violations = importsMatching(
      identityFiles,
      /from\s+['"]@\/modules\/workspaces[^'"]*['"]/,
    );

    expect(violations).toEqual([]);
  });

  it('routes hold no data access: src/app imports neither Drizzle nor the database layer', () => {
    const appFiles = allSourceFiles.filter(({ path }) => path.startsWith('/src/app/'));

    const violations = [
      ...importsMatching(appFiles, /from\s+['"]drizzle-orm[^'"]*['"]/),
      ...importsMatching(appFiles, /from\s+['"]@\/platform\/database[^'"]*['"]/),
      ...appFiles
        .filter(({ content }) => content.includes('getDb('))
        .map(({ path }) => `${path}: getDb(`),
    ];

    expect(violations).toEqual([]);
  });

  it('application composes module surfaces: no Drizzle, no database layer', () => {
    const applicationFiles = allSourceFiles.filter(({ path }) =>
      path.startsWith('/src/application/'),
    );

    expect(applicationFiles.length).toBeGreaterThan(0);

    const violations = [
      ...importsMatching(applicationFiles, /from\s+['"]drizzle-orm[^'"]*['"]/),
      ...importsMatching(applicationFiles, /from\s+['"]@\/platform\/database[^'"]*['"]/),
    ];

    expect(violations).toEqual([]);
  });

  it('the pure policy engine imports no framework, no bare data package, no Better Auth', () => {
    // Paquetes externos: no admiten forma relativa, así que basta el nombre.
    const authorizationFiles = allSourceFiles.filter(({ path }) =>
      path.startsWith('/src/application/authorization/'),
    );

    expect(authorizationFiles.length).toBeGreaterThan(0);

    const violations = [
      ...importsMatching(authorizationFiles, /from\s+['"]next(?:\/[^'"]*)?['"]/),
      ...importsMatching(authorizationFiles, /from\s+['"]drizzle-orm[^'"]*['"]/),
      ...importsMatching(authorizationFiles, /from\s+['"](?:better-auth|@better-auth)[^'"]*['"]/),
    ];

    expect(violations).toEqual([]);
  });

  it('the HTTP translation imports no framework and no bare data package', () => {
    const httpFiles = allSourceFiles.filter(({ path }) =>
      path.startsWith('/src/platform/http/'),
    );

    expect(httpFiles.length).toBeGreaterThan(0);

    const violations = [
      ...importsMatching(httpFiles, /from\s+['"]drizzle-orm[^'"]*['"]/),
      ...importsMatching(httpFiles, /from\s+['"]next(?:\/[^'"]*)?['"]/),
      ...importsMatching(httpFiles, /from\s+['"](?:better-auth|@better-auth)[^'"]*['"]/),
    ];

    expect(violations).toEqual([]);
  });

  it('layer boundaries are detected through aliases and through relative paths alike', () => {
    // Fixtures puros: rutas que no existen en el árbol, solo para demostrar que la comprobación
    // reacciona a las dos formas del mismo import. Sin ellos, la prueba de abajo pasaría hoy y
    // seguiría pasando el día que alguien la evadiera con `../..`.
    const mustReject = [
      ['/src/modules/workspaces/internal/x.ts', '@/application/authorization/workspace-policy'],
      ['/src/modules/workspaces/internal/x.ts', '../../../application/authorization/workspace-policy'],
      ['/src/application/authorization/x.ts', '@/platform/http/workspace-authorization-response'],
      ['/src/application/authorization/x.ts', '../../platform/http/workspace-authorization-response'],
      ['/src/application/access/x.ts', '@/platform/database/client'],
      ['/src/application/access/x.ts', '../../platform/database/client'],
      ['/src/platform/http/x.ts', '@/application/authorization/workspace-policy'],
      ['/src/platform/http/x.ts', '../../application/authorization/workspace-policy'],
      ['/src/app/api/w/route.ts', '@/application/authorization/workspace-policy'],
      ['/src/app/api/w/route.ts', '../../../application/authorization/workspace-policy'],
    ] as const;

    for (const [sourcePath, specifier] of mustReject) {
      const crossed = LAYER_BOUNDARIES.some((boundary) =>
        crossesLayerBoundary(sourcePath, specifier, boundary),
      );

      expect(crossed, `no se detectó: ${sourcePath} → ${specifier}`).toBe(true);
    }

    // Movimiento legítimo dentro de cada capa: no debe activar ninguna frontera.
    const mustAllow = [
      ['/src/application/authorization/x.ts', '../access/workspace-access-context'],
      ['/src/application/authorization/x.ts', './workspace-policy'],
      ['/src/application/access/x.ts', '@/modules/workspaces'],
      ['/src/platform/http/x.ts', '@/application/authorization/authorize-workspace-action'],
      ['/src/platform/database/x.ts', 'drizzle-orm'],
      ['/src/modules/workspaces/x.ts', './internal/access'],
      ['/src/app/api/w/route.ts', '@/application/authorization/authorize-workspace-action'],
      ['/src/app/api/w/route.ts', '@/platform/http/workspace-authorization-response'],
    ] as const;

    for (const [sourcePath, specifier] of mustAllow) {
      const crossed = LAYER_BOUNDARIES.some((boundary) =>
        crossesLayerBoundary(sourcePath, specifier, boundary),
      );

      expect(crossed, `falso positivo: ${sourcePath} → ${specifier}`).toBe(false);
    }
  });

  it('no source file crosses a layer boundary, by alias or by relative path', () => {
    const violations = allSourceFiles.flatMap(({ path, content }) =>
      [...content.matchAll(/from\s+['"]([^'"]+)['"]/g)].flatMap(([, specifier]) =>
        LAYER_BOUNDARIES.filter((boundary) =>
          crossesLayerBoundary(path, specifier!, boundary),
        ).map((boundary) => `${boundary.name} — ${path}: ${specifier}`),
      ),
    );

    expect(violations).toEqual([]);
  });

  it('capability literals exist only in workspace-capability.ts', () => {
    const catalogPath = '/src/application/authorization/workspace-capability.ts';
    const catalog = allSourceFiles.find(({ path }) => path === catalogPath);

    expect(catalog).toBeDefined();

    const capabilities = [...catalog!.content.matchAll(/^ {2}'([a-z]+\.[a-z]+)',$/gm)].map(
      ([, capability]) => capability!,
    );

    expect(capabilities.length).toBe(11);

    // La matriz está indexada por capacidad, así que sus claves son literales inevitables: es la
    // única excepción. Fuera de esos dos archivos se importa la constante, porque una cadena
    // literal es una capacidad duplicada esperando a divergir.
    const allowed = [catalogPath, '/src/application/authorization/workspace-policy.ts'];

    const filesWithLiterals = allSourceFiles
      .filter(({ content }) => capabilities.some((c) => content.includes(`'${c}'`)))
      .map(({ path }) => path)
      .sort();

    // Se afirma el conjunto **observado**, no la constante de arriba: así la prueba falla tanto si
    // aparece un tercer archivo con literales como si uno de los dos deja de tenerlos.
    expect(filesWithLiterals).toEqual([...allowed].sort());
  });

  it('the only cast to WorkspaceId lives at the persistence boundary of modules/workspaces', () => {
    // La marca nominal solo se puede aplicar donde el identificador procede de PostgreSQL. Si
    // apareciera un segundo `as WorkspaceId`, la garantía dejaría de valer sin que nada avisara.
    const boundary = '/src/modules/workspaces/internal/access.ts';
    const casting = allSourceFiles
      .filter(({ content }) => /as\s+WorkspaceId\b/.test(content))
      .map(({ path }) => path);

    expect(casting).toEqual([boundary]);

    // Y está inmediatamente después del repositorio, no en una capa superior.
    const source = allSourceFiles.find(({ path }) => path === boundary);
    expect(source?.content).toContain('findWorkspaceAccessRow');
  });

  it('neither the access context nor the scope re-brand the workspace identifier', () => {
    // Ambos reciben el `WorkspaceId` ya marcado; una aserción de tipo aquí significaría que
    // alguien ha reabierto el camino lateral que la iteración 2D cerró.
    for (const path of [
      '/src/application/access/workspace-access-context.ts',
      '/src/application/access/workspace-scope.ts',
      '/src/application/access/resolve-workspace-access.ts',
      '/src/application/authorization/authorize-workspace-action.ts',
    ]) {
      const source = allSourceFiles.find((file) => file.path === path);

      expect(source, `falta ${path}`).toBeDefined();
      expect(source!.content).not.toMatch(/\bas\s+WorkspaceId\b/);
    }
  });
});
