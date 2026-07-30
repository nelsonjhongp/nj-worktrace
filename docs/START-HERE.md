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

**Iteraciones 2A, 2B y 2C fusionadas (2C en PR #4); iteración 2D en curso en
`feat/workspace-authorization`.** Existe código ejecutable con Next.js, PostgreSQL, Drizzle y Better
Auth; 2C añadió la resolución server-side del contexto de acceso a un workspace y 2D añade la
autorización por capacidad sobre ese contexto más `WorkspaceScope`. Aún no existe interfaz de usuario.

Ver [`CURRENT-STATE.md`](CURRENT-STATE.md) para el estado exacto, la rama activa y las decisiones
abiertas (`OD-xx`).

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

### Documentos técnicos *(iteración 1)*

| Documento | Responde a | Léelo cuando |
|---|---|---|
| [`TECHNICAL-FOUNDATION.md`](TECHNICAL-FOUNDATION.md) | ¿Cuál es el stack y encaja con el producto? | Antes de escribir la primera línea de código |
| [`ENVIRONMENTS.md`](ENVIRONMENTS.md) | ¿Cómo se configura cada entorno? | Al tocar configuración, base de datos o despliegue |
| [`TESTING.md`](TESTING.md) | ¿Cómo se prueba y qué debe existir? | Al escribir cualquier prueba |

### ADRs

| ADR | Decisión |
|---|---|
| [`ADR-001`](decisions/ADR-001-modular-monolith.md) | Monolito modular, no microservicios |
| [`ADR-002`](decisions/ADR-002-workspace-boundary.md) | El workspace es la frontera de autorización |
| [`ADR-003`](decisions/ADR-003-client-interaction.md) | El cliente escribe en canales propios, nunca en el registro |
| [`ADR-004`](decisions/ADR-004-application-stack.md) | Next.js App Router, TypeScript estricto, Tailwind, shadcn/ui |
| [`ADR-005`](decisions/ADR-005-persistence-and-migrations.md) | PostgreSQL, Drizzle ORM, migraciones SQL versionadas |
| [`ADR-006`](decisions/ADR-006-authentication-and-sessions.md) | Better Auth, sesiones en base, sin JWT ni caché de sesión |
| [`ADR-007`](decisions/ADR-007-runtime-and-deployment.md) | Node.js LTS, Next standalone, Docker, sin plataforma obligatoria |
| [`ADR-008`](decisions/ADR-008-testing-strategy.md) | Vitest, PostgreSQL real, Playwright, aislamiento obligatorio |
| [`ADR-009`](decisions/ADR-009-workspace-authorization.md) | Capacidades cerradas, motor puro, `WorkspaceScope`; sin Row-Level Security |

## 4. Enrutado por tipo de tarea

| Si tu tarea es… | Lee primero |
|---|---|
| Añadir una funcionalidad | `PRODUCT-SCOPE.md` → `USER-FLOWS.md` → `DATA-MODEL.md` |
| Cambiar quién ve qué | `ROLES-AND-PERMISSIONS.md` → `ADR-002` → `ADR-003` |
| Tocar capacidades, políticas o `WorkspaceScope` | `ROLES-AND-PERMISSIONS.md` §12 → `ADR-009` → `ADR-002` |
| Diseñar una pantalla | `INFORMATION-ARCHITECTURE.md` → `UI-WIREFRAMES.md` |
| Modelar datos | `DATA-MODEL.md` → `ADR-001` → `ADR-005` |
| Priorizar trabajo | `MVP-PLAN.md` → `CURRENT-STATE.md` |
| Escribir código por primera vez | `TECHNICAL-FOUNDATION.md` → `ADR-004` → `ADR-007` |
| Tocar la base de datos o una migración | `ADR-005` → `DATA-MODEL.md` §8 |
| Tocar sesiones o inicio de sesión | `ADR-006` → `ROLES-AND-PERMISSIONS.md` §9 |
| Escribir una prueba | `TESTING.md` → `ADR-008` |
| Configurar un entorno | `ENVIRONMENTS.md` → `ADR-007` |
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
| **A1–A8** | Reglas verificables de aislamiento por workspace. `ADR-002` §Reglas verificables. |
| **C1–C9** | Reglas verificables de interacción del cliente. `ADR-003`. |
| **T4-x … T8-x** | Reglas y criterios verificables de las decisiones técnicas. `ADR-004`…`ADR-008`. |
| **WorkspaceScope** | Contexto obligatorio (workspace + actor + transacción) que reciben las funciones de acceso a datos. Sin él no se consulta. `ADR-005` §3.6. |

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
