import { findWorkspaceAccessRow } from './access-repository';
import type { WorkspaceRole } from './schema';

export type WorkspaceStatus = 'ACTIVE' | 'ARCHIVED';

/**
 * Resultado de resolver la membresía de un usuario en un workspace.
 *
 * No transporta el nombre del workspace ni ningún otro dato suyo: un contexto de acceso
 * que arrastra datos del recurso es una vía de fuga (ADR-002 §9, D-19). Tampoco
 * transporta el estado concreto de una membresía no activa: «existes como invitado» es
 * información sobre la existencia del workspace.
 */
export type WorkspaceMembershipResolution =
  | {
      readonly outcome: 'ACTIVE_MEMBERSHIP';
      readonly workspaceId: string;
      readonly role: WorkspaceRole;
      readonly workspaceStatus: WorkspaceStatus;
    }
  | { readonly outcome: 'WORKSPACE_NOT_FOUND' }
  | { readonly outcome: 'NO_ACTIVE_MEMBERSHIP' };

/**
 * Sintaxis que acepta el tipo `uuid` de PostgreSQL: 32 dígitos hexadecimales agrupados
 * opcionalmente de cuatro en cuatro mediante guiones, con o sin llaves externas.
 *
 * No se recorta la entrada: los espacios no son UUID válidos para PostgreSQL y no deben
 * normalizarse silenciosamente antes de resolver un recurso.
 */
const UUID_PATTERN =
  /^(?:\{(?:[0-9a-f]{4}-?){7}[0-9a-f]{4}\}|(?:[0-9a-f]{4}-?){7}[0-9a-f]{4})$/i;

/**
 * Resuelve el acceso de un usuario a un workspace identificado por su `public_id`.
 *
 * El `workspaces.id` interno **solo** puede salir de PostgreSQL; nunca entra desde fuera
 * (ADR-002 §9, regla A7).
 *
 * Un `public_id` con forma inválida no puede existir en la tabla: se responde
 * `WORKSPACE_NOT_FOUND` sin consultar, para que un identificador malformado produzca el
 * mismo resultado que uno inexistente y no un error del servidor.
 */
export async function resolveWorkspaceMembership(params: {
  readonly userId: string;
  readonly workspacePublicId: string;
}): Promise<WorkspaceMembershipResolution> {
  if (!UUID_PATTERN.test(params.workspacePublicId)) {
    return { outcome: 'WORKSPACE_NOT_FOUND' };
  }

  const row = await findWorkspaceAccessRow(params);

  if (row === null) {
    return { outcome: 'WORKSPACE_NOT_FOUND' };
  }

  if (row.membershipStatus !== 'ACTIVE' || row.membershipRole === null) {
    return { outcome: 'NO_ACTIVE_MEMBERSHIP' };
  }

  return {
    outcome: 'ACTIVE_MEMBERSHIP',
    workspaceId: row.workspaceId,
    role: row.membershipRole,
    workspaceStatus: row.workspaceArchivedAt === null ? 'ACTIVE' : 'ARCHIVED',
  };
}
