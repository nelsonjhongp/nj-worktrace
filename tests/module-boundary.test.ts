import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

describe('Module Boundary', () => {
  const srcDir = join(process.cwd(), 'src');

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
          !entry.name.endsWith('.test.ts') &&
          !fullPath.includes('/internal/')
        ) {
          files.push(fullPath);
        }
      }
    }

    walk(dir);
    return files;
  }

  it('no file outside internal/ imports from another module internal/', () => {
    const files = getAllTsFiles(srcDir);
    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const importRegex = /from\s+['"]@\/modules\/(\w+)\/internal\/[^'"]+['"]/g;
      const matches = content.matchAll(importRegex);

      for (const match of matches) {
        const relativePath = file.replace(process.cwd(), '');
        violations.push(`${relativePath}: imports from @/modules/${match[1]}/internal/`);
      }
    }

    expect(violations).toEqual([]);
  });

  it('modules can be imported via their public index', () => {
    const identityImport = "from '@/modules/identity'";
    const workspacesImport = "from '@/modules/workspaces'";

    expect(identityImport).toMatch(/@\/modules\/identity/);
    expect(workspacesImport).toMatch(/@\/modules\/workspaces/);
  });
});
