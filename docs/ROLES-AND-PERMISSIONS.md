# ROLES AND PERMISSIONS

Modelo de autorización de `nj-worktrace`.

> Revisado en la **iteración 0.1**: clasificación de entidades publicables, acceso derivado a
> proyectos, varios clientes por workspace, revisiones sin filas pendientes y restablecimiento
> administrativo de contraseña.

---

## 1. Principios

1. **El workspace es la frontera dura.** Toda autorización empieza por: *¿existe un
   `workspace_members` activo para (este usuario, este workspace)?* Si no, la respuesta es
   **404, no 403** — no se revela la existencia del recurso. Ver [`ADR-002`](decisions/ADR-002-workspace-boundary.md).
2. **El rol es por workspace, nunca global.** El mismo usuario puede ser `OWNER` en uno y `CLIENT`
   en otro (`OD-11`, cerrada). `(workspace_id, user_id)` es único: un usuario, un rol por workspace.
3. **Denegar por defecto.** Un permiso no listado aquí no existe.
4. **Visibilidad y publicación son filtros, no permisos**, y se aplican **según la clase de la
   entidad** (§4). No toda entidad tiene ambos ejes.
5. **La escritura del cliente nunca toca el registro.** Ver [`ADR-003`](decisions/ADR-003-client-interaction.md).

## 2. Roles

| Rol | Descripción | En MVP |
|---|---|---|
| `OWNER` | Control total del workspace. Registra el trabajo, decide visibilidad y publica. | Sí |
| `MEMBER` | Colabora internamente: registra su propio trabajo, ve lo interno, no gestiona el workspace. | Definido, no implementado |
| `CLIENT` | Externo. Solo lectura sobre lo publicado y visible. Escribe en sus propios canales. | Sí |
| `VIEWER` | Solo lectura interna. No comenta, no solicita. | Definido, no implementado |

Un workspace tiene **al menos un `OWNER`** en todo momento; el último `OWNER` no puede degradarse ni
eliminarse.

### 2.1 Varios clientes por workspace

`OD-02` cerrada. El modelo admite **N miembros con rol `CLIENT`** en un mismo workspace, y un
usuario puede pertenecer a varios workspaces con roles distintos.

Consecuencias que ninguna consulta puede ignorar:

- Nunca se asume "el cliente" en singular. Toda lógica trabaja con el conjunto de miembros `CLIENT`
  activos.
- Las revisiones son **una cadena por cliente** (§7.3). No existe un estado de revisión único del
  ciclo.
- La conversación sobre contenido compartido es **común a todos los clientes** del workspace: si
  dos clientes ven la misma actualización, ven los mismos comentarios.
- Las solicitudes y las revisiones son **de su autor**; su visibilidad entre clientes está sujeta a
  `OD-17`, con un valor por defecto para el MVP definido en §5.

El MVP arranca con un único cliente. Es un dato de configuración, no una premisa del diseño.

## 3. Los cuatro ejes de estado

Independientes. Un mismo `work_item` puede ser `CLIENT_VISIBLE`, `PUBLISHED`, `BLOCKED` y objeto de
una revisión con `CHANGES_REQUESTED` — cuatro hechos distintos.

### 3.1 `visibility` — ¿quién *puede* verlo?

| Valor | Alcance |
|---|---|
| `PRIVATE` | Solo el autor (`created_by`) y los `OWNER` del workspace. |
| `INTERNAL` | `OWNER`, `MEMBER`, `VIEWER`. Nunca `CLIENT`. |
| `CLIENT_VISIBLE` | Además, los `CLIENT` del workspace — sujeto a publicación si la entidad es publicable. |

Por defecto todo se crea `PRIVATE` en workspaces `PERSONAL` e `INTERNAL` en los demás. Elevar a
`CLIENT_VISIBLE` es siempre un acto explícito y auditado.

### 3.2 `publication_state` — ¿el autor lo ha liberado?

| Valor | Significado |
|---|---|
| `DRAFT` | En preparación. Invisible para `CLIENT` sin importar la visibilidad. |
| `PUBLISHED` | Liberado. Combinado con `CLIENT_VISIBLE`, el cliente lo ve. |

**Solo lo llevan las entidades publicables** (§4). Despublicar es posible para el `OWNER` y deja
rastro de auditoría (`OD-04`).

### 3.3 `work_state` — ¿en qué punto está el trabajo? (solo `work_items`)

`BACKLOG` → `READY` → `IN_PROGRESS` → `IN_REVIEW` → `DONE`. Laterales: `BLOCKED`, `CANCELED`.

No dice nada sobre visibilidad. Una tarea `DONE` puede seguir siendo `PRIVATE`.
El estado **por ciclo** se congela en `work_cycle_items.work_state_at_start` / `_at_close`.

### 3.4 `review_state` — ¿qué ha dicho un cliente? (`reviews` sobre `work_cycles`)

| Valor | Significado |
|---|---|
| `ACKNOWLEDGED` | El cliente confirma lectura. No implica conformidad. |
| `APPROVED` | El cliente aprueba el cierre del ciclo. |
| `CHANGES_REQUESTED` | El cliente pide cambios. Comentario obligatorio. |

**`PENDING` no existe como valor.** Una revisión es una respuesta enviada; lo pendiente se deriva
(§7.3). Y la revisión **es informativa**: no cambia `cycle_state` (`OD-03`, cerrada).

## 4. Clases de entidad

La regla `CLIENT_VISIBLE + PUBLISHED` **solo aplica a entidades publicables**. Aplicarla a las demás
carecía de sentido: la mitad no tiene `publication_state`.

| Clase | Entidades | Cómo se decide el acceso |
|---|---|---|
| **Publicable** | `work_cycles`, `work_items`, `daily_updates`, `evidence_items`, `meetings` | `visibility` + `publication_state` |
| **Estructural con visibilidad** | `projects`, `work_sessions` | `visibility`; el `CLIENT` **no** accede directamente (§6) |
| **Estructural derivada** | `discussion_threads`, `discussion_messages`, `evidence_links`, `work_cycle_items`, `daily_update_work_items`, `meeting_agenda_items`, `meeting_attendees`, `work_session_segments` | Se resuelve contra su ancla o su padre |
| **Canal del cliente** | `client_requests`, `reviews` | Autoría + rol |
| **De sistema** | `users`, `auth_sessions`, `workspaces`, `workspace_members`, `audit_events` | Solo `OWNER`, salvo el perfil propio |

### 4.1 Regla de acceso combinada

```
puede_ver(usuario, registro):
  m = miembro_activo(usuario, registro.workspace_id)
  si no m                          -> NO (responder 404)
  si m.role == OWNER               -> SÍ

  segun clase(registro):
    PUBLICABLE:
      CLIENT          -> visibility == CLIENT_VISIBLE Y publication_state == PUBLISHED
      MEMBER, VIEWER  -> visibility != PRIVATE O created_by == usuario

    ESTRUCTURAL_CON_VISIBILIDAD:
      CLIENT          -> NO por acceso directo (§6 y DATA-MODEL §5.3)
      MEMBER, VIEWER  -> visibility != PRIVATE O created_by == usuario

    ESTRUCTURAL_DERIVADA:
      -> puede_ver(usuario, ancla_o_padre(registro))

    CANAL_DEL_CLIENTE:
      CLIENT          -> created_by == usuario        (OD-17)
      MEMBER, VIEWER  -> SÍ (lectura)

    DE_SISTEMA:
      -> solo OWNER, salvo el perfil propio
```

Ver el detalle de evidencias multi-contexto en [`DATA-MODEL.md`](DATA-MODEL.md) §4.12.1: la regla es
**conjuntiva** — contexto accesible **y** evidencia `CLIENT_VISIBLE` + `PUBLISHED`.

## 5. Matriz de permisos

Leyenda: **C** crear · **R** leer · **U** actualizar · **D** borrar · **—** sin acceso
· *(f)* sujeto al filtro de su clase · *(p)* solo registros propios · *(d)* derivado del ancla

| Entidad | Clase | OWNER | MEMBER | CLIENT | VIEWER |
|---|---|---|---|---|---|
| `workspaces` | sistema | R U D | R | R *(nombre y zona; solo el suyo)* | R |
| `workspace_members` | sistema | C R U D | R | — | R |
| `projects` | estructural | C R U D | C R U *(p)* | — *(etiqueta derivada, §6.2)* | R |
| `work_cycles` | **publicable** | C R U D | R | R *(f)* | R |
| `work_cycle_items` | derivada | C R U D | C R U | R *(d)* | R |
| `work_items` | **publicable** | C R U D | C R U *(p)* | R *(f)* | R |
| `work_sessions` | estructural | C R U D | C R U D *(p)* | — *(§6.1)* | R |
| `work_session_segments` | derivada | C R U D | C R U D *(p)* | — | R |
| `daily_updates` | **publicable** | C R U D | C R U *(p)* | R *(f)* | R |
| `daily_update_work_items` | derivada | C R U D | C R U *(p)* | R *(d)* | R |
| `evidence_items` | **publicable** | C R U D | C R U *(p)* | R *(f, §6.3)* | R |
| `evidence_links` | derivada | C R U D | C R U *(p)* | R *(d)* | R |
| `discussion_threads` | derivada | C R U D | C R | C R *(d, en contexto accesible)* | R *(d)* |
| `discussion_messages` | derivada | C R U *(p)* D *(p)* | C R U *(p)* | **C R** U *(p, ventana)* | R *(d)* |
| `client_requests` | canal | R U *(triaje)* | R | **C R** U *(p, mientras `SUBMITTED`)* | R |
| `meetings` | **publicable** | C R U D | C R | R *(f)* | R |
| `meeting_agenda_items` | derivada | C R U D | C R U *(p)* | R *(d)* + **C** *(propuesta)* | R |
| `meeting_attendees` | derivada | C R U D | R | R *(d, solo `is_visible_to_client`)* | R |
| `reviews` | canal | R | R | **C R** *(p)* — **sin U** | R |
| `audit_events` | sistema | R | — | — | — |
| `users` *(perfil propio)* | sistema | R U | R U | R U | R U |

Las cuatro celdas en negrita son **toda** la capacidad de escritura del cliente:
mensajes, solicitudes, revisiones y propuestas de punto de agenda.

**Nota sobre `reviews`:** el cliente tiene `C` y `R`, **no `U`**. Cambiar de respuesta crea una fila
nueva encadenada por `supersedes_review_id` (`DATA-MODEL.md` §4.16.1, regla R14).

**Nota sobre `OD-17`:** por defecto en el MVP, un `CLIENT` ve **sus propias** solicitudes y
revisiones, no las de otros clientes del mismo workspace. Es el valor conservador; si los clientes
representan a una misma organización, probablemente quieran verlas compartidas. Decisión abierta.

## 6. Lo que el cliente ve de forma indirecta

Tres casos en los que el cliente percibe algo sin tener acceso directo. Se documentan porque son las
rutas por las que la información se filtra sin querer.

### 6.1 Horas

El cliente **no lee `work_sessions` ni `work_session_segments`**. Recibe **agregados publicados**:

- Total de horas por `work_cycle` publicado (`hours_snapshot`).
- Total por `work_item` `CLIENT_VISIBLE` + `PUBLISHED`.
- Reparto por `activity_type`, si el propietario lo habilita en el ciclo.

Los agregados se calculan sobre segmentos de sesiones imputadas al ciclo
(`work_sessions.work_cycle_id`) y vinculadas a work items accesibles para el cliente, y solo se
sirven dentro de un ciclo o actualización `PUBLISHED`. **Granularidad y momento de congelado:
`OD-01`.**

### 6.2 Proyectos

El cliente **no tiene listado de proyectos** y no existe ruta `/c/:ws/projects`. El nombre del
proyecto acompaña al contenido accesible **solo si** `projects.visibility = CLIENT_VISIBLE`; en caso
contrario se **omite el campo**, no se sustituye por un marcador. `description` nunca se expone.
Detalle completo y avisos en la publicación: [`DATA-MODEL.md`](DATA-MODEL.md) §5.3.

Principio general (regla R13): **un contenedor no se vuelve visible por contener algo visible.**

### 6.3 Evidencias

Una evidencia puede estar enlazada a varios contextos (`evidence_links`). El cliente la ve **dentro
de un contexto** solo si ese contexto le es accesible **y** la evidencia es `CLIENT_VISIBLE` +
`PUBLISHED`. El índice de evidencias exige además **al menos un enlace a un contexto accesible**,
para que una evidencia publicada pero anclada solo a contenido interno no aparezca huérfana.
Ver [`DATA-MODEL.md`](DATA-MODEL.md) §4.12.1.

## 7. Lo que el cliente **no** puede hacer

### 7.1 Prohibiciones y su mecanismo

| Prohibido | Mecanismo que lo impide |
|---|---|
| Modificar horas del propietario | Sin `U` sobre `work_sessions` / `work_session_segments` |
| Editar sesiones de trabajo | Ídem; ni siquiera lectura directa |
| Alterar evidencias | Sin `C/U/D` sobre `evidence_items` ni `evidence_links` |
| Modificar el backlog | Sin `C/U` sobre `work_items` ni `work_cycle_items`; sus peticiones van a `client_requests` |
| Ver borradores | Filtro `publication_state = PUBLISHED` sobre entidades publicables |
| Ver otros workspaces | Frontera de workspace; 404 |
| Descubrir workspaces por su nombre | Rutas por `public_id` opaco; sin validación global de nombres (`DATA-MODEL.md` §4.3.1) |
| Cambiar permisos o configuración | Sin acceso a `workspace_members` ni a ajustes |
| Ver quién más es miembro | `workspace_members` no legible; asistentes solo si `is_visible_to_client` |
| Cambiar el estado de un ciclo | Una revisión es una entrada, no una transición (`OD-03`) |
| Editar una revisión enviada | Sin `U` sobre `reviews`; encadenamiento append-only |
| Eliminar sus mensajes tras publicarse | Solo edición en ventana corta; ver `OD-06` |

### 7.2 Lo que el propietario tampoco puede hacer

| Prohibido | Motivo |
|---|---|
| Editar o borrar mensajes de otros | La conversación es constancia, no documento negociado |
| Enviar una revisión en nombre del cliente | La revisión es un acto del cliente |
| Actualizar una revisión existente | `reviews` es append-only (R14) |
| Reasignar contenido a otro workspace | La frontera es dura ([`ADR-002`](decisions/ADR-002-workspace-boundary.md) §7) |
| Elevar visibilidad de forma implícita al publicar | Regla R10: la publicación se detiene y pregunta |

### 7.3 Revisiones: pendiente es una condición, no una fila

Publicar un cierre **no crea filas** en `reviews`. Lo pendiente se deriva:

```
revision_pendiente(ciclo, cliente):
      ciclo.publication_state == PUBLISHED
  Y   ciclo.state == IN_REVIEW
  Y   miembro_activo(cliente, ciclo.workspace).role == CLIENT
  Y   no existe reviews(ciclo, cliente)
```

Con varios clientes hay **una cadena por cliente**. El propietario ve el estado de cada uno; no
existe un estado agregado del ciclo. El propietario puede cerrar el ciclo sin ninguna revisión
recibida, y queda constancia en `work_cycles.closed_without_review`.

## 8. Acciones y quién puede ejecutarlas

| Acción | OWNER | MEMBER | CLIENT | VIEWER | Evento de auditoría |
|---|---|---|---|---|---|
| Crear workspace | ✔ *(se vuelve OWNER)* | ✔ | ✖ | ✖ | `workspace.created` |
| Invitar / quitar miembro | ✔ | ✖ | ✖ | ✖ | `member.added` / `member.removed` |
| Cambiar rol de miembro | ✔ | ✖ | ✖ | ✖ | `member.role_changed` |
| Cambiar zona horaria del workspace | ✔ | ✖ | ✖ | ✖ | `workspace.timezone_changed` |
| Iniciar / pausar / cerrar sesión de trabajo | ✔ | ✔ *(propia)* | ✖ | ✖ | `work_session.*` |
| Cambiar de tarea con sesión activa | ✔ | ✔ *(propia)* | ✖ | ✖ | `work_session.switched` *(atómico)* |
| Editar tiempo ya registrado | ✔ | ✔ *(propia)* | ✖ | ✖ | `work_session.time_adjusted` |
| Añadir item a un ciclo / arrastrarlo | ✔ | ✔ | ✖ | ✖ | `work_cycle_item.added` / `.carried_over` |
| Enlazar evidencia a un contexto | ✔ | ✔ *(propia)* | ✖ | ✖ | `evidence.linked` / `evidence.unlinked` |
| Cambiar `visibility` | ✔ | ✖ | ✖ | ✖ | `visibility.changed` |
| Publicar / despublicar | ✔ | ✖ | ✖ | ✖ | `publication.changed` |
| Abrir ciclo / activarlo / cerrarlo / reabrirlo | ✔ | ✖ | ✖ | ✖ | `work_cycle.state_changed` |
| Comentar en hilo accesible | ✔ | ✔ | ✔ | ✖ | `discussion.message_created` |
| Marcar hilo como resuelto | ✔ | ✖ | ✖ | ✖ | `discussion.thread_resolved` |
| Crear solicitud | ✔ | ✔ | ✔ | ✖ | `client_request.created` |
| Triar solicitud | ✔ | ✖ | ✖ | ✖ | `client_request.triaged` |
| Confirmar lectura / aprobar / pedir cambios | ✖ | ✖ | ✔ | ✖ | `review.submitted` |
| Registrar reunión y decisiones | ✔ | ✔ | ✖ | ✖ | `meeting.*` |
| Proponer punto de agenda | ✔ | ✔ | ✔ | ✖ | `agenda_item.proposed` |
| Leer auditoría | ✔ | ✖ | ✖ | ✖ | — |

## 9. Sesiones y autenticación (conceptual)

`auth_sessions` es una tabla de sesiones **del lado del servidor**, no un token autocontenido. El
mecanismo concreto se decide en la iteración 1 (`AGENTS.md` §5: nada de JWT en esta fase).

Requisitos conceptuales:

- Una sesión pertenece a un `user`, no a un workspace. El workspace activo es estado de navegación.
- Revocable individualmente y en masa por el usuario.
- Expiración absoluta y por inactividad.
- Cambiar contraseña revoca todas las sesiones salvo la actual.
- `DEMO_MODE` crea sesiones marcadas como tales; ver [`UI-WIREFRAMES.md`](UI-WIREFRAMES.md) §1.

### 9.1 Restablecimiento de contraseña en el MVP

**No hay autoservicio.** No existe *"¿Olvidaste tu contraseña?"*, ni envío de correo, ni enlaces de
un solo uso. La razón es de alcance: el correo no está en el MVP (`OD-09`) y una recuperación por
correo mal hecha es la vía de entrada más común a una cuenta ajena.

Procedimiento del MVP — **restablecimiento administrativo**:

1. El usuario contacta al propietario del producto por un canal externo.
2. El propietario genera un **restablecimiento de un solo uso** desde la administración y lo
   entrega por un canal fuera de banda.
3. El restablecimiento **caduca** y solo sirve una vez.
4. Al usarlo se **revocan todas las sesiones** de ese usuario.
5. Se emite `user.password_reset_issued` y `user.password_reset_used`.

Se retira el enlace del wireframe de inicio de sesión (`UI-WIREFRAMES.md` §1). Cuando se decida
`OD-09`, la recuperación automatizada se replanteará con su propio ADR.

## 10. Puntos de aplicación

Tres capas, las tres obligatorias:

1. **Resolución de workspace** — toda petición resuelve un workspace por su `public_id` y verifica
   pertenencia antes de tocar datos. Sin miembro activo → 404.
2. **Consulta** — todo acceso filtra por `workspace_id` y por la regla de §4.1, **según la clase de
   la entidad**. El filtro vive en la capa de datos, no en la interfaz.
3. **Acción** — cada comando comprueba el permiso de §8 y escribe su `audit_event`.

Ocultar un botón en la interfaz **no es** un punto de aplicación.

## 11. Decisiones abiertas relacionadas

`OD-01` (granularidad de horas publicadas) · `OD-04` (despublicar) · `OD-06` (edición de mensajes) ·
`OD-09` (correo y notificaciones, del que depende la recuperación de contraseña) ·
`OD-17` (visibilidad de solicitudes y revisiones entre clientes del mismo workspace).

Cerradas en la iteración 0.1: `OD-02`, `OD-03`, `OD-07`, `OD-08`, `OD-11`.
