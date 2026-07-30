import { eq } from 'drizzle-orm';
import { getDb } from '@/platform/database/client';
import { auth } from './auth';
import { domainUsers } from './schema';

/**
 * Resultado de resolver la identidad autenticada de una petición.
 *
 * No transporta correo, nombre, imagen, token de sesión, cuenta ni marcas de tiempo:
 * la única información que sale del módulo es el identificador de dominio del usuario.
 */
export type AuthenticatedIdentityResolution =
  | { readonly outcome: 'AUTHENTICATED'; readonly userId: string }
  | { readonly outcome: 'UNAUTHENTICATED' }
  | { readonly outcome: 'IDENTITY_NOT_PROVISIONED' }
  | { readonly outcome: 'IDENTITY_ARCHIVED' };

/**
 * Devuelve el identificador del usuario de Better Auth, o `null` si la petición no trae
 * una sesión válida.
 *
 * Ausencia de cookie, cookie manipulada, sesión expirada y sesión revocada son
 * indistinguibles a propósito: la diferencia entre ellas es información sobre el estado
 * de una cuenta ajena (ADR-006 §3.2).
 */
async function findSessionUserId(headers: Headers): Promise<string | null> {
  const session = await auth.api.getSession({ headers });

  return session?.user.id ?? null;
}

/**
 * Traduce las cabeceras de una petición en una identidad de dominio utilizable.
 *
 * Dos viajes a PostgreSQL: la validación de sesión que hace Better Auth (sin caché en
 * cookie, ADR-006 T6-R1) y la comprobación de `domain_users`, que vive en este módulo
 * porque la tabla es suya (ADR-001 §d).
 */
export async function resolveAuthenticatedIdentity(
  headers: Headers,
): Promise<AuthenticatedIdentityResolution> {
  const userId = await findSessionUserId(headers);

  if (userId === null) {
    return { outcome: 'UNAUTHENTICATED' };
  }

  const rows = await getDb()
    .select({ archivedAt: domainUsers.archivedAt })
    .from(domainUsers)
    .where(eq(domainUsers.id, userId))
    .limit(1);

  const domainUser = rows[0];

  if (domainUser === undefined) {
    return { outcome: 'IDENTITY_NOT_PROVISIONED' };
  }

  if (domainUser.archivedAt !== null) {
    return { outcome: 'IDENTITY_ARCHIVED' };
  }

  return { outcome: 'AUTHENTICATED', userId };
}
