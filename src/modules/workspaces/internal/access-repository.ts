import { and, eq } from 'drizzle-orm';
import { getDb } from '@/platform/database/client';
import { workspaces, workspaceMembers } from './schema';
import type { WorkspaceMemberStatus, WorkspaceRole } from './schema';

/**
 * Fila cruda de la resolución de acceso. `membership*` es nulo cuando el usuario no tiene
 * ninguna fila en `workspace_members` para ese workspace.
 */
export type WorkspaceAccessRow = {
  readonly workspaceId: string;
  readonly workspaceArchivedAt: Date | null;
  readonly membershipRole: WorkspaceRole | null;
  readonly membershipStatus: WorkspaceMemberStatus | null;
};

/**
 * Un único viaje a PostgreSQL: el workspace se busca por su identificador opaco
 * (ADR-002 §9) y la membresía se trae con `LEFT JOIN` para poder distinguir
 * «el workspace no existe» de «existe y no eres miembro».
 *
 * Consulta solo tablas de este módulo. El estado de la membresía se trae sin filtrar y se
 * colapsa en `access.ts`, para que la regla «solo ACTIVE concede» sea explícita y
 * comprobable en un solo sitio.
 */
export async function findWorkspaceAccessRow(params: {
  readonly userId: string;
  readonly workspacePublicId: string;
}): Promise<WorkspaceAccessRow | null> {
  const rows = await getDb()
    .select({
      workspaceId: workspaces.id,
      workspaceArchivedAt: workspaces.archivedAt,
      membershipRole: workspaceMembers.role,
      membershipStatus: workspaceMembers.status,
    })
    .from(workspaces)
    .leftJoin(
      workspaceMembers,
      and(
        eq(workspaceMembers.workspaceId, workspaces.id),
        eq(workspaceMembers.userId, params.userId),
      ),
    )
    .where(eq(workspaces.publicId, params.workspacePublicId))
    .limit(1);

  return rows[0] ?? null;
}
