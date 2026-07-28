# ADR-003 · El cliente escribe en canales propios, nunca en el registro

- **Estado:** Aceptada · **revisada en la iteración 0.1** (§1, §6 y §7 corregidos)
- **Fecha:** 2026-07-28
- **Contexto de la decisión:** Iteración 0 (fundación documental)
- **Relacionada con:** [`ADR-002`](ADR-002-workspace-boundary.md)

---

## Contexto

El cliente necesita participar de verdad: comentar, preguntar, pedir cosas, aprobar. Un portal de
solo lectura acaba desplazando la conversación al correo, que es justo lo que este producto intenta
evitar.

Pero el registro de trabajo es un **testimonio**: qué se hizo, cuándo, cuánto tiempo y con qué
prueba. Si el cliente puede tocarlo, deja de ser testimonio y pasa a ser un documento negociado. Y a
la inversa: si el propietario puede editar lo que el cliente escribió, la conversación pierde valor
como constancia.

Hay además un riesgo práctico. Si las peticiones del cliente entran directamente en el backlog, el
backlog deja de reflejar lo que el propietario piensa hacer y pasa a reflejar lo que le han pedido.
La priorización se pierde.

## Decisión

**El cliente escribe únicamente en canales que le pertenecen. Nunca sobre el registro de trabajo.
Toda petición pasa por un triaje explícito antes de convertirse en trabajo.**

### 1. Cuatro puntos de escritura, y solo cuatro

| Canal | Entidad | Qué es |
|---|---|---|
| Conversación | `discussion_messages` | Comentarios y aclaraciones, siempre anclados a un contexto accesible |
| Peticiones | `client_requests` | Cola propia, separada del backlog |
| Revisión | `reviews` | Respuesta formal al cierre de un ciclo |
| Propuesta de agenda | `meeting_agenda_items` en `PROPOSED` | El cliente propone un punto; el propietario lo acepta o lo difiere. No altera la reunión por sí sola |

Son **cuatro**, no tres. La iteración 0 llamaba al cuarto "excepción menor" y luego lo contaba
aparte, lo que producía dos cifras distintas en documentos distintos. Es un canal de escritura como
los otros y se cuenta como tal.

### 2. Lo que el cliente no puede tocar, nunca

`work_sessions`, `work_session_segments`, `work_items`, `evidence_items`, `daily_updates`,
`work_cycles`, `workspace_members`, ni la configuración del workspace.

No es una restricción de interfaz: no existe operación en el sistema que permita a un rol `CLIENT`
escribir en esas entidades.

### 3. Las peticiones no entran en el backlog: entran en una cola

`client_requests` es una entidad propia con su ciclo de vida
(`SUBMITTED` → `UNDER_REVIEW` → `ACCEPTED` / `PLANNED` / `REJECTED` / `WITHDRAWN`).

Convertir una petición **crea un work item nuevo** y guarda el enlace en ambos sentidos
(`converted_work_item_id` ↔ `source_client_request_id`). **Nunca modifica un work item existente.**

### 4. La prioridad declarada por el cliente es informativa

`declared_priority` se muestra al propietario y no reordena nada automáticamente. El cliente expresa
urgencia; el propietario decide la secuencia. Que ambas cosas sean distintas debe ser evidente en la
interfaz.

### 5. Rechazar exige explicación

`resolution_note` es obligatoria en `REJECTED`. Una petición no puede morir en silencio. Es el
criterio E5 de [`PRODUCT-SCOPE.md`](../PRODUCT-SCOPE.md).

### 6. La revisión es una entrada, no una transición — y no existe antes de enviarse

Una `reviews` no cambia `cycle_state` (`OD-03`, cerrada: la revisión es **informativa** en el MVP).
El cliente aporta su respuesta; el propietario decide qué hacer con el ciclo, incluido cerrarlo sin
revisión o no reabrirlo tras un `CHANGES_REQUESTED`.

Las revisiones son **append-only** y se encadenan por `supersedes_review_id`: cambiar de opinión
añade un registro, no reescribe el anterior. El cliente tiene **`C` y `R`, no `U`**.

**Corrección de la iteración 0.1.** La versión anterior decía a la vez que `reviews` era append-only
y que al publicar un cierre se creaba una fila `PENDING` por cliente — una fila que después habría
que actualizar, que es justo lo que append-only prohíbe. Resolución:

- Una fila de `reviews` representa **únicamente una respuesta enviada**.
- **`PENDING` desaparece** del enum `review_state`. Lo pendiente se **deriva**: ciclo publicado +
  `IN_REVIEW` + cliente activo + ausencia de revisión suya.
- Publicar un cierre **no escribe nada** en `reviews`. El evento `review.requested` se elimina.
- Con varios clientes hay **una cadena por cliente** y **ningún estado agregado** del ciclo: decir
  "aprobado" porque uno de tres aprobó sería falso.

Detalle en [`DATA-MODEL.md`](../DATA-MODEL.md) §4.16.1.

### 7. La conversación es inmutable en la práctica

Ventana corta de edición para el autor, borrado lógico que deja constancia del hueco (`OD-06`). El
propietario **no puede** editar ni borrar mensajes del cliente. Puede marcar un hilo como resuelto —
eso organiza, no altera.

### 8. Los hilos derivan su accesibilidad del ancla; no la almacenan

Un hilo nunca es más visible que aquello a lo que está anclado. Si el ancla se despublica, el hilo
deja de ser accesible para el cliente pero **no se borra**.

**Corrección de la iteración 0.1:** `discussion_threads` ya no guarda un campo `visibility`. Una
copia de la visibilidad del ancla es una copia que puede quedar desincronizada — y era la vía de
fuga más probable de todo el diseño. La accesibilidad se **resuelve contra el ancla en cada
consulta**, de modo que despublicar surte efecto de inmediato y sin recalcular nada.

### 9. Una solicitud es un contexto de conversación de pleno derecho

Añadido en la iteración 0.1. `context_type` incluye **`CLIENT_REQUEST`**: la conversación sobre una
petición es un hilo anclado a ella, igual que un hilo sobre un ciclo o una actualización.

Antes, `client_requests` guardaba un `related_thread_id` que apuntaba a una conversación sin ancla
propia — un hilo suelto, precisamente lo que §8 prohíbe. Ahora:

- La conversación de una solicitud se ancla a la solicitud.
- `origin_thread_id` se conserva con otro significado: registra el hilo **del que nació** la
  solicitud, cuando el propietario convierte un comentario en petición.
- La accesibilidad del hilo sigue la de la solicitud, sujeta a `OD-17` cuando hay varios clientes.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| **Portal de solo lectura** | La conversación se va al correo. Se pierde el contexto y con él la razón de ser del producto. |
| **El cliente crea work items directamente** | El backlog deja de representar la intención del propietario. Se pierde la priorización y aparece la expectativa implícita de que lo creado se hará. |
| **El cliente edita campos "seguros"** (prioridad, descripción) | No existe un campo seguro: cualquier edición sobre el registro lo convierte en negociado. Y la frontera "seguro / no seguro" se erosiona con cada excepción. |
| **Comentarios sobre cualquier cosa, visible o no** | Un cliente comentando algo que no debería ver revela su existencia. La conversación debe vivir dentro del filtro de visibilidad, no fuera. |
| **Aprobación que cierra el ciclo automáticamente** | Traslada al cliente el control del proceso del propietario. **Descartada** para el MVP al cerrar `OD-03`: la revisión es informativa. |

## Consecuencias

**Positivas**
- El registro de trabajo conserva su valor como testimonio: nadie externo lo ha tocado.
- El backlog sigue reflejando la intención del propietario.
- Toda petición tiene resolución explícita y trazable.
- La conversación queda anclada al contexto, no dispersa en un canal paralelo.
- El cliente tiene voz real: comenta, pide, aprueba, pide cambios.

**Negativas**
- Más pasos para el propietario: cada petición exige triaje. Es deliberado — el coste está donde
  debe estar.
- El cliente puede percibir el triaje como fricción. Se mitiga con estados visibles y respuesta
  obligatoria en el rechazo.
- Duplicación aparente entre una petición y su work item derivado. Se mitiga con el enlace
  bidireccional y mostrando el estado del work item dentro de la petición.

**Neutras**
- El rol `MEMBER` queda entre medias: escribe en el registro pero no publica. Definido, no
  implementado en el MVP.

## Reglas verificables

| # | Regla | Cómo se comprueba |
|---|---|---|
| C1 | Ninguna operación permite a un `CLIENT` escribir fuera de los cuatro canales | Prueba por entidad y rol |
| C2 | `client_requests` no puede modificar un `work_item` existente | Revisión de código + prueba |
| C3 | `REJECTED` sin `resolution_note` es imposible | Validación + prueba |
| C4 | Una `reviews` no altera `cycle_state` | Prueba |
| C5 | Un hilo nunca es más visible que su ancla, y no almacena visibilidad propia | Prueba de invariante + revisión del esquema |
| C6 | El propietario no puede editar mensajes ajenos | Prueba por rol |
| C7 | Ninguna fila de `reviews` se crea sin acción explícita de un cliente | Prueba sobre la publicación del cierre |
| C8 | Una `reviews` nunca se actualiza: cambiar de respuesta encadena | Prueba de invariante |
| C9 | Todo hilo tiene un ancla existente y accesible al consultarse | Prueba de integridad |

Estas reglas son el criterio de terminado de la iteración 6 de [`MVP-PLAN.md`](../MVP-PLAN.md).

## Revisión

Reconsiderar si el cliente resulta ser un colaborador técnico que necesita crear items de verdad. En
ese caso la respuesta correcta **no** es ampliar el rol `CLIENT`, sino darle rol `MEMBER` en un
workspace pensado para eso. Ampliar `CLIENT` erosionaría la garantía completa.
