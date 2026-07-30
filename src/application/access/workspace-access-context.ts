import type { WorkspaceRole } from '@/modules/workspaces';

export type { WorkspaceRole };

export type WorkspaceStatus = 'ACTIVE' | 'ARCHIVED';

/**
 * Contexto de acceso a un workspace: la respuesta completa a «quién es y qué es aquí».
 *
 * Es todo lo que la iteración 2D necesita para decidir si una acción está permitida, y
 * nada más. Inmutable y serializable a propósito:
 *
 * - inmutable, porque un contexto que se puede modificar es una escalada de privilegios a
 *   una asignación de distancia;
 * - serializable (solo primitivos y uniones de literales), porque se puede registrar
 *   íntegro en un log sin volcar credenciales.
 *
 * Deliberadamente **no** contiene: identificador de membresía, marcas de tiempo, correo,
 * nombre, imagen, token o identificador de sesión, ni datos del workspace más allá de su
 * identificador interno y su estado.
 *
 * `workspaceStatus` está aquí, y no como resultado de fallo, porque un workspace archivado
 * con membresía activa **concede** acceso de solo lectura (USER-FLOWS F1 A3 y F14). La
 * imposición de esa lectura corresponde a 2D.
 */
export type WorkspaceAccessContext = {
  readonly userId: string;
  readonly workspaceId: string;
  readonly role: WorkspaceRole;
  readonly workspaceStatus: WorkspaceStatus;
};

/**
 * Resultado de la resolución de acceso, en el plano interno del dominio.
 *
 * Sin códigos de estado, sin mensajes y sin decisiones de visibilidad: la traducción a
 * respuesta HTTP —incluida la respuesta deliberadamente indistinguible que exige
 * ADR-002 §3— es de la iteración 2D.
 *
 * `WORKSPACE_NOT_FOUND` y `NO_ACTIVE_MEMBERSHIP` se distinguen aquí porque son dos
 * defectos distintos en un registro del servidor; hacia fuera deben ser indistinguibles.
 */
export type WorkspaceAccessResolution =
  | {
      readonly outcome: 'GRANTED';
      readonly context: WorkspaceAccessContext;
    }
  | { readonly outcome: 'UNAUTHENTICATED' }
  | { readonly outcome: 'IDENTITY_NOT_PROVISIONED' }
  | { readonly outcome: 'IDENTITY_ARCHIVED' }
  | { readonly outcome: 'WORKSPACE_NOT_FOUND' }
  | { readonly outcome: 'NO_ACTIVE_MEMBERSHIP' };
