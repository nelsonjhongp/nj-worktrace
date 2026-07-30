/**
 * Salida del motor puro de políticas.
 *
 * No es un `boolean` por dos razones que se pueden comprobar:
 *
 * 1. `DENIED_ROLE` y `DENIED_ARCHIVED` **traducen a respuestas externas distintas**
 *    (`src/platform/http/workspace-authorization-response.ts`): el primero se oculta tras un
 *    404 indistinguible, el segundo se comunica porque quien lo recibe ya tiene membresía
 *    activa y sabe que el workspace existe (`USER-FLOWS.md` F1 A3 y F7). Con un `boolean` la
 *    razón habría que re-derivarla después, y re-derivarla significa una segunda copia de la
 *    regla del archivado.
 * 2. Un `false` no es auditable. `ADR-002` cuenta la auditabilidad entre las consecuencias
 *    positivas de la frontera de workspace.
 *
 * Este archivo no importa nada: es el vocabulario compartido entre el motor puro y el
 * traductor HTTP, y es lo único que `platform/http` necesita conocer de la autorización.
 */
export type AuthorizationDecision =
  | { readonly outcome: 'ALLOWED' }
  | { readonly outcome: 'DENIED_ROLE' }
  | { readonly outcome: 'DENIED_ARCHIVED' };
