import { resolveWorkspaceAccess } from '../access/resolve-workspace-access';
import { createWorkspaceScope } from '../access/workspace-scope';
import type { WorkspaceScope } from '../access/workspace-scope';
import type { WorkspaceAccessContext } from '../access/workspace-access-context';
import type { WorkspaceCapability } from './workspace-capability';
import { decideWorkspaceAction } from './workspace-policy';

/**
 * Resultado completo de autorizar una acción: los fallos de la resolución de acceso (2C) y las
 * denegaciones de la política, en **una unión plana**.
 *
 * Plana y no anidada a propósito. Envolver los resultados de 2C en algo como
 * `{ outcome: 'ACCESS_DENIED', reason: … }` obligaría a desempaquetar en el traductor HTTP y
 * perdería la exhaustividad del `switch`: con la unión plana, TypeScript falla si el traductor
 * olvida un caso. Ése es exactamente el fallo que hunde este tipo de código — un caso no
 * contemplado que cae en un `default` permisivo.
 *
 * `scope` viaja en `AUTHORIZED` porque es el mecanismo central de la iteración, no una
 * comodidad: es la única forma de obtener un `WorkspaceScope`, así que tener uno **es** la
 * prueba de haber sido autorizado.
 */
export type WorkspaceAuthorizationResult =
  | {
      readonly outcome: 'AUTHORIZED';
      readonly context: WorkspaceAccessContext;
      readonly scope: WorkspaceScope;
    }
  | { readonly outcome: 'UNAUTHENTICATED' }
  | { readonly outcome: 'IDENTITY_NOT_PROVISIONED' }
  | { readonly outcome: 'IDENTITY_ARCHIVED' }
  | { readonly outcome: 'WORKSPACE_NOT_FOUND' }
  | { readonly outcome: 'NO_ACTIVE_MEMBERSHIP' }
  | { readonly outcome: 'DENIED_ROLE' }
  | { readonly outcome: 'DENIED_ARCHIVED' };

/**
 * Autoriza una acción concreta sobre un workspace concreto.
 *
 * Compone: cabeceras + `public_id` + `WorkspaceAccessContext` (2C) + capacidad → autorización.
 * No consulta la base de datos: encadena la resolución de acceso y el motor puro de políticas.
 *
 * Se resuelve entera en cada petición, sin memoización ni caché: un rol cacheado es un permiso
 * que sobrevive a su revocación (`ADR-002` §5, `ADR-006` T6-R1).
 *
 * Sobre errores: una denegación **no** lanza — es un resultado normal y esperado. Un fallo de
 * infraestructura (PostgreSQL caído, pool agotado) **sí** se propaga sin capturarse. Un `catch`
 * que devolviera «no encontrado» ante un error de conexión convertiría una caída en un falso
 * aislamiento silencioso, que es el peor de los dos fallos.
 */
export async function authorizeWorkspaceAction(params: {
  readonly headers: Headers;
  readonly workspacePublicId: string;
  readonly capability: WorkspaceCapability;
}): Promise<WorkspaceAuthorizationResult> {
  const access = await resolveWorkspaceAccess({
    headers: params.headers,
    workspacePublicId: params.workspacePublicId,
  });

  if (access.outcome !== 'GRANTED') {
    return { outcome: access.outcome };
  }

  const decision = decideWorkspaceAction(access.context, params.capability);

  if (decision.outcome !== 'ALLOWED') {
    return { outcome: decision.outcome };
  }

  return {
    outcome: 'AUTHORIZED',
    context: access.context,
    scope: createWorkspaceScope(access.context),
  };
}
