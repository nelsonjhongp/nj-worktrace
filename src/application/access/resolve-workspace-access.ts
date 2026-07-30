import { resolveAuthenticatedIdentity } from '@/modules/identity/server';
import { resolveWorkspaceMembership } from '@/modules/workspaces/server';
import type { WorkspaceAccessResolution } from './workspace-access-context';

/**
 * Resuelve el acceso de la petición a un workspace.
 *
 * Compone las superficies públicas de `identity` y `workspaces` sin consultar tablas, sin
 * conocer Better Auth y sin usar Drizzle. Una sesión autenticada no concede acceso por sí
 * sola: sin membresía activa no hay contexto (ADR-002 §2).
 *
 * Precedencia, y el orden importa — primero el actor, después el recurso, para que un
 * actor inválido no llegue nunca a producir información sobre un workspace:
 *
 *   UNAUTHENTICATED
 *   → IDENTITY_NOT_PROVISIONED
 *   → IDENTITY_ARCHIVED
 *   → WORKSPACE_NOT_FOUND
 *   → NO_ACTIVE_MEMBERSHIP
 *   → GRANTED
 *
 * Se resuelve entera en cada petición: sin memoización y sin caché, porque un rol cacheado
 * es un permiso que sobrevive a su revocación (ADR-006 T6-R1, ADR-002 §5).
 */
export async function resolveWorkspaceAccess(params: {
  readonly headers: Headers;
  readonly workspacePublicId: string;
}): Promise<WorkspaceAccessResolution> {
  const identity = await resolveAuthenticatedIdentity(params.headers);

  if (identity.outcome !== 'AUTHENTICATED') {
    return { outcome: identity.outcome };
  }

  const membership = await resolveWorkspaceMembership({
    userId: identity.userId,
    workspacePublicId: params.workspacePublicId,
  });

  if (membership.outcome !== 'ACTIVE_MEMBERSHIP') {
    return { outcome: membership.outcome };
  }

  return {
    outcome: 'GRANTED',
    context: {
      userId: identity.userId,
      workspaceId: membership.workspaceId,
      role: membership.role,
      workspaceStatus: membership.workspaceStatus,
    },
  };
}
