import type { WorkspaceId, WorkspaceRole } from '@/modules/workspaces';
import type { WorkspaceAccessContext } from './workspace-access-context';

/**
 * Alcance obligatorio de toda operación de datos acotada a un workspace (`ADR-005` §3.6,
 * regla T5-R5).
 *
 * Exactamente tres campos, y cada ausencia es deliberada:
 *
 * - **sin `workspaceStatus`**: la escritura ya se bloqueó antes de llegar al repositorio.
 *   Llevarlo invitaría a un segundo punto de imposición del archivado, y una invariante vive en
 *   un solo nivel (`ADR-005` T5-R12).
 * - **sin capacidades**: un repositorio con capacidades es un segundo motor de políticas. Si un
 *   repositorio necesita saber si algo está permitido, la decisión se tomó en el sitio
 *   equivocado (`ADR-001`, la autorización no vive dentro de un módulo de dominio).
 * - **sin transacción**: exigirla obligaría a abrir una transacción para cada lectura, o —peor—
 *   a inventar una transacción nula. `ADR-005` §4 dice que el servicio de aplicación abre la
 *   transacción y la propaga; se compondrá con el scope cuando exista la primera operación real
 *   que la necesite, no antes.
 * - **sin `public_id`, correo, nombre, token ni sesión**: el scope se puede volcar íntegro en un
 *   registro del servidor sin filtrar nada.
 *
 * `role` **sí** está, y no contradice lo anterior: sus consumidores son el filtro de visibilidad,
 * que `ROLES-AND-PERMISSIONS.md` §10 sitúa expresamente en la capa de datos, y
 * `audit_events.actor_role`, que debe congelar el rol del momento del hecho
 * (`DATA-MODEL.md` §4.17) en vez de volver a consultarlo. Filtrar y auditar no es autorizar
 * (`ROLES-AND-PERMISSIONS.md` §1.4).
 *
 * Inmutable y serializable: tres primitivos y ninguna referencia viva.
 */
export type WorkspaceScope = {
  readonly workspaceId: WorkspaceId;
  readonly userId: string;
  readonly role: WorkspaceRole;
};

/**
 * Construye el alcance de datos a partir de un contexto de acceso ya resuelto.
 *
 * No contiene ninguna aserción de tipo: `WorkspaceId` llega ya marcado desde
 * `WorkspaceAccessContext`, y la marca la aplicó el módulo `workspaces` en su frontera de
 * persistencia (`internal/access.ts`), el único punto del árbol donde el identificador procede de
 * PostgreSQL. Esta función solo reencuadra tres campos.
 *
 * **Qué garantiza esa cadena**, con precisión:
 *
 * - una cadena ordinaria —de una ruta, de un cuerpo JSON, de un parámetro de búsqueda— no compila
 *   como `WorkspaceId`, así que no puede llegar por accidente ni al contexto, ni al scope, ni a un
 *   repositorio;
 * - tampoco compila un contexto fabricado a mano con `workspaceId: string`, porque el campo está
 *   marcado en el propio tipo;
 * - la única aserción de tipo que aplica la marca vive en la frontera de persistencia del módulo
 *   `workspaces`, y `tests/module-boundary.test.ts` falla si aparece una segunda.
 *
 * **Qué no garantiza:** nada frente a quien eluda deliberadamente el sistema de tipos con `as`,
 * con `any` o con código sin tipar. Es una comprobación de compilación, no un control de
 * ejecución. La verificación de que cada consulta filtra de verdad por `workspace_id`
 * (`ADR-002` A2) depende de los repositorios de negocio, que no existen todavía.
 *
 * No memoiza y no guarda nada: un scope vive dentro de una petición y muere con ella
 * (`ADR-002` §5).
 */
export function createWorkspaceScope(context: WorkspaceAccessContext): WorkspaceScope {
  return {
    workspaceId: context.workspaceId,
    userId: context.userId,
    role: context.role,
  };
}
