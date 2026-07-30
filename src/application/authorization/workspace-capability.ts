import type { WorkspaceRole } from '@/modules/workspaces';

/**
 * Catálogo **cerrado** de capacidades acotadas a un workspace.
 *
 * Una capacidad es una acción conceptual, no un endpoint ni un botón. La agrupación sale de
 * las filas idénticas de la matriz de acciones de `docs/ROLES-AND-PERMISSIONS.md` §8: si dos
 * acciones tienen exactamente el mismo conjunto de roles y el mismo efecto, son una sola
 * capacidad. Una capacidad por entidad daría ~88 celdas que la documentación no distingue, y
 * cada celda inventada es una decisión de autorización que nadie ha tomado.
 *
 * Deliberadamente **fuera** del catálogo:
 *
 * - `workspace.create`: no existe contexto de workspace en el momento de crear uno, luego no
 *   puede ser una capacidad acotada a workspace. Es una acción de identidad autenticada
 *   (`ROLES-AND-PERMISSIONS.md` §12.1).
 * - `workspace.unarchive`: nadie ha decidido todavía quién restaura un workspace archivado ni
 *   con qué operación (`OD-19`). Inventarla aquí sería inventar alcance.
 * - `visibility` y `publication_state`: son **filtros, no permisos** (`ROLES-AND-PERMISSIONS.md`
 *   §1.4). La capacidad es *cambiarlos* (`publication.manage`); *aplicarlos* es trabajo de la
 *   capa de datos.
 * - La propiedad del registro (el `(p)` de la matriz de §5, «solo registros propios»): depende
 *   del registro, no del contexto. Un motor que solo ve `WorkspaceAccessContext` no puede
 *   evaluarla, y fingir que sí la evalúa sería peor que no tenerla.
 */
export const WORKSPACE_CAPABILITIES = [
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
] as const;

export type WorkspaceCapability = (typeof WORKSPACE_CAPABILITIES)[number];

/**
 * Si una capacidad lee o muta.
 *
 * Es el único dato que necesita la regla del workspace archivado, y por eso vive en la
 * especificación de la capacidad y no repetido en el motor: la regla se escribe una vez
 * (`ADR-005` T5-R12, una invariante en un solo nivel).
 */
export type CapabilityEffect = 'READ' | 'MUTATION';

export type CapabilitySpec = {
  readonly effect: CapabilityEffect;
  readonly roles: readonly WorkspaceRole[];
};
