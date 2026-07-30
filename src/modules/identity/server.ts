import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from './internal/auth';

/**
 * Superficie server-only del módulo identity.
 *
 * Better Auth se importa aquí y en `internal/`, en ningún otro sitio de la aplicación
 * (ADR-006 T6-9). Sustituir la biblioteca afecta a este módulo, no a la aplicación.
 */
export { auth };

/** Handler de las rutas de autenticación. La ruta de `app/` solo lo reexporta. */
export const authHandler = toNextJsHandler(auth);

export { resolveAuthenticatedIdentity } from './internal/session';
export type { AuthenticatedIdentityResolution } from './internal/session';
