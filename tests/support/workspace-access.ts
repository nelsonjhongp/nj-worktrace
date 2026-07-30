import type { WorkspaceAccessContext } from '@/application/access/workspace-access-context';
import type { WorkspaceId, WorkspaceRole, WorkspaceStatus } from '@/modules/workspaces';

/**
 * Único punto del árbol de pruebas que aplica la marca de `WorkspaceId`.
 *
 * En producción la marca solo la aplica el módulo `workspaces` en su frontera de persistencia. Las
 * pruebas unitarias del motor de políticas necesitan contextos sintéticos y no pueden pasar por
 * PostgreSQL, así que replican esa disciplina: **un solo lugar**, aquí, en vez de un `as` disperso
 * por cada archivo de prueba. Las pruebas de integración no usan esto: obtienen contextos reales.
 */
function testWorkspaceId(value: string): WorkspaceId {
  return value as WorkspaceId;
}

/** Contexto de acceso sintético para probar el motor puro sin base de datos. */
export function testAccessContext(params: {
  readonly role: WorkspaceRole;
  readonly workspaceStatus: WorkspaceStatus;
  readonly userId?: string;
  readonly workspaceId?: string;
}): WorkspaceAccessContext {
  return {
    userId: params.userId ?? 'user-under-test',
    workspaceId: testWorkspaceId(params.workspaceId ?? 'workspace-under-test'),
    role: params.role,
    workspaceStatus: params.workspaceStatus,
  };
}
