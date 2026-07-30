import { describe, it, expect } from 'vitest';
import type { WorkspaceAccessContext } from '@/application/access/workspace-access-context';
import { WORKSPACE_CAPABILITIES } from '@/application/authorization/workspace-capability';
import { decideWorkspaceAction } from '@/application/authorization/workspace-policy';
import type { WorkspaceRole, WorkspaceStatus } from '@/modules/workspaces';
import { testAccessContext } from '../../support/workspace-access';

const ROLES: readonly WorkspaceRole[] = ['OWNER', 'MEMBER', 'CLIENT', 'VIEWER'];

function contextFor(role: WorkspaceRole, workspaceStatus: WorkspaceStatus): WorkspaceAccessContext {
  return testAccessContext({ role, workspaceStatus });
}

describe('WORKSPACE_CAPABILITIES', () => {
  it('es un catálogo cerrado de exactamente once capacidades', () => {
    // El número literal obliga a que añadir una capacidad sea un acto consciente que toca
    // también `docs/ROLES-AND-PERMISSIONS.md` §12.
    expect(WORKSPACE_CAPABILITIES.length).toBe(11);
  });

  it('no contiene duplicados', () => {
    expect(new Set(WORKSPACE_CAPABILITIES).size).toBe(WORKSPACE_CAPABILITIES.length);
  });

  it('contiene exactamente las capacidades documentadas', () => {
    expect([...WORKSPACE_CAPABILITIES]).toEqual([
      'workspace.read',
      'workspace.manage',
      'membership.read',
      'membership.manage',
      'audit.read',
      'work.record',
      'publication.manage',
      'collaboration.participate',
      'request.create',
      'request.triage',
      'review.submit',
    ]);
  });

  it('no contiene capacidades que nadie ha decidido: crear ni restaurar workspace', () => {
    // `workspace.create` no puede ser una capacidad acotada a workspace (§12.1) y
    // `workspace.unarchive` es `OD-19`, todavía abierta.
    const forbidden = ['workspace.create', 'workspace.unarchive', 'workspace.delete'];

    for (const capability of forbidden) {
      expect(WORKSPACE_CAPABILITIES).not.toContain(capability);
    }
  });

  it('toda capacidad tiene al menos un rol permitido', () => {
    // Se comprueba por comportamiento y no leyendo la matriz: la matriz es privada a propósito,
    // para que nadie pueda construir un segundo motor sobre sus datos. Una capacidad sin ningún
    // rol sería código muerto que deniega siempre.
    for (const capability of WORKSPACE_CAPABILITIES) {
      const allowedRoles = ROLES.filter(
        (role) => decideWorkspaceAction(contextFor(role, 'ACTIVE'), capability).outcome === 'ALLOWED',
      );

      expect(allowedRoles.length).toBeGreaterThan(0);
    }
  });

  it('toda capacidad tiene un efecto READ o MUTATION, y ninguno más', () => {
    // El efecto se observa en el workspace archivado: una lectura sigue permitida, una mutación
    // pasa a DENIED_ARCHIVED. Cualquier tercer comportamiento sería un efecto inventado.
    for (const capability of WORKSPACE_CAPABILITIES) {
      const permitted = ROLES.filter(
        (role) => decideWorkspaceAction(contextFor(role, 'ACTIVE'), capability).outcome === 'ALLOWED',
      );

      const archivedOutcomes = new Set(
        permitted.map(
          (role) => decideWorkspaceAction(contextFor(role, 'ARCHIVED'), capability).outcome,
        ),
      );

      expect(archivedOutcomes.size).toBe(1);
      expect(['ALLOWED', 'DENIED_ARCHIVED']).toContain([...archivedOutcomes][0]);
    }
  });

  it('una capacidad desconocida no compila', () => {
    // Comprobación exclusivamente de tipos: el cuerpo nunca se ejecuta. Si se ejecutara, la
    // matriz devolvería `undefined` y la prueba fallaría por una razón distinta de la que
    // pretende afirmar — que es que TypeScript rechaza la llamada antes de llegar ahí.
    const typeOnly = (): void => {
      const context = contextFor('OWNER', 'ACTIVE');

      // @ts-expect-error una cadena arbitraria no es una WorkspaceCapability
      decideWorkspaceAction(context, 'workspace.destroy');

      // @ts-expect-error tampoco lo es una capacidad de una entidad de negocio inventada
      decideWorkspaceAction(context, 'work_item.create');
    };

    expect(typeof typeOnly).toBe('function');
  });
});
