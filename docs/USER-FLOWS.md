# USER FLOWS

Catorce flujos. Cada uno documenta: actor, precondiciones, pasos, resultado, permisos, casos
alternativos, errores, eventos de auditoría y decisiones pendientes.

Referencias: [`ROLES-AND-PERMISSIONS.md`](ROLES-AND-PERMISSIONS.md) ·
[`DATA-MODEL.md`](DATA-MODEL.md) · [`UI-WIREFRAMES.md`](UI-WIREFRAMES.md)

---

## Índice

| # | Flujo | Actor |
|---|---|---|
| [F1](#f1--crear-o-seleccionar-workspace) | Crear o seleccionar workspace | OWNER |
| [F2](#f2--seleccionar-proyecto-ciclo-y-funcionalidad) | Seleccionar proyecto, ciclo y funcionalidad | OWNER |
| [F3](#f3--iniciar-pausar-y-finalizar-una-sesión-de-trabajo) | Iniciar, pausar y finalizar sesión de trabajo | OWNER |
| [F4](#f4--registrar-resultado-y-evidencias) | Registrar resultado y evidencias | OWNER |
| [F5](#f5--preparar-y-publicar-una-actualización-diaria) | Preparar y publicar actualización diaria | OWNER |
| [F6](#f6--preparar-el-cierre-semanal) | Preparar el cierre semanal | OWNER |
| [F7](#f7--el-cliente-consulta-la-semana-activa) | Cliente consulta la semana activa | CLIENT |
| [F8](#f8--el-cliente-revisa-actividad-horas-y-evidencias) | Cliente revisa actividad, horas y evidencias | CLIENT |
| [F9](#f9--el-cliente-comenta-o-solicita-aclaración) | Cliente comenta o solicita aclaración | CLIENT |
| [F10](#f10--el-cliente-registra-una-solicitud) | Cliente registra una solicitud | CLIENT |
| [F11](#f11--triaje-de-la-solicitud) | Aceptar, rechazar o planificar la solicitud | OWNER |
| [F12](#f12--consultar-reunión-agenda-y-decisiones) | Consultar reunión, agenda y decisiones | OWNER + CLIENT |
| [F13](#f13--revisión-del-cierre-semanal) | Confirmar lectura, aprobar o pedir cambios | CLIENT |
| [F14](#f14--usar-un-workspace-personal-sin-exponerlo) | Usar workspace personal sin exponerlo | OWNER |

---

## F1 · Crear o seleccionar workspace

**Actor:** `OWNER` (Nelson)

**Precondiciones**
- Usuario autenticado con sesión válida.

**Pasos**
1. Al entrar, la aplicación resuelve el último workspace usado; si no hay ninguno, muestra el
   selector.
2. El usuario abre el conmutador de workspace (siempre visible en la cabecera).
3. Ve solo los workspaces donde tiene `workspace_members.status = ACTIVE`.
4. Selecciona uno → toda la navegación se re-ancla a ese workspace.
5. Alternativamente pulsa **Crear workspace**: nombre, tipo (`PERSONAL` / `CLIENT` / `BUSINESS`),
   **zona horaria IANA** (obligatoria, p. ej. `America/Lima`) y día de inicio de ciclo.
6. Al crear, el sistema añade al creador como `OWNER` `ACTIVE` y fija `default_visibility` según el
   tipo (`PRIVATE` para `PERSONAL`, `INTERNAL` para el resto).

**Resultado**
- Contexto de workspace activo. Todas las consultas posteriores llevan ese `workspace_id`.

**Permisos**
- Listar: solo membresías activas propias.
- Crear: cualquier usuario autenticado; queda `OWNER` del nuevo workspace.
- Un `CLIENT` no ve conmutador si solo pertenece a un workspace: no debe percibir que existen otros.

**Casos alternativos**
- **A1** Sin ningún workspace → estado vacío con una sola acción: *Crear tu primer workspace*.
- **A2** Un solo workspace → se entra directamente, sin selector.
- **A3** Workspace archivado → aparece en una sección "Archivados", solo lectura.
- **A4** Invitación pendiente (`status = INVITED`) → se muestra como tarjeta de aceptación, no como
  workspace navegable.

**Errores**
- Nombre repetido → **no es un error**. El nombre es decorativo y no tiene unicidad global; como
  mucho se avisa de coincidencia entre los workspaces del propio usuario. Nunca se responde *"ese
  nombre ya está en uso"*: sería un oráculo de existencia ([`DATA-MODEL.md`](DATA-MODEL.md) §4.3.1).
- Zona horaria ausente o no IANA (`EST`, `CST`, `PET`…) → bloqueado con la lista de zonas válidas.
- Workspace inexistente o sin membresía → **404**, nunca 403 (no se revela existencia).
- Membresía `SUSPENDED` o `REMOVED` → se expulsa del contexto y se vuelve al selector con aviso.

**Auditoría**
`workspace.created` · `member.added` *(el propio creador)* · `workspace.switched` *(opcional; ver `OD-12`)*

**Notas de la iteración 0.1**
Las rutas usan `workspaces.public_id`, opaco, no el nombre. Un workspace admite **varios miembros
`CLIENT`** y un usuario puede pertenecer a varios workspaces con roles distintos (`OD-02` y `OD-11`
cerradas): el selector nunca asume un cliente único ni un rol global.

**Decisiones pendientes**
Ninguna. `OD-02`, `OD-07` y `OD-11` quedaron cerradas en la iteración 0.1.

---

## F2 · Seleccionar proyecto, ciclo y funcionalidad

**Actor:** `OWNER`

**Precondiciones**
- Workspace activo. Al menos un proyecto (o el proyecto implícito por defecto).

**Pasos**
1. En **Trabajo**, la aplicación preselecciona: proyecto usado por última vez → ciclo `ACTIVE` →
   último work item trabajado.
2. El usuario puede cambiar proyecto; el selector de ciclo se recarga.
3. Elige el ciclo (por defecto el `ACTIVE`; puede consultar `PLANNED` o `CLOSED` en solo lectura).
4. Elige un work item de la lista del ciclo, o crea uno nuevo en línea (título + tipo, nada más).
5. La selección queda fijada como contexto de trabajo y persiste entre sesiones del navegador.

**Resultado**
- Tripleta `(project, work_cycle, work_item)` lista para cronometrar. Cero fricción para F3.

**Permisos**
- `OWNER` y `MEMBER` seleccionan y crean work items. `CLIENT` no entra a esta pantalla.

**Casos alternativos**
- **A1** Sin ciclo `ACTIVE` → banner: *No hay semana activa* + acción *Abrir semana* (crea un ciclo
  desde `cycle_start_weekday`, estado `ACTIVE`).
- **A2** Ciclo `IN_REVIEW` → se puede seguir registrando, con aviso de que el cierre ya se publicó y
  el resumen quedará desactualizado.
- **A3** Ciclo `CLOSED` → solo lectura; iniciar sesión ofrece mover el trabajo al ciclo activo.
- **A4** Un solo proyecto en el workspace → el selector de proyecto se oculta (ver `INFORMATION-ARCHITECTURE.md` §5).
- **A5** Work item creado en línea → hereda `visibility` del ciclo, nace `work_state = IN_PROGRESS`
  y se crea su fila en `work_cycle_items` con `is_planned = false`.
- **A6** Work item ya presente en otro ciclo → **no se duplica**. Se añade una fila nueva en
  `work_cycle_items` para este ciclo, con `carried_from_cycle_id` apuntando al anterior. El item
  conserva identidad, historial, sesiones y evidencias (`OD-08`, cerrada).

**Errores**
- Work item de otro workspace (URL manipulada) → **404**.
- Work item archivado → no seleccionable; se ofrece desarchivar.
- Intento de crear un hijo más visible que su padre → bloqueado con explicación (regla R2).
- Añadir dos veces el mismo item al mismo ciclo → bloqueado: `(work_cycle_id, work_item_id)` es único.

**Auditoría**
`work_cycle.created` *(si A1)* · `work_item.created` · `work_cycle_item.added` ·
`work_cycle_item.carried_over` *(si A6)*

**Decisiones pendientes**
Ninguna. `OD-08` quedó cerrada en la iteración 0.1: la participación vive en `work_cycle_items`
([`DATA-MODEL.md`](DATA-MODEL.md) §4.8).

---

## F3 · Iniciar, pausar y finalizar una sesión de trabajo

**Actor:** `OWNER` (o `MEMBER` sobre su propio trabajo)

**Precondiciones**
- Contexto de F2 resuelto. Ninguna otra sesión `RUNNING` del mismo usuario (invariante R6).

**Pasos**
1. El usuario pulsa **Iniciar**. Puede fijar `activity_type` antes; si no, se usa `DEVELOPMENT`.
2. Se crea `work_sessions` (`state = RUNNING`) y un `work_session_segments` abierto.
3. El work item pasa a `work_state = IN_PROGRESS` si estaba en `BACKLOG` o `READY`.
4. **Pausar** → se cierra el segmento abierto con `ended_at` y `duration_seconds`; sesión a `PAUSED`.
5. **Reanudar** → se abre un segmento nuevo; sesión a `RUNNING`.
6. **Finalizar** → se cierra el segmento abierto, la sesión pasa a `COMPLETED`, `ended_at` se fija y
   se solicita el resultado (continúa en F4).

**Resultado**
- Sesión completada con segmentos que suman el tiempo efectivo.
  **Duración = Σ segmentos**, nunca `ended_at − started_at`.

**Permisos**
- Solo `OWNER` y `MEMBER`. `CLIENT` no tiene acceso de lectura ni escritura a sesiones.

**Casos alternativos**
- **A1** Cambio de tarea sin parar → *Cambiar a otro item*: finaliza la actual y arranca otra en un
  paso, pidiendo el resultado de la anterior.
- **A2** Ya hay una sesión `RUNNING` (otra pestaña, otro dispositivo) → **se pide confirmación
  antes de tocar nada**:

  > *Tienes "Callback OAuth" en curso desde las 11:05. Se pausará para iniciar "Login SSO".*
  > `[Pausar y continuar]` · `[Cancelar]`

  **Nunca se pausa automáticamente.** Al confirmar, la pausa de la anterior y el arranque de la
  nueva ocurren en **una sola operación atómica**: o se aplican ambas o ninguna. No puede existir un
  estado intermedio con las dos pausadas, ni con las dos corriendo. Si la operación falla, la sesión
  original sigue corriendo y se informa del fallo.
- **A3** Entrada manual → alta de sesión con `is_manual_entry = true` y un único segmento con
  inicio/fin declarados. Requiere que no se solape con otras sesiones propias.
- **A4** Sesión abandonada (`RUNNING` más de N horas, sugerido 8) → al volver, la aplicación
  pregunta: recortar hasta la última actividad conocida, introducir el fin real, o descartar
  (`DISCARDED`). **Nunca decide sola.**
- **A5** Corrección de tiempo posterior → editar segmentos exige `adjustment_reason`.
- **A6** Cierre del navegador → el segmento sigue abierto en servidor; se recupera al volver. El
  cronómetro se deriva del servidor, no del cliente.

**Errores**
- Iniciar sobre un work item archivado o `CANCELED` → rechazado.
- Pausar una sesión ya `PAUSED` → operación idempotente, sin error.
- Segmentos solapados en entrada manual → error de validación indicando el conflicto.
- Desfase de reloj cliente/servidor → **el servidor es la autoridad** para todas las marcas.

**Auditoría**
`work_session.started` · `work_session.paused` · `work_session.resumed` · `work_session.completed` ·
`work_session.discarded` · `work_session.switched` *(A2, un solo evento para la operación atómica)* ·
`work_session.time_adjusted` *(con `before`/`after`)* · `work_item.state_changed`

**Notas de la iteración 0.1**
El día y el ciclo a los que se imputa la sesión se calculan en `workspaces.timezone`, no en la zona
del usuario (`OD-07`, cerrada). Trabajar de viaje no reasigna el trabajo a otro día.

**Decisiones pendientes**
`OD-01` (agregación de horas publicadas)

---

## F4 · Registrar resultado y evidencias

**Actor:** `OWNER`

**Precondiciones**
- Sesión recién finalizada, o work item seleccionado.

**Pasos**
1. Al finalizar (F3.6) se pide `outcome_note`: qué quedó hecho. Campo obligatorio salvo descarte.
2. Se ofrece adjuntar evidencias: tipo (`COMMIT`, `PULL_REQUEST`, `TEST_RUN`, `EXPERIMENT`,
   `DOCUMENT`, `LINK`, `SCREENSHOT`, `NOTE`), título, URL o referencia.
3. Cada evidencia se **enlaza** a uno o varios contextos a la vez — sesión, work item, actualización,
   ciclo, reunión o solicitud — mediante `evidence_links`. **Una sola evidencia, varios enlaces:**
   no se duplica el registro ([`DATA-MODEL.md`](DATA-MODEL.md) §4.12).
4. Se puede actualizar el `work_state` del work item en el mismo paso (→ `IN_REVIEW`, `DONE`, `BLOCKED`).
5. La evidencia tiene **visibilidad y publicación propias**, sugeridas a partir del contexto donde se
   creó. Un enlace **nunca** eleva nada: ni la evidencia ni el contexto (regla R12).

**Resultado**
- Sesión con resultado escrito y evidencia enlazada, lista para alimentar la actualización diaria.

**Permisos**
- `OWNER` y `MEMBER` (sobre lo propio). El `CLIENT` **nunca** crea ni modifica evidencias.

**Casos alternativos**
- **A1** Sin evidencia disponible → se permite guardar solo con `outcome_note`. No se bloquea.
- **A2** Evidencia añadida más tarde → desde el detalle del work item, la sesión o la actualización.
- **A3** Varios commits → alta múltiple pegando varias URLs; una evidencia por línea.
- **A4** Resultado negativo (no funcionó) → es un resultado válido; se anima a registrarlo, tipo
  `EXPERIMENT` o `RESEARCH`.
- **A5** Evidencia ya existente reutilizada en otro contexto → se **enlaza**, no se copia. Aparece
  en ambos sitios como el mismo registro, con una `note` distinta por enlace si conviene.
- **A6** Enlace retirado → desaparece de ese contexto pero la evidencia sigue existiendo en los
  demás. Retirar el último enlace la deja sin contexto: se avisa antes de hacerlo.

**Errores**
- URL malformada → aviso, no bloqueo: se guarda como `NOTE` si el usuario insiste.
- Enlace duplicado sobre el mismo contexto → bloqueado:
  `(evidence_item_id, context_type, context_id)` es único.
- Enlazar una evidencia a un contexto de otro workspace → **404**.
- El sistema **no** verifica que la URL exista ni que el commit sea real. No hay integración.

> Una evidencia **no** queda bloqueada por ser más visible que alguno de sus contextos: puede estar
> enlazada a una sesión interna y a una actualización publicada a la vez. Lo que se comprueba es el
> **momento de publicar** el contexto (regla R10) y el **momento de mostrarla**, con la regla
> conjuntiva de [`DATA-MODEL.md`](DATA-MODEL.md) §4.12.1.

**Auditoría**
`work_session.outcome_recorded` · `evidence.created` · `evidence.linked` · `evidence.unlinked` ·
`evidence.visibility_changed` · `work_item.state_changed`

**Decisiones pendientes**
`OD-05` (¿subida de archivos o solo enlaces?)

---

## F5 · Preparar y publicar una actualización diaria

**Actor:** `OWNER`

**Precondiciones**
- Ciclo `ACTIVE`. Idealmente, alguna sesión completada ese día.

**Pasos**
1. En **Actualizaciones**, el usuario abre la del día (se crea `DRAFT` automáticamente al entrar).
2. La aplicación **presiembra** el borrador con: work items trabajados hoy (filas en
   `daily_update_work_items`), `outcome_note` de cada sesión, evidencias enlazadas ese día y el
   total de horas del día — calculado en la zona del workspace. Todo editable.
3. El usuario redacta `summary`, y opcionalmente `blockers` y `next_steps`.
4. Marca qué work items enlazados serán `CLIENT_VISIBLE`, y qué evidencias acompañan. Cada fila de
   `daily_update_work_items` admite una `note` propia para matizar ese item ese día.
5. Pulsa **Vista previa como cliente** — pantalla obligatoria antes de publicar, que muestra
   exactamente lo que verá el `CLIENT`.
6. Pulsa **Publicar**: `visibility = CLIENT_VISIBLE`, `publication_state = PUBLISHED`,
   `published_at` fijado, `hours_summary` congelado.

**Resultado**
- Actualización visible para el cliente. El borrador previo deja de existir como tal, pero el
  historial de auditoría conserva la transición.

**Permisos**
- Solo `OWNER` publica. `MEMBER` redacta borradores propios.

**Casos alternativos**
- **A1** Día sin trabajo → se permite publicar una actualización explicando la ausencia. Preferible
  al silencio.
- **A2** Publicar en diferido (redactar hoy, publicar mañana) → permitido; `update_date` no cambia.
- **A3** Actualización que agrupa varios días → no soportado; una por día. Para resúmenes, F6.
- **A4** Editar una publicada → permitido para el `OWNER`; se marca *Editado* con fecha visible para
  el cliente. Sujeto a `OD-04`.
- **A5** Despublicar → sujeto a `OD-04`. Provisionalmente: permitido, auditado y con aviso de que el
  cliente ya pudo haberla leído.

**Errores**
- Publicar con work items **o evidencias** enlazados que son `INTERNAL` o `DRAFT` → **se detiene la
  publicación** y se listan los elementos en conflicto con la opción de elevarlos o desenlazarlos.
  Nunca se eleva en silencio (regla R10).
- Publicar sin `summary` → bloqueado.
- Ya existe una actualización publicada para ese día y autor → se edita la existente.

> **Aviso, no error — nombre del proyecto.** Si el proyecto que contiene la actualización es
> `INTERNAL`, la vista previa avisa de que su nombre **no se mostrará** al cliente y ofrece
> elevarlo. La publicación continúa igualmente: el contenido se muestra sin etiqueta de proyecto.
> Un contenedor no se vuelve visible por contener algo visible ([`DATA-MODEL.md`](DATA-MODEL.md) §5.3,
> regla R13).

**Auditoría**
`daily_update.created` · `daily_update.published` · `daily_update.unpublished` ·
`daily_update.edited_after_publish` · `visibility.changed` *(por cada item elevado)*

**Decisiones pendientes**
`OD-01` (qué horas se publican) · `OD-04` (edición y despublicación) · `OD-09` (¿se notifica al cliente?)

---

## F6 · Preparar el cierre semanal

**Actor:** `OWNER`

**Precondiciones**
- Ciclo `ACTIVE`. Sin sesiones `RUNNING` ni `PAUSED` dentro del ciclo (regla R9).

**Pasos**
1. En el ciclo activo, **Preparar cierre**.
2. La aplicación compone un borrador: objetivo declarado vs. resultado, work items por `work_state`,
   horas agregadas por item y por `activity_type`, evidencias destacadas, actualizaciones diarias
   publicadas, bloqueos abiertos y solicitudes del cliente resueltas en el ciclo.
3. El usuario escribe `closing_summary` y ajusta qué se comparte.
4. **Vista previa como cliente** (obligatoria).
5. **Publicar cierre**: el ciclo pasa a `IN_REVIEW`, `publication_state = PUBLISHED` y
   `hours_snapshot` queda congelado. Además se rellena `work_state_at_close` en cada fila de
   `work_cycle_items`, para que el cierre consultado meses después muestre el estado de entonces y
   no el actual.
   **No se crea ninguna fila en `reviews`.** Lo pendiente de cada cliente se **deriva**
   ([`ROLES-AND-PERMISSIONS.md`](ROLES-AND-PERMISSIONS.md) §7.3): ciclo publicado + `IN_REVIEW` +
   cliente activo + ausencia de revisión suya.
6. Opcionalmente se crea el siguiente ciclo en `PLANNED`. Lo no terminado se **arrastra sin
   duplicar**: una fila nueva en `work_cycle_items` del ciclo destino, con `carried_from_cycle_id`
   apuntando al de origen y `work_state_at_start` copiado del cierre anterior.

**Resultado**
- Ciclo en `IN_REVIEW`, cierre publicado, revisión pendiente **por derivación** para cada cliente
  activo. Continúa en F13.

**Permisos**
- Solo `OWNER`.

**Casos alternativos**
- **A1** Trabajo sin terminar → se marca explícitamente como arrastrado, no se oculta.
- **A2** Sin miembros `CLIENT` en el workspace (`PERSONAL`, `BUSINESS`) → se cierra directamente a
  `CLOSED`, sin `IN_REVIEW` ni revisiones.
- **A3** Cierre tardío (varios días después) → permitido; `closed_at` refleja la realidad, `ends_on`
  no se altera.
- **A4** Reapertura tras `CHANGES_REQUESTED` → **decisión del propietario, nunca automática**
  (`OD-03`, cerrada). El ciclo vuelve a `ACTIVE`; al republicar el cierre, cada cliente vuelve a
  quedar pendiente por derivación y su respuesta nueva encadena a la anterior.
- **A5** Cerrar sin haber recibido revisión → permitido. El ciclo pasa a `CLOSED` con
  `closed_without_review = true`, y así consta para ambas partes. No se bloquea el trabajo del
  propietario esperando a un cliente que no responde.
- **A6** Varios clientes con respuestas distintas (uno aprueba, otro pide cambios) → ambas cadenas
  conviven. **No hay estado agregado**: el propietario ve la respuesta de cada cliente y decide.

**Errores**
- Sesiones abiertas en el ciclo → bloqueado, con la lista y la acción de cerrarlas.
- Ciclo ya `CLOSED` → no se puede volver a publicar el cierre.
- Sin `closing_summary` → bloqueado.
- Sin ninguna actualización diaria publicada → aviso, no bloqueo.

**Auditoría**
`work_cycle.state_changed` · `work_cycle.closing_published` · `work_cycle.hours_snapshot_frozen` ·
`work_cycle_item.closed_state_recorded` · `work_cycle.closed_without_review` *(si A5)* ·
`work_cycle.created` · `work_cycle_item.carried_over` *(el siguiente ciclo)*

`review.requested` **se ha eliminado**: publicar un cierre ya no escribe nada en `reviews`.

**Decisiones pendientes**
`OD-01` (agregación de horas) · `OD-04` (despublicar un cierre ya leído)

---

## F7 · El cliente consulta la semana activa

**Actor:** `CLIENT` (Sotravil)

**Precondiciones**
- Sesión válida. Membresía `ACTIVE` con rol `CLIENT` en al menos un workspace.

**Pasos**
1. Al iniciar sesión, entra directamente a **Resumen**. Si pertenece a un solo workspace, no hay
   selector.
2. Ve el ciclo actual: etiqueta, fechas, estado, **objetivo**.
3. Ve el pulso: horas publicadas del ciclo, funcionalidades por estado, últimas actualizaciones.
4. Ve sus pendientes: solicitudes sin resolver, aclaraciones sin responder, revisión pendiente.
5. Navega a **Actividad**, **Funcionalidades**, **Evidencias**, **Reuniones** o **Solicitudes**.

**Resultado**
- El cliente sabe en 10 segundos: qué se persigue esta semana, cuánto se ha invertido y qué le toca a él.

**Permisos**
- Lectura sujeta a `visibility = CLIENT_VISIBLE` **y** `publication_state = PUBLISHED`.
- Las horas llegan **agregadas**; nunca hay acceso a `work_sessions`.

**Casos alternativos**
- **A1** Sin ciclo activo publicado → estado vacío honesto: *Aún no hay una semana publicada.*
  Sin inventar contenido ni mostrar el último ciclo como si fuera actual.
- **A2** Ciclo activo sin actualizaciones publicadas todavía → se muestra objetivo y estructura, con
  el bloque de actividad vacío.
- **A3** Ciclo en `IN_REVIEW` → banner destacado: *Cierre publicado, pendiente de tu revisión* → F13.
  El banner aparece **por derivación**, no porque exista una fila pendiente.
- **A4** Cliente en varios workspaces (`OD-02`, cerrada) → aparece un selector mínimo en la
  cabecera, con los workspaces donde tiene membresía activa y nada más. El mismo usuario puede ser
  `OWNER` en uno y `CLIENT` en otro: al cambiar, cambia la aplicación entera, incluidas las
  secciones disponibles.
- **A5** Varios clientes en el mismo workspace (`OD-02`, cerrada) → todos ven el mismo contenido
  publicado y la misma conversación. Cada uno tiene **su propia** revisión pendiente.

**Errores**
- Membresía revocada → cierre de sesión con mensaje neutro. Sin detalles del workspace.
- URL de un recurso `DRAFT` o `INTERNAL` (adivinada o antigua) → **404**, no 403.
- Workspace archivado → solo lectura con aviso.

**Auditoría**
`client.viewed_cycle` *(acceso del cliente a contenido publicado; ver criterio E3)*

**Decisiones pendientes**
`OD-09` (notificaciones) · `OD-12` (volumen y retención de eventos de acceso) ·
`OD-17` (si un cliente ve las solicitudes y revisiones de otros clientes del mismo workspace)

---

## F8 · El cliente revisa actividad, horas y evidencias

**Actor:** `CLIENT`

**Precondiciones**
- Existe contenido publicado y `CLIENT_VISIBLE` en el ciclo.

**Pasos**
1. **Actividad** → lista cronológica de actualizaciones diarias publicadas: resumen, bloqueos,
   siguientes pasos, horas del día, funcionalidades tocadas.
2. **Funcionalidades** → work items visibles con su `work_state`, agrupados por estado; el detalle
   muestra descripción, horas acumuladas, evidencias y el hilo asociado.
3. **Actividad → Evidencias** (pestaña, no sección propia — `K-02` confirmada) → índice de las
   evidencias accesibles del ciclo, filtrable por tipo, con enlace externo. Cada entrada muestra
   **desde qué contextos** está enlazada, para que la evidencia nunca aparezca sin razón.
4. Cada elemento indica su fecha de publicación y si fue editado después.

Las evidencias siguen apareciendo **en su sitio**: dentro de cada actualización, cada funcionalidad
y el cierre del ciclo. El índice es un atajo de auditoría, no la vía principal.

**Resultado**
- El cliente puede reconstruir qué se hizo y comprobarlo por su cuenta.

**Permisos**
- Solo lectura. Sin acceso a sesiones, segmentos, borradores, backlog interno ni miembros.

**Casos alternativos**
- **A1** Evidencia externa que exige credenciales (repo privado) → se muestra el enlace y se
  advierte que puede requerir acceso propio. La aplicación no proxifica ni almacena credenciales.
- **A2** Funcionalidad `BLOCKED` → el motivo se muestra si está publicado; si no, solo el estado.
- **A3** Cero evidencias en el ciclo → estado vacío explicando que aún no se han publicado.
- **A4** Horas ocultas por decisión del ciclo → se muestra la actividad sin la columna de horas, sin
  huecos que sugieran ocultación deliberada de partes.
- **A5** Evidencia enlazada a varios contextos → se muestra **una sola vez por contexto accesible**,
  con la `note` de ese enlace. Es el mismo registro, no copias: abrirla desde la actualización o
  desde la funcionalidad lleva al mismo sitio.
- **A6** Proyecto `INTERNAL` → el contenido se muestra **sin etiqueta de proyecto**. No se sustituye
  por *"(privado)"* ni por un hueco: el campo simplemente no está.

**Errores**
- Enlace externo roto → error del destino, no de la aplicación. Se muestra tal cual.
- Item retirado de visibilidad tras haber sido visto → desaparece de las listas; un enlace directo
  devuelve **404**. Se audita la retirada.
- Evidencia publicada pero enlazada solo a contexto interno → **no aparece** en el índice. La regla
  es conjuntiva: hace falta al menos un enlace a un contexto accesible
  ([`DATA-MODEL.md`](DATA-MODEL.md) §4.12.1).

**Auditoría**
`client.viewed_update` · `client.viewed_work_item` · `client.opened_evidence`

**Decisiones pendientes**
`OD-01` (granularidad de horas) · `OD-05` (evidencias alojadas vs. enlazadas)

---

## F9 · El cliente comenta o solicita aclaración

**Actor:** `CLIENT`

**Precondiciones**
- Contenido visible y publicado en cuyo contexto comentar.

**Pasos**
1. Desde una actualización, un ciclo, una funcionalidad, una reunión o **una de sus solicitudes**,
   pulsa **Comentar**.
2. Si no existe hilo para ese contexto, se crea. El hilo **no almacena visibilidad**: su
   accesibilidad se resuelve contra el ancla en cada consulta
   ([`DATA-MODEL.md`](DATA-MODEL.md) §4.13).
3. Escribe el mensaje. Puede marcar **Es una solicitud de aclaración**
   (`is_clarification_request = true`).
4. Al publicarse, el mensaje es visible para `OWNER` y `MEMBER` del workspace.
5. Las aclaraciones aparecen como pendiente destacado para el `OWNER` hasta responderse; la
   respuesta las enlaza vía `answered_by_message_id`.

**Resultado**
- Conversación anclada al contexto exacto. Sin hilos sueltos ni canal paralelo.

**Permisos**
- El `CLIENT` crea hilos y mensajes **solo** en contextos que ya puede ver.
- Edición de mensaje propio en ventana corta; borrado lógico. Ver `OD-06`.
- El `CLIENT` no puede marcar un hilo como resuelto: eso es del `OWNER`.
- El `OWNER` **no puede editar ni borrar** mensajes ajenos.

**Casos alternativos**
- **A1** Comentario sobre algo despublicado entretanto → el hilo se conserva pero deja de ser
  accesible para el cliente **de inmediato**, porque la accesibilidad se resuelve contra el ancla en
  cada consulta. No se borra ni se recalcula nada.
- **A2** Aclaración que en realidad es una petición de trabajo → el `OWNER` la convierte en
  `client_requests`, y la solicitud guarda `origin_thread_id` apuntando al hilo del que nació. La
  conversación **sobre la solicitud** será un hilo propio anclado a ella
  (`context_type = CLIENT_REQUEST`).
- **A3** Hilo largo → sin límite; se pagina. Sin tiempo real (fuera de alcance).
- **A4** Varios clientes en el workspace → un hilo sobre contenido compartido es común a todos:
  cada cliente ve los mensajes de los demás. Los hilos anclados a una solicitud siguen la
  visibilidad de esa solicitud (`OD-17`).

**Errores**
- Mensaje vacío → bloqueado.
- Contexto inexistente o invisible → **404**.
- HTML en el cuerpo → se escapa. Solo markdown restringido.

**Auditoría**
`discussion.thread_created` · `discussion.message_created` · `discussion.clarification_requested` ·
`discussion.clarification_answered` · `discussion.message_edited`

**Decisiones pendientes**
`OD-06` (edición/borrado de mensajes) · `OD-09` (notificación al `OWNER`)

---

## F10 · El cliente registra una solicitud

**Actor:** `CLIENT`

**Precondiciones**
- Membresía `ACTIVE` con rol `CLIENT`.

**Pasos**
1. En **Solicitudes** → **Nueva solicitud**.
2. Rellena título, descripción y prioridad declarada (`LOW`…`URGENT`).
3. Envía. Se crea `client_requests` en `SUBMITTED`.
4. Ve su solicitud en la lista con estado y, cuando la haya, la respuesta del propietario.
5. Puede conversar sobre ella en un **hilo anclado a la propia solicitud**
   (`context_type = CLIENT_REQUEST`). La solicitud es un contexto de conversación de pleno derecho,
   como un ciclo o una actualización: no queda como una conversación suelta.

**Resultado**
- Petición en cola propia. **El backlog interno no se ha tocado.** Continúa en F11.

**Permisos**
- El `CLIENT` crea y consulta las suyas; puede retirarlas (`WITHDRAWN`) mientras estén `SUBMITTED`.
- El `CLIENT` **no** asigna ciclo, ni estado, ni crea work items.
- `declared_priority` es informativa: no reordena nada automáticamente.

**Casos alternativos**
- **A1** Solicitud duplicada → el `OWNER` la rechaza referenciando la original en `resolution_note`.
- **A2** Solicitud urgente → se destaca en la bandeja del `OWNER`, pero no altera el ciclo activo.
- **A3** Solicitud que nace de un comentario → guarda `origin_thread_id` con el hilo de procedencia.
  Su conversación propia es un hilo distinto, anclado a la solicitud.
- **A4** Cliente que edita su solicitud → permitido mientras esté `SUBMITTED`; después, solo
  comentar en el hilo de la solicitud.
- **A5** Varios clientes en el workspace → por defecto en el MVP, cada cliente ve **solo sus
  propias** solicitudes. Sujeto a `OD-17`.

**Errores**
- Título vacío → bloqueado.
- Retirar una ya `ACCEPTED` o `PLANNED` → rechazado; se ofrece comentar en su lugar.

**Auditoría**
`client_request.created` · `client_request.updated` · `client_request.withdrawn` ·
`discussion.thread_created` *(al abrir la conversación de la solicitud)*

**Decisiones pendientes**
`OD-09` (aviso al `OWNER`) · `OD-10` (límite de solicitudes abiertas y política de conversión) ·
`OD-17` (visibilidad entre clientes)

---

## F11 · Triaje de la solicitud

**Actor:** `OWNER`

**Precondiciones**
- Existe una `client_requests` en `SUBMITTED`.

**Pasos**
1. En **Inicio** o en la bandeja de solicitudes, el `OWNER` abre la petición.
2. La pasa a `UNDER_REVIEW` (opcional; hacerlo comunica que la está mirando).
3. Decide:
   - **Aceptar** → `ACCEPTED`; opcionalmente crea un `work_item` nuevo y la enlaza.
   - **Planificar** → `PLANNED` con `target_work_cycle_id`; exige work item creado.
   - **Rechazar** → `REJECTED` con `resolution_note` **obligatoria**.
4. La resolución se hace visible al cliente inmediatamente.

**Resultado**
- Toda solicitud tiene resolución explícita (criterio E5). Nada queda en el limbo.

**Permisos**
- Solo `OWNER` tría. El `MEMBER` lee.
- Convertir **crea** un work item nuevo; nunca modifica uno existente
  (ver [`ADR-003`](decisions/ADR-003-client-interaction.md)).

**Casos alternativos**
- **A1** Aceptada pero sin fecha → se queda en `ACCEPTED` con work item en `BACKLOG`. Estado honesto:
  *aceptada, no planificada*.
- **A2** Planificada y luego despriorizada → vuelve a `ACCEPTED` con nota. Se audita.
- **A3** Solicitud que resulta ser un bug → se convierte en un work item `BUG`.
- **A4** El work item derivado se completa → la solicitud se muestra como entregada al cliente,
  enlazada al work item y a sus evidencias.

**Errores**
- Rechazo sin `resolution_note` → bloqueado. Nunca se rechaza en silencio.
- Planificar sobre un ciclo `CLOSED` → rechazado.
- Convertir dos veces la misma solicitud → bloqueado; `converted_work_item_id` es único.

**Auditoría**
`client_request.triaged` · `client_request.state_changed` · `client_request.converted` ·
`work_item.created`

**Decisiones pendientes**
`OD-10` (¿el work item derivado nace `CLIENT_VISIBLE` automáticamente?)

---

## F12 · Consultar reunión, agenda y decisiones

**Actores:** `OWNER` (escribe) y `CLIENT` (lee y propone puntos)

**Precondiciones**
- Reunión creada por el `OWNER`, `CLIENT_VISIBLE` y publicada si debe verla el cliente.

**Pasos (OWNER)**
1. Crea la reunión: título, fecha/hora previstas, asistentes, ciclo asociado.
2. Añade puntos de agenda; acepta o difiere los propuestos por el cliente.
3. Tras la reunión: `state = HELD`, y rellena `notes`, **`decisions`** y `next_steps`.
4. Publica. Puede convertir siguientes pasos en work items.

**Pasos (CLIENT)**
1. En **Reuniones** ve las próximas y las pasadas.
2. Propone puntos de agenda (`agenda_item_state = PROPOSED`).
3. Tras la reunión, consulta decisiones y siguientes pasos.
4. Comenta en el hilo de la reunión (F9).

**Resultado**
- Registro consultable de qué se decidió y qué se acordó hacer. `decisions` es campo propio, no
  párrafo perdido en las notas.

**Permisos**
- `OWNER`: control total sobre reuniones.
- `CLIENT`: lectura de las visibles + **creación de puntos de agenda** (única escritura suya aquí).
- El `CLIENT` no ve la lista completa de asistentes internos si hay `MEMBER` no expuestos.

**Casos alternativos**
- **A1** Reunión cancelada → `CANCELED` con motivo; permanece visible en el histórico.
- **A2** Reunión sin notas → aparece como celebrada, con estado vacío: *Sin notas publicadas.*
- **A3** Punto de agenda no tratado → `DEFERRED`; se puede arrastrar a la reunión siguiente.
- **A4** Decisión que se revierte más tarde → se registra una decisión nueva que referencia la
  anterior. **Nunca se edita el histórico** de decisiones publicadas.
- **A5** Reunión interna no visible al cliente → `visibility = INTERNAL`; el cliente no sabe que existe.

**Errores**
- Propuesta de agenda sobre reunión `HELD` o `CANCELED` → rechazada.
- Publicar notas sin `decisions` → aviso, no bloqueo (puede no haber decisiones).
- Sin integración de calendario: no hay invitaciones ni recordatorios (fuera de alcance).

**Auditoría**
`meeting.created` · `meeting.published` · `meeting.state_changed` · `agenda_item.proposed` ·
`agenda_item.accepted` · `meeting.decisions_recorded`

**Decisiones pendientes**
`OD-09` (recordatorios) · `OD-13` (calendario externo, hoy fuera de alcance)

---

## F13 · Revisión del cierre semanal

**Actor:** `CLIENT`

**Precondiciones**
- Ciclo en `IN_REVIEW` con cierre publicado, y **sin revisión previa de este cliente**.
  La condición se **deriva**; no existe ninguna fila `PENDING`
  ([`ROLES-AND-PERMISSIONS.md`](ROLES-AND-PERMISSIONS.md) §7.3).

**Pasos**
1. El cliente ve un banner destacado en **Resumen**.
2. Abre el cierre: objetivo vs. resultado, horas, funcionalidades entregadas, evidencias, resumen.
3. Elige una de tres respuestas:
   - **Confirmo lectura** → `ACKNOWLEDGED`. No implica conformidad.
   - **Apruebo** → `APPROVED`.
   - **Solicito cambios** → `CHANGES_REQUESTED`, con comentario **obligatorio**.
4. Se **crea** un registro `reviews`. Si ya había una respuesta suya, la nueva la encadena por
   `supersedes_review_id`. **Nunca se actualiza una revisión existente** (regla R14).
5. El `OWNER` ve la respuesta en **Inicio**.

**Resultado**
- Respuesta formal registrada y trazable. Historial completo: no se sobrescribe.
- **El `cycle_state` no cambia.** La revisión es informativa (`OD-03`, cerrada).

**Permisos**
- Solo `CLIENT` envía revisiones. El `OWNER` no puede aprobar en nombre del cliente.
- El `CLIENT` tiene **`C` y `R`, no `U`**, sobre `reviews`.
- El `CLIENT` no cambia `cycle_state`; su revisión es una entrada, no una transición.

**Casos alternativos**
- **A1** `APPROVED` → el `OWNER` **puede** pasar el ciclo a `CLOSED`. La aprobación no cierra nada
  por sí sola (`OD-03`, cerrada).
- **A2** `CHANGES_REQUESTED` → **el `OWNER` decide** si reabre a `ACTIVE` o cierra igualmente
  dejando constancia. Nada se reabre automáticamente. Si republica el cierre, cada cliente vuelve a
  quedar pendiente por derivación.
- **A3** Cliente que cambia de opinión → envía otra revisión; vale la última, con historial visible.
- **A4** Cliente que no responde → el ciclo se queda en `IN_REVIEW`. El `OWNER` puede cerrarlo
  igualmente con `closed_without_review = true`, y así consta para ambas partes.
- **A5** Varios clientes (`OD-02`, cerrada) → **una cadena de revisiones por cliente**, con unicidad
  conceptual `(work_cycle_id, created_by)` sobre la revisión vigente de cada uno. **No existe estado
  agregado del ciclo**: mostrar "aprobado" porque uno de tres aprobó sería falso. El propietario ve
  la posición de cada cliente y decide.

**Errores**
- `CHANGES_REQUESTED` sin comentario → bloqueado.
- Revisar un ciclo que no está `IN_REVIEW` → rechazado.
- Revisar un ciclo de otro workspace → **404**.
- Intentar **actualizar** una revisión enviada → operación inexistente; la interfaz ofrece
  *Cambiar mi respuesta*, que crea una fila nueva.

**Auditoría**
`review.submitted` · `work_cycle.state_changed` *(si el `OWNER` cierra o reabre)* ·
`work_cycle.closed_without_review` *(si A4)*

`review.requested` y `review.state_changed` **se han eliminado**: no hay filas pendientes que crear
ni revisiones que transicionen.

**Decisiones pendientes**
`OD-09` (avisos) · `OD-17` (si un cliente ve las revisiones de otros clientes del workspace)

---

## F14 · Usar un workspace personal sin exponerlo

**Actor:** `OWNER`

**Precondiciones**
- Workspace de tipo `PERSONAL` con Nelson como único miembro.

**Pasos**
1. Cambia al workspace personal (F1).
2. La interfaz **elimina** todo lo relativo a clientes: nada de *publicar*, *vista previa como
   cliente*, *solicitudes* ni *revisiones*. No se muestran deshabilitadas: no están.
3. Registra trabajo exactamente igual (F2–F4).
4. Redacta notas y actualizaciones si quiere; permanecen `PRIVATE`.
5. Cierra ciclos directamente a `CLOSED`, sin `IN_REVIEW`.

**Resultado**
- El mismo motor de registro, sin superficie de exposición. Cero riesgo de publicar por descuido.

**Permisos**
- `default_visibility = PRIVATE`. Todo nace privado.
- Sin miembros `CLIENT`, `CLIENT_VISIBLE` no tiene efecto práctico.

**Casos alternativos**
- **A1** Convertir un workspace `PERSONAL` en `CLIENT` → operación **deliberada y auditada**. Todo
  el contenido existente **conserva** su visibilidad actual; nada se eleva automáticamente. Se
  muestra un resumen de qué seguirá siendo invisible.
- **A2** Invitar un `CLIENT` a un workspace `PERSONAL` → bloqueado hasta convertir el tipo. El tipo
  `PERSONAL` es precisamente la declaración de que ahí no entra nadie.
- **A3** Mover trabajo entre workspaces → **no soportado**. Rompería la frontera dura
  ([`ADR-002`](decisions/ADR-002-workspace-boundary.md)). Se documenta como no soportado a propósito.
- **A4** Contexto mixto (trabajo personal sobre un proyecto de cliente) → decisión del usuario:
  registrarlo donde deba rendir cuentas. La aplicación no adivina.

**Errores**
- Fuga entre workspaces → considerada **defecto crítico**, no incidencia menor.
- Cambiar de workspace con una sesión `RUNNING` → se avisa; la sesión sigue corriendo en su
  workspace de origen y permanece visible en la cabecera.

**Auditoría**
`workspace.type_changed` · `workspace.switched` · `member.added` *(al convertir)*

**Notas de la iteración 0.1**
`OD-11` cerrada: el rol nunca es global. Que Nelson sea `OWNER` aquí no le concede nada en ningún
otro workspace, y que sea `CLIENT` en otro no le resta nada en este. Cada membresía es independiente.

**Decisiones pendientes**
Ninguna.

---

## Resumen de eventos de auditoría

| Familia | Eventos |
|---|---|
| Workspace | `workspace.created`, `workspace.type_changed`, `workspace.timezone_changed`, `workspace.switched` |
| Miembros | `member.added`, `member.removed`, `member.role_changed` |
| Ciclos | `work_cycle.created`, `work_cycle.state_changed`, `work_cycle.closing_published`, `work_cycle.hours_snapshot_frozen`, `work_cycle.closed_without_review` |
| Participación en ciclo | `work_cycle_item.added`, `work_cycle_item.removed`, `work_cycle_item.carried_over`, `work_cycle_item.closed_state_recorded` |
| Work items | `work_item.created`, `work_item.state_changed`, `visibility.changed` |
| Sesiones | `work_session.started/paused/resumed/completed/discarded/switched/time_adjusted`, `work_session.outcome_recorded` |
| Evidencias | `evidence.created`, `evidence.linked`, `evidence.unlinked`, `evidence.visibility_changed` |
| Actualizaciones | `daily_update.created/published/unpublished/edited_after_publish` |
| Discusión | `discussion.thread_created`, `discussion.thread_resolved`, `discussion.message_created/edited`, `discussion.clarification_requested/answered` |
| Solicitudes | `client_request.created/updated/withdrawn/triaged/state_changed/converted` |
| Reuniones | `meeting.created/published/state_changed`, `agenda_item.proposed/accepted`, `meeting.decisions_recorded` |
| Revisiones | `review.submitted` |
| Identidad | `user.password_reset_issued`, `user.password_reset_used` |
| Acceso del cliente | `client.viewed_cycle/viewed_update/viewed_work_item/opened_evidence` |

**Eliminados en la iteración 0.1:** `review.requested` y `review.state_changed` — publicar un cierre
ya no escribe filas en `reviews`, y una revisión no transiciona: se encadena
([`DATA-MODEL.md`](DATA-MODEL.md) §4.16.1).
