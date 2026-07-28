# START HERE

Mapa de la documentación de `nj-worktrace`. Si eres una persona nueva o un agente, este es el
segundo documento que debes leer (después de [`../AGENTS.md`](../AGENTS.md)).

---

## 1. En 60 segundos

`nj-worktrace` registra el trabajo de una persona en varios **workspaces** aislados (personales, de
cliente, de negocio) y expone a cada cliente **solo** lo que su dueño ha marcado visible **y** ha
publicado.

Cinco frases que resumen el diseño:

1. El **workspace** es la frontera dura: nada cruza entre workspaces, nunca.
2. **Visibilidad**, **publicación**, **estado funcional** y **estado de revisión** son cuatro ejes
   independientes. Nunca se colapsan en uno.
3. El cliente **lee, comenta, solicita y responde**. No escribe sobre el registro de trabajo.
4. El **tiempo** se mide en segmentos reales (inicio / pausa / fin) y se comparte agregado.
5. Todo lo que cambia estado visible deja un **evento de auditoría**.

## 2. Estado del proyecto

**Fase de diseño documental — iteración 0.1 completa.** No hay código. Ver
[`CURRENT-STATE.md`](CURRENT-STATE.md) para el estado exacto y la lista de decisiones abiertas
(`OD-xx`).

## 3. Índice de documentos

| Documento | Responde a | Léelo cuando |
|---|---|---|
| [`PRODUCT-SCOPE.md`](PRODUCT-SCOPE.md) | ¿Qué es y qué no es el producto? | Antes de proponer cualquier funcionalidad |
| [`ROLES-AND-PERMISSIONS.md`](ROLES-AND-PERMISSIONS.md) | ¿Quién puede hacer qué? | Al tocar visibilidad, acceso o acciones |
| [`USER-FLOWS.md`](USER-FLOWS.md) | ¿Cómo transcurre cada escenario? | Al diseñar o cambiar comportamiento |
| [`INFORMATION-ARCHITECTURE.md`](INFORMATION-ARCHITECTURE.md) | ¿Cómo se navega? | Al añadir pantallas o secciones |
| [`DATA-MODEL.md`](DATA-MODEL.md) | ¿Qué entidades existen y cómo se relacionan? | Al modelar datos |
| [`UI-WIREFRAMES.md`](UI-WIREFRAMES.md) | ¿Cómo se ve cada pantalla? | Al diseñar interfaz |
| [`MVP-PLAN.md`](MVP-PLAN.md) | ¿Qué se construye primero? | Al priorizar |
| [`CURRENT-STATE.md`](CURRENT-STATE.md) | ¿Qué existe hoy? ¿Qué está abierto? | **Siempre, al empezar** |
| [`decisions/`](decisions/) | ¿Por qué se decidió así? | Antes de cuestionar una decisión estructural |

### ADRs

| ADR | Decisión |
|---|---|
| [`ADR-001-modular-monolith.md`](decisions/ADR-001-modular-monolith.md) | Monolito modular, no microservicios |
| [`ADR-002-workspace-boundary.md`](decisions/ADR-002-workspace-boundary.md) | El workspace es la frontera de autorización |
| [`ADR-003-client-interaction.md`](decisions/ADR-003-client-interaction.md) | El cliente escribe en canales propios, nunca en el registro |

## 4. Enrutado por tipo de tarea

| Si tu tarea es… | Lee primero |
|---|---|
| Añadir una funcionalidad | `PRODUCT-SCOPE.md` → `USER-FLOWS.md` → `DATA-MODEL.md` |
| Cambiar quién ve qué | `ROLES-AND-PERMISSIONS.md` → `ADR-002` → `ADR-003` |
| Diseñar una pantalla | `INFORMATION-ARCHITECTURE.md` → `UI-WIREFRAMES.md` |
| Modelar datos | `DATA-MODEL.md` → `ADR-001` |
| Priorizar trabajo | `MVP-PLAN.md` → `CURRENT-STATE.md` |
| Resolver una contradicción | `CURRENT-STATE.md` → **detente y pregunta** |

## 5. Glosario

| Término | Significado |
|---|---|
| **Workspace** | Contenedor aislado de trabajo. Frontera dura de autorización. Se identifica por un `public_id` opaco; su nombre es decorativo. |
| **Work cycle** | Ciclo de trabajo, normalmente una semana. Tiene objetivo y cierre. |
| **Work item** | Unidad de trabajo jerárquica: iniciativa, funcionalidad, tarea, bug o investigación. |
| **Work cycle item** | Participación de un work item en un ciclo. Permite que un item cruce varias semanas sin duplicarse. |
| **Work session** | Periodo de trabajo sobre un work item. Contiene segmentos. |
| **Segment** | Intervalo continuo de tiempo dentro de una sesión, delimitado por pausas. |
| **Daily update** | Narrativa de un día, preparada en borrador y publicada explícitamente. |
| **Evidence** | Prueba del trabajo: commit, PR, test, experimento, enlace, captura, nota. |
| **Evidence link** | Relación entre una evidencia y un contexto. Una evidencia, varios enlaces, ninguna copia. |
| **Client request** | Petición del cliente. Vive en cola propia, separada del backlog. |
| **Review** | Respuesta del cliente al cierre de un ciclo: lectura, aprobación o petición de cambios. Solo existe si se envió. |
| **Entidad publicable** | La que lleva `publication_state`: ciclos, work items, actualizaciones, evidencias y reuniones. Las demás se rigen por su clase. |
| **Visibilidad** | Quién *puede* ver. `PRIVATE` / `INTERNAL` / `CLIENT_VISIBLE`. |
| **Publicación** | Si el autor lo ha *liberado*. `DRAFT` / `PUBLISHED`. |
| **OD-xx** | Decisión abierta, sin resolver. Listadas en `CURRENT-STATE.md` §6. |
| **D-xx** | Decisión de producto ya adoptada. `CURRENT-STATE.md` §5. |
| **K-xx** | Contradicción detectada y su resolución. `CURRENT-STATE.md` §7. |

## 6. Reglas de oro

1. El workspace nunca se cruza.
2. Un `CLIENT` ve una **entidad publicable** solo si es `CLIENT_VISIBLE` **y** `PUBLISHED`. Las
   entidades no publicables se rigen por su clase, no por esta regla.
3. Un `CLIENT` nunca modifica horas, sesiones, evidencias ni backlog. Escribe en cuatro canales
   propios: mensajes, solicitudes, revisiones y propuestas de agenda.
4. Los cuatro ejes de estado no se colapsan.
5. Un contenedor no se vuelve visible por contener algo visible.
6. Todo cambio de estado visible se audita.
7. Lo que no esté en `PRODUCT-SCOPE.md` no existe.
