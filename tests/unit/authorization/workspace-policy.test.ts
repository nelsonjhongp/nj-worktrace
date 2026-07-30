import { describe, it, expect } from 'vitest';
import type { WorkspaceAccessContext } from '@/application/access/workspace-access-context';
import { WORKSPACE_CAPABILITIES } from '@/application/authorization/workspace-capability';
import type { WorkspaceCapability } from '@/application/authorization/workspace-capability';
import {
  canWorkspace,
  decideWorkspaceAction,
} from '@/application/authorization/workspace-policy';
import type { WorkspaceRole, WorkspaceStatus } from '@/modules/workspaces';
import { testAccessContext } from '../../support/workspace-access';

const ROLES: readonly WorkspaceRole[] = ['OWNER', 'MEMBER', 'CLIENT', 'VIEWER'];

/**
 * Tabla esperada, **transcrita a mano** desde `docs/ROLES-AND-PERMISSIONS.md` §12.
 *
 * Es un duplicado deliberado. Si esta prueba importara la matriz de producción para calcular lo
 * que espera, sería una tautología que pasaría con cualquier matriz —incluida una que conceda
 * todo a todos— y la suite entera perdería su valor. Cuando esta tabla y la de producción
 * discrepen, una de las dos está mal y la prueba lo dice.
 */
const EXPECTED: Record<
  WorkspaceCapability,
  { readonly allowed: readonly WorkspaceRole[]; readonly effect: 'READ' | 'MUTATION' }
> = {
  'workspace.read': { allowed: ['OWNER', 'MEMBER', 'CLIENT', 'VIEWER'], effect: 'READ' },
  'workspace.manage': { allowed: ['OWNER'], effect: 'MUTATION' },
  'membership.read': { allowed: ['OWNER'], effect: 'READ' },
  'membership.manage': { allowed: ['OWNER'], effect: 'MUTATION' },
  'audit.read': { allowed: ['OWNER'], effect: 'READ' },
  'work.record': { allowed: ['OWNER', 'MEMBER'], effect: 'MUTATION' },
  'publication.manage': { allowed: ['OWNER'], effect: 'MUTATION' },
  'collaboration.participate': { allowed: ['OWNER', 'MEMBER', 'CLIENT'], effect: 'MUTATION' },
  'request.create': { allowed: ['CLIENT'], effect: 'MUTATION' },
  'request.triage': { allowed: ['OWNER'], effect: 'MUTATION' },
  'review.submit': { allowed: ['CLIENT'], effect: 'MUTATION' },
};

function contextFor(role: WorkspaceRole, workspaceStatus: WorkspaceStatus): WorkspaceAccessContext {
  return testAccessContext({ role, workspaceStatus });
}

describe('decideWorkspaceAction', () => {
  describe('workspace ACTIVE · 4 roles × 11 capacidades', () => {
    for (const capability of WORKSPACE_CAPABILITIES) {
      for (const role of ROLES) {
        const expected = EXPECTED[capability].allowed.includes(role)
          ? 'ALLOWED'
          : 'DENIED_ROLE';

        it(`${role} · ${capability} → ${expected}`, () => {
          expect(decideWorkspaceAction(contextFor(role, 'ACTIVE'), capability)).toEqual({
            outcome: expected,
          });
        });
      }
    }
  });

  describe('D-34 · workspace ARCHIVED · 4 roles × 11 capacidades', () => {
    for (const capability of WORKSPACE_CAPABILITIES) {
      for (const role of ROLES) {
        const spec = EXPECTED[capability];
        const expected = !spec.allowed.includes(role)
          ? 'DENIED_ROLE'
          : spec.effect === 'MUTATION'
            ? 'DENIED_ARCHIVED'
            : 'ALLOWED';

        it(`${role} · ${capability} → ${expected}`, () => {
          expect(decideWorkspaceAction(contextFor(role, 'ARCHIVED'), capability)).toEqual({
            outcome: expected,
          });
        });
      }
    }
  });

  describe('Precedencia: el rol antes del archivado', () => {
    it('D-34 · un rol sin la capacidad recibe DENIED_ROLE aunque el workspace esté archivado', () => {
      // Si el archivado se evaluara primero, la respuesta le diría al CLIENT que su rol sí
      // tendría la capacidad en un workspace activo. Es un oráculo gratuito de cerrar.
      expect(
        decideWorkspaceAction(contextFor('CLIENT', 'ARCHIVED'), 'publication.manage'),
      ).toEqual({ outcome: 'DENIED_ROLE' });
      expect(decideWorkspaceAction(contextFor('VIEWER', 'ARCHIVED'), 'work.record')).toEqual({
        outcome: 'DENIED_ROLE',
      });
    });

    it('D-34 · un rol con la capacidad recibe DENIED_ARCHIVED, no DENIED_ROLE', () => {
      expect(
        decideWorkspaceAction(contextFor('OWNER', 'ARCHIVED'), 'workspace.manage'),
      ).toEqual({ outcome: 'DENIED_ARCHIVED' });
      expect(decideWorkspaceAction(contextFor('MEMBER', 'ARCHIVED'), 'work.record')).toEqual({
        outcome: 'DENIED_ARCHIVED',
      });
    });

    it('D-34 · toda capacidad de lectura sigue permitida con el workspace archivado', () => {
      expect(decideWorkspaceAction(contextFor('VIEWER', 'ARCHIVED'), 'workspace.read')).toEqual({
        outcome: 'ALLOWED',
      });
      expect(decideWorkspaceAction(contextFor('OWNER', 'ARCHIVED'), 'membership.read')).toEqual({
        outcome: 'ALLOWED',
      });
      expect(decideWorkspaceAction(contextFor('OWNER', 'ARCHIVED'), 'audit.read')).toEqual({
        outcome: 'ALLOWED',
      });
    });
  });

  describe('Asimetrías que descartan un atajo por OWNER', () => {
    it('el OWNER no puede enviar una revisión en nombre del cliente (ROLES §7.2)', () => {
      expect(decideWorkspaceAction(contextFor('OWNER', 'ACTIVE'), 'review.submit')).toEqual({
        outcome: 'DENIED_ROLE',
      });
    });

    it('el CLIENT sí puede enviar una revisión (ROLES §8)', () => {
      expect(decideWorkspaceAction(contextFor('CLIENT', 'ACTIVE'), 'review.submit')).toEqual({
        outcome: 'ALLOWED',
      });
    });

    it('el CLIENT puede crear una solicitud (ADR-003, canal propio)', () => {
      expect(decideWorkspaceAction(contextFor('CLIENT', 'ACTIVE'), 'request.create')).toEqual({
        outcome: 'ALLOWED',
      });
    });

    it('ni OWNER ni MEMBER pueden crear una solicitud: la cola es del cliente', () => {
      expect(decideWorkspaceAction(contextFor('OWNER', 'ACTIVE'), 'request.create')).toEqual({
        outcome: 'DENIED_ROLE',
      });
      expect(decideWorkspaceAction(contextFor('MEMBER', 'ACTIVE'), 'request.create')).toEqual({
        outcome: 'DENIED_ROLE',
      });
    });

    it('MEMBER no equivale a OWNER y VIEWER no equivale a CLIENT', () => {
      const member = contextFor('MEMBER', 'ACTIVE');
      const owner = contextFor('OWNER', 'ACTIVE');
      const viewer = contextFor('VIEWER', 'ACTIVE');
      const client = contextFor('CLIENT', 'ACTIVE');

      const differences = WORKSPACE_CAPABILITIES.filter(
        (capability) => canWorkspace(member, capability) !== canWorkspace(owner, capability),
      );
      expect(differences.length).toBeGreaterThan(0);

      const clientDifferences = WORKSPACE_CAPABILITIES.filter(
        (capability) => canWorkspace(viewer, capability) !== canWorkspace(client, capability),
      );
      expect(clientDifferences.length).toBeGreaterThan(0);
    });
  });

  describe('Pureza', () => {
    it('es síncrona: no devuelve una promesa', () => {
      const decision = decideWorkspaceAction(contextFor('OWNER', 'ACTIVE'), 'workspace.read');

      expect(decision).not.toBeInstanceOf(Promise);
      expect(Object.keys(decision)).toEqual(['outcome']);
    });

    it('la misma entrada produce siempre la misma salida', () => {
      const context = contextFor('MEMBER', 'ARCHIVED');
      const first = decideWorkspaceAction(context, 'work.record');

      for (let attempt = 0; attempt < 50; attempt += 1) {
        expect(decideWorkspaceAction(context, 'work.record')).toEqual(first);
      }
    });

    it('no modifica el contexto recibido', () => {
      const context = contextFor('CLIENT', 'ARCHIVED');
      const snapshot = JSON.stringify(context);

      decideWorkspaceAction(context, 'review.submit');

      expect(JSON.stringify(context)).toBe(snapshot);
    });
  });
});

describe('canWorkspace', () => {
  it('equivale a decideWorkspaceAction en las 88 celdas', () => {
    for (const capability of WORKSPACE_CAPABILITIES) {
      for (const role of ROLES) {
        for (const status of ['ACTIVE', 'ARCHIVED'] as const) {
          const context = contextFor(role, status);

          expect(canWorkspace(context, capability)).toBe(
            decideWorkspaceAction(context, capability).outcome === 'ALLOWED',
          );
        }
      }
    }
  });

  it('no distingue el motivo de la denegación: para eso está la decisión', () => {
    expect(canWorkspace(contextFor('CLIENT', 'ACTIVE'), 'workspace.manage')).toBe(false);
    expect(canWorkspace(contextFor('OWNER', 'ARCHIVED'), 'workspace.manage')).toBe(false);
  });
});
