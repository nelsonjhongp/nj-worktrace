import type { WorkspaceAccessContext } from '../access/workspace-access-context';
import type { AuthorizationDecision } from './authorization-decision';
import type { CapabilitySpec, WorkspaceCapability } from './workspace-capability';

/**
 * Matriz rol → capacidad, como **dato exhaustivo**.
 *
 * Es un `Record<WorkspaceCapability, CapabilitySpec>` y no una cadena de condicionales por dos
 * motivos:
 *
 * - TypeScript falla la compilación si se añade una capacidad al catálogo sin su fila aquí. El
 *   catálogo y la matriz no pueden desincronizarse.
 * - `review.submit` y `request.create` están **denegadas para OWNER** y permitidas para CLIENT
 *   (`ROLES-AND-PERMISSIONS.md` §8; §7.2 «Enviar una revisión en nombre del cliente»). Cualquier
 *   implementación con un atajo `if (role === 'OWNER') return ALLOWED` sería incorrecta, y como
 *   datos la asimetría se lee de un vistazo en vez de esconderse en el orden de unos `if`.
 *
 * Cada fila cita el documento que la justifica. Cambiar una fila sin cambiar el documento es un
 * defecto (`AGENTS.md` §3.1).
 */
const CAPABILITY_MATRIX: Record<WorkspaceCapability, CapabilitySpec> = {
  // ROLES §5 fila `workspaces`: el CLIENT lee nombre y zona del suyo; los demás roles también.
  'workspace.read': {
    effect: 'READ',
    roles: ['OWNER', 'MEMBER', 'CLIENT', 'VIEWER'],
  },
  // ROLES §8 «Cambiar zona horaria del workspace»; §5 `U D` solo para OWNER.
  'workspace.manage': {
    effect: 'MUTATION',
    roles: ['OWNER'],
  },
  // ROLES §4.1 clase DE_SISTEMA y §7.1 «Ver quién más es miembro» (K-24, resuelta en §12.2).
  'membership.read': {
    effect: 'READ',
    roles: ['OWNER'],
  },
  // ROLES §8 «Invitar / quitar miembro» y «Cambiar rol de miembro».
  'membership.manage': {
    effect: 'MUTATION',
    roles: ['OWNER'],
  },
  // ROLES §8 «Leer auditoría»; §5 fila `audit_events`.
  'audit.read': {
    effect: 'READ',
    roles: ['OWNER'],
  },
  // ROLES §8 filas de sesión de trabajo, ajuste de tiempo, item de ciclo y evidencia.
  'work.record': {
    effect: 'MUTATION',
    roles: ['OWNER', 'MEMBER'],
  },
  // ROLES §8 «Cambiar visibility», «Publicar / despublicar», «Abrir ciclo / … / reabrirlo».
  'publication.manage': {
    effect: 'MUTATION',
    roles: ['OWNER'],
  },
  // ROLES §8 «Comentar en hilo accesible» y «Proponer punto de agenda»: ✔ ✔ ✔ ✖ en ambas.
  'collaboration.participate': {
    effect: 'MUTATION',
    roles: ['OWNER', 'MEMBER', 'CLIENT'],
  },
  // ADR-003: la cola del cliente es suya. Separada de `collaboration.participate` (K-25, §12.2).
  'request.create': {
    effect: 'MUTATION',
    roles: ['CLIENT'],
  },
  // ROLES §8 «Triar solicitud».
  'request.triage': {
    effect: 'MUTATION',
    roles: ['OWNER'],
  },
  // ROLES §8 «Confirmar lectura / aprobar / pedir cambios»: ✖ ✖ ✔ ✖. La revisión es del cliente.
  'review.submit': {
    effect: 'MUTATION',
    roles: ['CLIENT'],
  },
};

/**
 * Decide si un contexto de acceso ya resuelto puede ejecutar una capacidad.
 *
 * Función **pura y síncrona**: sin base de datos, sin Better Auth, sin Next.js, sin `Response`,
 * sin `Headers`, sin registro y sin dependencias externas. Que lo sea es lo que permite probar
 * las 88 celdas de la matriz sin levantar nada (`ADR-008`).
 *
 * Precedencia — **el rol antes del archivado**, y el orden importa: si el archivado se evaluara
 * primero, un CLIENT que intenta `publication.manage` en un workspace archivado recibiría
 * `DENIED_ARCHIVED`, informándole de que su rol *sí* tendría la capacidad en un workspace
 * activo. Es un oráculo pequeño y gratuito de cerrar.
 *
 * La regla del workspace archivado es **general**, no una condición repetida por capacidad:
 * repetirla serían once oportunidades de olvidarla (`ADR-005` T5-R12).
 */
export function decideWorkspaceAction(
  context: WorkspaceAccessContext,
  capability: WorkspaceCapability,
): AuthorizationDecision {
  const spec = CAPABILITY_MATRIX[capability];

  if (!spec.roles.includes(context.role)) {
    return { outcome: 'DENIED_ROLE' };
  }

  if (context.workspaceStatus === 'ARCHIVED' && spec.effect === 'MUTATION') {
    return { outcome: 'DENIED_ARCHIVED' };
  }

  return { outcome: 'ALLOWED' };
}

/**
 * Forma booleana de la misma decisión, **delegada** y nunca reimplementada.
 *
 * Existe para que, cuando llegue la interfaz, ocultar un control no obligue a inventar un
 * segundo motor. Ocultar un control no es un punto de aplicación
 * (`ROLES-AND-PERMISSIONS.md` §10): el punto de aplicación sigue siendo el servidor.
 */
export function canWorkspace(
  context: WorkspaceAccessContext,
  capability: WorkspaceCapability,
): boolean {
  return decideWorkspaceAction(context, capability).outcome === 'ALLOWED';
}
