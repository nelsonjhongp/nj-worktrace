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
});
