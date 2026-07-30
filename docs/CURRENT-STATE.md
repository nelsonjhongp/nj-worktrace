# CURRENT STATE

**Última actualización: 2026-07-29 — iteración 2D, autorización por acción y `WorkspaceScope`**

Estado real del proyecto. Este documento se actualiza en **todo** cambio. Si dice algo que no es
cierto, es un defecto.

---

## 1. Estado en una línea

**Iteraciones 2A, 2B y 2C fusionadas en `main`; iteración 2D en curso en
`feat/workspace-authorization`.**
Existe esquema ejecutable (`domain_users`, `workspaces`, `workspace_members` + las cuatro tablas de
Better Auth) con migraciones `0000` y `0001`, autenticación funcional con Better Auth 1.6.25 y
sesiones persistidas en PostgreSQL, la resolución server-side del contexto de acceso a un workspace
(2C: sesión + identidad de dominio + `workspacePublicId` + membresía activa →
`WorkspaceAccessContext`) y —nuevo en 2D— la **autorización por acción**: catálogo cerrado de once
capacidades, matriz rol → capacidad, motor puro de políticas, `WorkspaceScope` con identificador
marcado y traducción de resultados a `Response` sin revelar recursos ajenos.

**Todavía no existe** ninguna interfaz de usuario. Tampoco existe ninguna **operación de negocio** que
consuma una capacidad: 2D decide quién puede actuar, no qué hace la acción.

## 2. Qué existe

```
nj-worktrace/
├── CLAUDE.md                 punto de entrada para agentes
├── AGENTS.md                 contrato de trabajo neutral
├── README.md                 presentación del proyecto + comandos de desarrollo
├── package.json              dependencias y scripts (pnpm)
├── tsconfig.json             TypeScript estricto (5 opciones)
├── next.config.ts            Next.js con output: 'standalone'
├── postcss.config.mjs        Tailwind CSS 4 vía PostCSS
├── eslint.config.mjs         ESLint flat config con regla de frontera modular
├── vitest.config.ts          Vitest 4.1.x (pruebas unitarias)
├── vitest.integration.config.ts  Vitest para pruebas de integración
├── drizzle.config.ts         Configuración de Drizzle ORM
├── Dockerfile                Imagen Docker multi-etapa (producción)
├── .dockerignore             Exclusión para contexto Docker
├── compose.yaml              Docker Compose con PostgreSQL 18 + app
├── .env.example              variables de entorno documentadas
├── .gitignore                ignorados de Next.js, Node, env
├── .github/
│   └── workflows/
│       └── ci.yml            Workflow de integración continua
├── docs/
│   ├── START-HERE.md         mapa e índice
│   ├── PRODUCT-SCOPE.md      alcance, exclusiones, criterios de éxito
│   ├── ROLES-AND-PERMISSIONS.md  roles, clases de entidad, matriz
│   ├── USER-FLOWS.md         14 flujos detallados
│   ├── INFORMATION-ARCHITECTURE.md  navegación y rutas
│   ├── DATA-MODEL.md         22 entidades conceptuales
│   ├── UI-WIREFRAMES.md      7 pantallas × laptop + móvil
│   ├── MVP-PLAN.md           iteraciones 0 → 8
│   ├── TECHNICAL-FOUNDATION.md   stack, compatibilidad, versiones
│   ├── ENVIRONMENTS.md           entornos y configuración
│   ├── TESTING.md                convenciones de prueba
│   ├── CURRENT-STATE.md      este documento
│   └── decisions/
│       ├── ADR-001-modular-monolith.md          (revisado en 0.1)
│       ├── ADR-002-workspace-boundary.md        (revisado en 0.1)
│       ├── ADR-003-client-interaction.md        (revisado en 0.1)
│       ├── ADR-004-application-stack.md         ← iteración 1
│       ├── ADR-005-persistence-and-migrations.md ← iteración 1
│       ├── ADR-006-authentication-and-sessions.md ← iteración 1
│       ├── ADR-007-runtime-and-deployment.md    ← iteración 1
│       ├── ADR-008-testing-strategy.md          ← iteración 1
│       └── ADR-009-workspace-authorization.md   ← iteración 2D (cierra OD-18)
├── src/
│   ├── app/
│   │   ├── layout.tsx        layout raíz
│   │   ├── page.tsx          página temporal técnica
│   │   ├── globals.css       Tailwind + variables
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...all]/route.ts  rutas de Better Auth (solo reexporta authHandler)
│   │       ├── health/
│   │       │   └── route.ts  GET /api/health (liveness)
│   │       └── ready/
│   │           └── route.ts  GET /api/ready (readiness)
│   ├── modules/
│   │   ├── identity/
│   │   │   ├── index.ts      superficie pública de dominio (domain_users)
│   │   │   ├── database-schema.ts  composición de esquema; solo la consume platform
│   │   │   ├── server.ts     server-only: auth, authHandler, identidad autenticada
│   │   │   └── internal/
│   │   │       ├── schema.ts              esquema de domain_users
│   │   │       ├── better-auth-schema.ts  tablas user/session/account/verification
│   │   │       ├── auth.ts                configuración de Better Auth
│   │   │       ├── session.ts             resolución de identidad autenticada
│   │   │       └── marker.ts              marcador de frontera para pruebas
│   │   └── workspaces/
│   │       ├── index.ts      superficie pública (workspaces, members, enums, tipos)
│   │       ├── server.ts     server-only: resolveWorkspaceMembership
│   │       └── internal/
│   │           ├── schema.ts             esquema de workspaces y members
│   │           ├── types.ts              WorkspaceId nominal (dueño del identificador)
│   │           ├── access-repository.ts  consulta única de acceso (LEFT JOIN)
│   │           ├── access.ts             «solo ACTIVE concede» + frontera de WorkspaceId
│   │           └── marker.ts             marcador de frontera para pruebas
│   ├── application/
│   │   ├── access/
│   │   │   ├── workspace-access-context.ts   contrato de 2C que consume 2D
│   │   │   ├── resolve-workspace-access.ts   composición de identity + workspaces
│   │   │   └── workspace-scope.ts            alcance de datos; sin aserciones de tipo
│   │   └── authorization/
│   │       ├── workspace-capability.ts       catálogo cerrado de 11 capacidades
│   │       ├── workspace-policy.ts           matriz rol → capacidad + motor puro
│   │       ├── authorization-decision.ts     vocabulario de decisión
│   │       └── authorize-workspace-action.ts orquestador: acceso + política + scope
│   └── platform/
│       ├── env.ts            validación de entorno con Zod
│       ├── health.ts         contrato del health check
│       ├── readiness.ts      contrato del readiness check
│       ├── database/
│       │   ├── client.ts     Pool de pg + cliente Drizzle
│       │   ├── health.ts     verificación de conexión
│       │   └── schema.ts     composición de esquemas modulares
│       └── http/
│           └── workspace-authorization-response.ts  Response estándar; 404 único
├── drizzle/
│   ├── 0000_overjoyed_nocturne.sql  identidad y workspaces (tablas, enums, CHECK, triggers)
│   └── 0001_melted_abomination.sql  tablas de Better Auth + provisión de domain_users
├── public/
│   └── container-check.txt   Recurso estático de verificación
├── scripts/
│   ├── db-check.ts           script de verificación de base de datos
│   ├── db-migrate.ts         script de aplicación de migraciones
│   ├── db-test-reset.ts      script de reset de base de datos de pruebas
│   └── container-check.ts    script de verificación del contenedor
├── tests/
│   ├── health.test.ts        contrato del health check
│   ├── readiness.test.ts     contrato del readiness check
│   ├── env.test.ts           validación de entorno
│   ├── module-boundary.test.ts  fronteras modulares (16 comprobaciones)
│   ├── unit/
│   │   └── authorization/
│   │       ├── workspace-capability.test.ts  catálogo cerrado
│   │       ├── workspace-policy.test.ts      88 celdas rol × capacidad × estado
│   │       └── workspace-scope.test.ts       forma del scope y marca de tipo
│   ├── support/
│   │   ├── identity.ts       identidades reales de Better Auth (compartido 2C/2D)
│   │   ├── workspaces.ts     workspaces y membresías (compartido 2C/2D)
│   │   └── workspace-access.ts  único punto de marcado de WorkspaceId en pruebas
│   └── integration/
│       ├── database.test.ts  prueba de integración con PostgreSQL real
│       ├── schema.test.ts    pruebas de esquema de identidad y workspaces
│       ├── auth.test.ts      registro, login, sesiones y atomicidad del signup
│       ├── access/
│       │   └── resolve-workspace-access.test.ts  resolución del contexto de acceso
│       └── authorization/
│           └── authorize-workspace-action.test.ts  autorización y traducción HTTP
└── .claude/skills/
    ├── plan-iteration/SKILL.md
    ├── verify-change/SKILL.md
    └── sync-docs/SKILL.md
```

## 3. Qué NO existe

Sin interfaz de usuario funcional (solo página temporal técnica) · sin ninguna **ruta HTTP** que
consuma la autorización · sin **operaciones de negocio** (proyectos, ciclos, work items, sesiones,
evidencias, actualizaciones, reuniones, solicitudes, reviews) · sin repositorios de negocio · sin
listado ni selección de workspace · sin invitaciones ni gestión de miembros · sin creación ni
restauración de workspaces (`OD-19`) · sin auditoría real · sin `DEMO_MODE` implementado · sin
Row-Level Security (`OD-18` **cerrada en negativo**, `ADR-009` §8) · sin despliegue remoto · sin
integración con GitHub · sin captura de agentes o tokens · sin pagos.

**Lo que sí existe y funciona**: la imagen Docker se construye y ejecuta; las tablas `domain_users`,
`workspaces` y `workspace_members` existen con sus restricciones, índices parciales y triggers; las
cuatro tablas de Better Auth existen y `domain_users` se provisiona atómicamente por trigger al crear
un usuario; registro, login, logout y sesiones persistentes funcionan; la resolución del contexto
de acceso a un workspace devuelve un contexto mínimo confiable; y —nuevo en 2D— ese contexto se traduce
en una decisión de autorización por capacidad, con `WorkspaceScope` para la futura capa de datos y una
respuesta HTTP que no distingue «no existe» de «no es tuyo» de «no puedes».

**El límite exacto de 2D**: decide **quién puede** ejecutar cada acción. No existe ninguna acción que
ejecutar, y por tanto el filtrado por `workspace_id` de las consultas de negocio —`ADR-002` A2— sigue
**sin una sola verificación**.

## 4. Estado de Git

- Rama actual: **`feat/workspace-authorization`** (iteración 2D).
- Rama principal: `main`.
- Historial: **9 commits**. Las iteraciones 2A (`477a79f`, PR #2), 2B (`1663932`, PR #3) y 2C
  (`cce28b3`, PR #4) están fusionadas en `main`; la verificación de contenedor y CI es `68f01de`
  (PR #1).
- Cambios de la iteración 2D: **sin confirmar**, en el árbol de trabajo.
- No se ha hecho `commit` ni `push` — restricción de `AGENTS.md` §5.3.

### 4.1 Integración continua y análisis estático

- **CI:** `.github/workflows/ci.yml`, en push y PR a `main` y por `workflow_dispatch`. Un solo job
  que verifica instalación reproducible, lint, tipos, pruebas unitarias, pruebas de integración
  contra PostgreSQL 18 real (base desechable con migraciones aplicadas), build de Next.js, build de
  la imagen Docker, arranque del contenedor como usuario no root, health check, readiness y recurso
  estático. Credenciales efímeras generadas en el propio workflow, sin secretos reales. Permisos
  mínimos (`contents: read`).
- **SonarCloud:** conectado **desde fuera del repositorio**. No existe `sonar-project.properties` ni
  paso de análisis en el workflow, de modo que el repositorio no fija hoy exclusiones, cobertura ni
  umbrales; el análisis es el automático del servicio. Si se quisiera controlarlo desde el
  repositorio, haría falta añadir configuración, y eso es un cambio con su propio alcance.

## 5. Decisiones adoptadas

### Estructurales (con ADR)

| # | Decisión | Revisión |
|---|---|---|
| ADR-001 | Monolito modular. Un despliegue, módulos con fronteras explícitas. Sin microservicios. | 0.1: escalado horizontal posible, orquestación por servicios de aplicación, unidad de trabajo compartida sin acceso a tablas ajenas |
| ADR-002 | El workspace es la única frontera dura de autorización. Sin pertenencia → 404. | 0.1: §9, identificador público opaco; el nombre no identifica ni se valida globalmente |
| ADR-003 | El cliente escribe solo en canales propios. Toda petición pasa por triaje. | 0.1: cuatro canales, revisiones sin filas pendientes, hilos sin visibilidad propia, solicitud como contexto de conversación |
| **ADR-004** | Next.js 16 App Router, React 19, TypeScript estricto, pnpm, Tailwind 4, shadcn/ui copiado al repositorio. Disposición modular con `internal/` inaccesible. | Iteración 1 |
| **ADR-005** | PostgreSQL 18 (mínimo 16), Drizzle ORM `0.45.x` exacta sobre `node-postgres` con `drizzle-kit` en su propia línea de versión exacta y compatible verificada, migraciones SQL versionadas y revisadas. `DATABASE_URL` como único contrato. Invariantes repartidas entre base, índice parcial, servicio y Zod. | Iteración 1, corregida (sesión de corrección) |
| **ADR-006** | Better Auth `1.6.x` solo para **autenticación**, sesiones en PostgreSQL, cookies opacas `HttpOnly`/`Secure`/`SameSite=Lax`, sin `cookieCache`, sin JWT, sin sus plugins de organización. | Iteración 1 |
| **ADR-007** | Node.js 24 LTS, Next.js `output: 'standalone'` en imagen Docker propia, PostgreSQL local por Compose, `pnpm dev` nativo, migrar como paso separado, Caddy y PostgreSQL administrado como futuro opcional. | Iteración 1 |
| **ADR-008** | Vitest `4.1.x` (estable; 5 sigue en beta) + PostgreSQL real en base desechable, Playwright contra la imagen construida, pruebas de aislamiento obligatorias, **prohibidos los dobles de base en autorización**, sin umbral de cobertura. | Iteración 1, corregida (sesión de corrección) |
| **ADR-009** | Catálogo cerrado de once capacidades, matriz rol → capacidad como dato exhaustivo, motor puro y síncrono, `WorkspaceScope` de tres campos con `WorkspaceId` marcado, traducción HTTP con 404 único e indistinguible. **Sin Row-Level Security** (`OD-18` cerrada) y sin librería externa de autorización. | Iteración 2D |

### De producto

| # | Decisión | Dónde | Iteración |
|---|---|---|---|
| D-01 | Cuatro ejes de estado independientes: visibilidad, publicación, estado funcional, estado de revisión | `ROLES-AND-PERMISSIONS.md` §3 | 0 |
| D-02 | Un `CLIENT` ve una entidad **publicable** solo si es `CLIENT_VISIBLE` **y** `PUBLISHED` | ídem §4.1 | 0, matizada en 0.1 |
| D-03 | El tiempo vive en `work_session_segments`; la duración es la suma de segmentos, nunca fin − inicio | `DATA-MODEL.md` §4.10 | 0 |
| D-04 | El cliente nunca lee sesiones; recibe agregados publicados | `ROLES-AND-PERMISSIONS.md` §6.1 | 0 |
| D-05 | Publicar exige vista previa como cliente; nunca es un solo clic | `UI-WIREFRAMES.md` §5 | 0 |
| D-06 | Publicar con enlaces a contenido interno se **detiene**; nada se eleva en silencio | `USER-FLOWS.md` F5 | 0 |
| D-07 | Un hijo nunca es más visible que su padre | `DATA-MODEL.md` §8 R2 | 0 |
| D-08 | `reviews` es append-only; cambiar de opinión encadena, no sobrescribe | `DATA-MODEL.md` §4.16 | 0 |
| D-09 | El tipo de workspace es intención, no permiso; los permisos vienen del rol | `PRODUCT-SCOPE.md` §3 | 0 |
| D-10 | Navegación del propietario en 4 secciones; *Workspaces* a la cabecera + Ajustes | `INFORMATION-ARCHITECTURE.md` §2.1 | **confirmada 0.1 (`K-01`)** |
| D-11 | Navegación del cliente en 5 secciones; *Evidencias* como índice contextual dentro de *Actividad* | ídem §2.2 | **confirmada 0.1 (`K-02`)** |
| D-12 | Prefijos de ruta separados: `/w` propietario, `/c` cliente | ídem §4 | 0 |
| D-13 | Accesos rápidos de demostración solo con `DEMO_MODE=true`, comprobado en servidor | `UI-WIREFRAMES.md` §1 | 0 |
| D-14 | Como máximo una sesión `RUNNING` por usuario | `DATA-MODEL.md` §8 R6 | 0 |
| D-15 | No se mueve contenido entre workspaces | `ADR-002` §7 | 0 |
| D-16 | El servidor es la autoridad para todas las marcas de tiempo | `USER-FLOWS.md` F3 | 0 |
| D-17 | Sin permiso se responde 404, nunca 403 | `ADR-002` §3 | 0 |
| D-18 | La interfaz del cliente es una aplicación distinta, no la del propietario con elementos ocultos | `UI-WIREFRAMES.md` | 0 |
| **D-19** | El workspace se identifica por `public_id` opaco. El nombre es decorativo, sin unicidad global ni mensajes de "nombre en uso" | `DATA-MODEL.md` §4.3.1, `ADR-002` §9 | **0.1** |
| **D-20** | Evidencias multi-contexto vía `evidence_links`. Visibilidad **conjuntiva**: contexto accesible **y** evidencia `CLIENT_VISIBLE` + `PUBLISHED` | `DATA-MODEL.md` §4.12 | **0.1** |
| **D-21** | `reviews` contiene solo respuestas enviadas. `PENDING` eliminado del enum; lo pendiente se deriva. Cliente con `C` y `R`, sin `U` | `DATA-MODEL.md` §4.16.1 | **0.1** |
| **D-22** | Clases de entidad: publicable, estructural con visibilidad, derivada, canal del cliente, de sistema. La regla `CLIENT_VISIBLE + PUBLISHED` solo aplica a las publicables | `ROLES-AND-PERMISSIONS.md` §4 | **0.1** |
| **D-23** | El cliente accede a `projects` de forma derivada y a nivel de etiqueta. Sin listado, sin ruta, sin `description` | `DATA-MODEL.md` §5.3 | **0.1** |
| **D-24** | Relaciones N:M como entidades: `work_cycle_items`, `daily_update_work_items`, `meeting_attendees`, `evidence_links`. Sin listas de claves foráneas | `DATA-MODEL.md` §6 | **0.1** |
| **D-25** | UTC en almacenamiento; zona IANA **obligatoria** por workspace; preferencia IANA opcional por usuario; límites de día y ciclo en la zona del workspace | `DATA-MODEL.md` §7 | **0.1 (`OD-07`)** |
| **D-26** | `CLIENT_REQUEST` es contexto de conversación. `related_thread_id` eliminado; `origin_thread_id` conservado con otro significado | `DATA-MODEL.md` §4.14 | **0.1** |
| **D-27** | Iniciar una segunda sesión exige confirmación explícita; pausa y arranque son una operación atómica | `USER-FLOWS.md` F3 A2 | **0.1** |
| **D-28** | Sin recuperación de contraseña por autoservicio en el MVP. Restablecimiento administrativo de un solo uso | `ROLES-AND-PERMISSIONS.md` §9.1 | **0.1** |
| **D-29** | `discussion_threads` no almacena `visibility`: se resuelve contra el ancla en cada consulta | `DATA-MODEL.md` §4.13 | **0.1** |
| **D-30** | La revisión del cliente es informativa: no cambia `cycle_state`. El propietario cierra o reabre, y cerrar sin revisión deja constancia | `ROLES-AND-PERMISSIONS.md` §7.3 | **0.1 (`OD-03`)** |
| **D-31** | Varios `CLIENT` por workspace; un usuario en varios workspaces; rol por membresía, nunca global; `(workspace_id, user_id)` único | `ROLES-AND-PERMISSIONS.md` §2.1 | **0.1 (`OD-02`, `OD-11`)** |
| **D-32** | Un work item participa en varios ciclos vía `work_cycle_items`, sin duplicarse, conservando planificación, procedencia y estado al inicio y al cierre | `DATA-MODEL.md` §4.8 | **0.1 (`OD-08`)** |
| **D-33** | El cliente escribe en **cuatro** canales: mensajes, solicitudes, revisiones y propuestas de agenda | `ADR-003` §1 | **0.1** |
| **D-34** | Un workspace **archivado** con membresía activa **concede** resolución de acceso, marcada `workspaceStatus: ARCHIVED`. No es un 404. La restricción a solo lectura la impone la autorización por acción (2D) | `USER-FLOWS.md` F1 A3 y F14, `ADR-002` §2 | **2C** |
| **D-35** | El contexto de acceso tiene exactamente cuatro campos: `userId`, `workspaceId`, `role`, `workspaceStatus`. Sin identificador de membresía, sin marcas de tiempo, sin correo, nombre, token ni sesión, sin el workspace completo. Inmutable y serializable | `src/application/access/workspace-access-context.ts` | **2C** |
| **D-36** | La entrada externa es siempre `workspaces.public_id`; el `workspaces.id` interno solo puede proceder de PostgreSQL y nunca entra desde fuera | `ADR-002` §9 (A7), 2C | **2C** |
| **D-37** | Catálogo **cerrado** de once capacidades, con una capacidad por fila distinta de `ROLES-AND-PERMISSIONS.md` §8. `workspace.create` no es una capacidad de workspace; `visibility` y `publication_state` son filtros, no capacidades; la propiedad del registro es un filtro de fila | `ROLES-AND-PERMISSIONS.md` §12, `ADR-009` §1 | **2D** |
| **D-38** | La matriz rol → capacidad es un `Record` exhaustivo, no condicionales. `review.submit` y `request.create` están **denegadas para OWNER** y permitidas para CLIENT: no existe atajo por OWNER | ídem §12.2, `ADR-009` §2 | **2D** |
| **D-39** | Workspace archivado: `READ` permitida, `MUTATION` denegada, como **regla general** en un solo lugar. El rol se evalúa **antes** del archivado, para no revelar qué podría hacer otro rol | ídem §12.3, `ADR-009` §3 | **2D** |
| **D-40** | `WorkspaceScope` tiene exactamente `workspaceId` (nominal), `userId` y `role`. Sin `workspaceStatus`, sin capacidades, sin transacción. El **dueño del tipo nominal es el módulo `workspaces`** y su único punto de marcado es la frontera de persistencia del módulo, no la capa de aplicación: ni una cadena ordinaria ni un `WorkspaceAccessContext` fabricado a mano compilan. Es una comprobación de compilación, no un control de ejecución, y no sustituye al filtro `workspace_id` de las consultas | `ADR-005` §3.6.1, `ADR-009` §7 | **2D** |
| **D-41** | Traducción externa: `401` sin sesión o identidad archivada · `500` para `IDENTITY_NOT_PROVISIONED`, que es invariante roto y no denegación · `404` **idéntico** para workspace inexistente, ajeno y falta de capacidad · `409 {"code":"WORKSPACE_ARCHIVED"}` para el archivado. `Response` estándar, nunca `NextResponse` | `ADR-009` §6, `ADR-002` §3 (A9, A10) | **2D** |
| **D-42** | **Sin Row-Level Security en el MVP actual** (`OD-18` cerrada). El aislamiento primario es contexto + capacidades + scope + queries filtradas + pruebas contra PostgreSQL real. Reevaluación obligatoria antes de exponer usuarios externos reales | `ADR-009` §8 | **2D** |

## 6. Decisiones abiertas

**No implementes nada que dependa de una de estas.** Detente y pregunta.

| # | Decisión | Bloquea | Impacto si se decide tarde |
|---|---|---|---|
| **OD-01** | ¿Qué granularidad de horas se publica: total del ciclo, por día, por funcionalidad o por tipo de actividad? ¿Se congela al publicar o se recalcula? | Iteración 4 | Medio. Afecta a `hours_snapshot` y a la pantalla del cliente. |
| **OD-04** | ¿Se puede editar o despublicar algo ya publicado? ¿Con qué rastro para el cliente? | Iteración 4 | Medio. Afecta a la confianza: un cliente que ve cambiar lo leído. |
| **OD-05** | ¿Las evidencias son solo enlaces o también archivos alojados? | Post-MVP | Alto si se decide tarde: almacenamiento, límites, seguridad, coste. |
| **OD-06** | ¿Los mensajes se pueden editar o borrar? ¿Ventana de tiempo? ¿Qué ve el otro? | Iteración 6 | Bajo. |
| **OD-09** | ¿Hay notificaciones (correo o en la aplicación)? ¿Para qué eventos? De ello depende también la recuperación de contraseña por autoservicio. | Post-MVP | Bajo. Pero si el cliente no vuelve solo, sube a alto. |
| **OD-10** | Política de solicitudes: ¿límite de peticiones abiertas por cliente? ¿El work item derivado nace `CLIENT_VISIBLE` automáticamente? | Iteración 6 | Bajo. |
| **OD-12** | Retención de `audit_events`, especialmente los de acceso del cliente. ¿Cuánto tiempo? ¿Se agregan? | Iteración 5 | Bajo al principio; crece con el volumen. |
| **OD-13** | ¿Integración con calendario externo para reuniones? | Post-MVP | Bajo. Hoy fuera de alcance. |
| **OD-14** | Idioma de la interfaz: solo español, solo inglés, o bilingüe. | Post-MVP | Medio si se decide tarde: reescritura de todos los textos. |
| **OD-15** | Uso de herramientas y agentes: qué se registra, manual o estimado, y cómo se relaciona con las sesiones. | Post-MVP | Bajo. `DATA-MODEL.md` §9 deja la puerta abierta. |
| **OD-16** | ¿Exportación de informes (PDF/CSV)? ¿Qué contiene un informe de cierre exportado? | Post-MVP | Bajo. **Nueva en 0.1**: antes se referenciaba erróneamente como `OD-09`. |
| **OD-17** | Con varios `CLIENT` en un workspace, ¿ve cada uno las solicitudes y revisiones de los demás? | Iteración 5 | Medio. **Nueva en 0.1**, surgida al cerrar `OD-02`. **Valor por defecto del MVP: cada cliente ve solo lo suyo** — el conservador. Si representan a una misma organización, probablemente convenga compartirlas. |
| **OD-19** | ¿Quién puede **restaurar un workspace archivado** y mediante qué operación? Hoy nada lo define: la matriz de acciones de `ROLES-AND-PERMISSIONS.md` §8 no tiene fila, `DATA-MODEL.md` §4.17 no lista el evento de auditoría y `USER-FLOWS.md` menciona el estado archivado solo como consecuencia (F1 A3, F7). El campo `workspaces.archived_at` existe y D-34 depende de él, pero nadie ha decidido quién lo escribe | Administración del workspace | Medio. **Nueva en 2D.** Cuando se decida, restaurar será *una mutación que debe permitirse estando archivado*: la primera excepción a D-39, y por eso conviene decidirla antes de que existan más capacidades de mutación. **2D no añade ninguna capacidad de restauración.** |

### Decisiones técnicas cerradas en la iteración 1

Ninguna era un `OD-xx`: eran huecos técnicos, no decisiones de producto pendientes.
Framework y lenguaje (ADR-004) · motor de datos, capa de acceso y migraciones (ADR-005) ·
mecanismo de sesión (ADR-006) · runtime, artefacto y despliegue (ADR-007) · estrategia de pruebas
(ADR-008).

**`OD-07` (zonas horarias), que la iteración 0.1 marcaba como bloqueante de esta iteración, ya
estaba cerrada y se ha traducido a esquema**: `timestamptz` para instantes, `date` para fechas
civiles, zona IANA obligatoria en el workspace (`ADR-005` §3.4).

### Cerradas en la iteración 0.1

| # | Cierre |
|---|---|
| `K-01` | El workspace es contexto raíz: se selecciona desde la cabecera, se administra en Ajustes y **no** es sección de navegación principal. → D-10 |
| `K-02` | *Evidencias* no es sección principal del cliente: es pestaña o índice contextual dentro de *Actividad*, y las evidencias siguen apareciendo dentro de actualizaciones, funcionalidades y ciclos. → D-11 |
| `OD-02` | Varios `CLIENT` por workspace; un usuario en varios workspaces; `(workspace_id, user_id)` único. El MVP arranca con un cliente, pero el modelo no lo asume. → D-31 |
| `OD-03` | La revisión es informativa; no cambia `cycle_state`; el propietario puede cerrar sin revisión dejando constancia y decide si reabre tras `CHANGES_REQUESTED`. → D-30 |
| `OD-07` | UTC + zona IANA obligatoria por workspace (`America/Lima` en el ejemplo), preferencia opcional por usuario, límites de día y ciclo en la zona del workspace, sin abreviaturas. → D-25 |
| `OD-08` | `work_cycle_items`: un work item participa en varios ciclos sin duplicarse, conservando planificación, procedencia y estado al inicio y al cierre. → D-32 |
| `OD-11` | El rol nunca es global; se define por membresía. → D-31 |

### Cerradas en la iteración 2D

| # | Cierre |
|---|---|
| `OD-18` | **No se adopta Row-Level Security** en el MVP actual. El pool comparte un usuario de aplicación y ninguna transacción propaga el actor por `SET LOCAL`; RLS parcial daría una falsa seguridad peor que no tenerla. El aislamiento primario es `WorkspaceAccessContext` + capacidades cerradas + `WorkspaceScope` + queries filtradas en el `WHERE` + pruebas contra PostgreSQL real + fronteras estructurales. Diferirla es reversible: el scope ya transporta `workspaceId` y `userId`, los dos valores que RLS necesitaría fijar como variables de sesión, así que adoptarla sería añadir `SET LOCAL` y las políticas SQL sin rehacer el acceso a datos. **Revisión obligatoria** cuando se invite al primer usuario externo real o aparezca un consumidor del `Pool` fuera de la capa de autorización. Ver [`ADR-009`](decisions/ADR-009-workspace-authorization.md) §8. → D-42 |
| `K-24` | La cabecera del workspace la lee **cualquier miembro activo**; la lista de miembros y la auditoría son **solo del `OWNER`**. Resuelve la contradicción entre `ROLES-AND-PERMISSIONS.md` §4.1 («solo OWNER» para la clase de sistema), §5 (que daba `R` a MEMBER y VIEWER sobre `workspace_members`) y §7.1 («`workspace_members` no legible»). → `workspace.read` para los cuatro roles; `membership.read` y `audit.read` solo OWNER |
| `K-25` | **Crear una solicitud es exclusivo del `CLIENT`.** §8 decía «OWNER ✔ · MEMBER ✔ · CLIENT ✔», contra la matriz de §5 y contra la afirmación de que las cuatro celdas en negrita son *toda* la escritura del cliente. Se resuelve a favor de §5 y `ADR-003`: la cola es un canal del cliente y el propietario entra por el triaje. → `request.create` separado de `collaboration.participate` |
| `K-26` | **Crear un workspace no es una acción acotada a workspace.** La fila de §8 calificaba por rol, imposible cuando el rol se define por membresía (`OD-11`): en ese momento el actor no tiene rol. La fila se conserva por su evento de auditoría con las cuatro columnas a `—`. → sin capacidad `workspace.create` |

## 7. Contradicciones

### 7.1 Resueltas en la iteración 0 *(confirmadas)*

| # | Tensión | Resolución |
|---|---|---|
| K-03 | El cliente puede *registrar solicitudes* pero no *modificar el backlog* | Cola `client_requests` independiente + triaje explícito (`ADR-003`) |
| K-04 | «Borradores privados» mezclaba publicación y visibilidad | Dos ejes independientes (D-01) |
| K-05 | El cliente comenta «en el contexto de una funcionalidad», pero hay funcionalidades internas | Solo comenta lo que ya ve; los hilos derivan del ancla |
| K-06 | `IN_REVIEW` en un workspace `PERSONAL` sin revisor | Sin miembros `CLIENT`, la transición es `ACTIVE → CLOSED` |
| K-07 | «Estado de revisión» como eje del ciclo, pero las revisiones son entradas encadenadas | Se deriva de la última revisión de cada cliente; no se almacena duplicado |
| K-08 | El login de demostración presupone autenticación, prohibida en esta fase | Se especifica sin implementar |
| K-09 | El cliente «consulta horas publicadas», pero las horas viven en sesiones que no puede leer | Recibe agregados publicados (D-04). Granularidad: `OD-01` |

### 7.2 Corregidas en la iteración 0.1

| # | Contradicción | Corrección |
|---|---|---|
| **K-10** | `reviews` se declaraba *append-only* y a la vez se creaba una fila `PENDING` por cliente al publicar — una fila que después habría que actualizar | `PENDING` eliminado del enum; lo pendiente se deriva; publicar no escribe en `reviews`; evento `review.requested` eliminado. → D-21 |
| **K-11** | La regla `CLIENT_VISIBLE + PUBLISHED` se aplicaba a *cualquier* registro, pero la mitad de las entidades no tiene `publication_state` | Clasificación por clases y regla de acceso por clase. → D-22 |
| **K-12** | `evidence_items` tenía una asociación única `attached_to_type/_id`, obligando a duplicar una evidencia por cada contexto, cada copia con su propia visibilidad | `evidence_links` como relación N:M + regla de visibilidad conjuntiva. → D-20 |
| **K-13** | El `slug` global del workspace era identificador de ruta y se validaba por unicidad: adivinable y oráculo de existencia, contra `ADR-002` §3 | `public_id` opaco en rutas; nombre decorativo sin unicidad global. → D-19 |
| **K-14** | Listas de claves foráneas (`linked_work_item_ids`, `attendee_user_ids`) usadas como relaciones, sin atributos ni integridad | Cuatro entidades de relación. → D-24 |
| **K-15** | `client_requests.related_thread_id` apuntaba a un hilo sin ancla propia — un hilo suelto, justo lo que `ADR-003` §8 prohíbe | `CLIENT_REQUEST` como `context_type`; `origin_thread_id` conservado con otro significado. → D-26 |
| **K-16** | `USER-FLOWS` F3 A2 decía que la sesión anterior *"se pausa automáticamente"*; el wireframe mostraba un diálogo de confirmación | Confirmación obligatoria + operación atómica, en ambos documentos. → D-27 |
| **K-17** | El wireframe de login ofrecía *"¿Olvidaste tu contraseña?"* sin flujo detrás y sin correo en el alcance | Enlace retirado; restablecimiento administrativo documentado. → D-28 |
| **K-18** | `ADR-003` contaba «tres puntos de escritura» y luego describía cuatro; `ROLES` hablaba de «tres celdas` | Cuatro canales, contados igual en todos los documentos. → D-33 |
| **K-19** | `PRODUCT-SCOPE` remitía la exportación de informes a `OD-09`, que trata de notificaciones | Creada `OD-16` para exportación |
| **K-20** | `discussion_threads` almacenaba `visibility` copiada del ancla, susceptible de desincronizarse | Campo eliminado; la accesibilidad se resuelve contra el ancla. → D-29 |
| **K-21** | El README describía la vista del cliente como *"de solo lectura"*, incompatible con comentar, solicitar y aprobar | *"Vista publicada con interacción controlada"* |
| **K-22** | `ADR-001` afirmaba «escalado únicamente vertical», confundiendo la prioridad del MVP con un límite arquitectónico | Aclarado: vertical primero, horizontal posible sin rediseño, con la disciplina de no guardar estado con autoridad en el proceso |
| **K-23** | Nada definía cómo accede el cliente al proyecto que contiene contenido publicado | Acceso derivado a nivel de etiqueta, sin listado ni ruta. → D-23 |

### 7.3 Corregidas en la iteración 2D

| # | Contradicción | Corrección |
|---|---|---|
| **K-24** | `ROLES-AND-PERMISSIONS.md` §4.1 clasificaba `workspaces` y `workspace_members` como entidades de sistema accesibles «solo `OWNER`», mientras la matriz de §5 daba `R` a `MEMBER` y `VIEWER` en ambas filas, y §7.1 afirmaba que `workspace_members` «no es legible». Tres pasajes, dos respuestas | Se separan dos cosas que la clase «de sistema» mezclaba: la **cabecera del workspace** la lee cualquier miembro activo —sin ella no se puede pintar el contexto en el que ya se está—, y la **lista de miembros y la auditoría** son del `OWNER`. §4.1 y §5 corregidos. → `workspace.read`, `membership.read`, `audit.read` |
| **K-25** | §8 daba «Crear solicitud» a `OWNER`, `MEMBER` y `CLIENT`; §5 no daba `C` sobre `client_requests` a ninguno de los dos primeros, y remataba que las cuatro celdas en negrita eran *toda* la escritura del cliente | Resuelta a favor de §5 y [`ADR-003`](decisions/ADR-003-client-interaction.md): la cola de solicitudes es un canal del cliente y el propietario entra por el triaje, no creando peticiones a sí mismo. Fila de §8 corregida a `✖ ✖ ✔ ✖`. → `request.create` solo `CLIENT` |
| **K-26** | §8 calificaba «Crear workspace» por rol (`OWNER ✔ · MEMBER ✔`), imposible cuando el rol se define por membresía (`OD-11`, D-31): en ese instante el actor no tiene rol en ningún workspace | Marcada como acción **no acotada a workspace**, con las cuatro columnas a `—` y su evento de auditoría intacto. F1 ya lo decía bien: «cualquier usuario autenticado». → ninguna capacidad `workspace.create` |

**Ninguna contradicción queda pendiente de confirmación.**

## 8. Riesgos vigentes

| # | Riesgo | Gravedad | Estado |
|---|---|---|---|
| R-01 | Fuga de datos entre workspaces | **Crítica** | Mitigada en diseño (ADR-002 A1–A10) y en estrategia: `WorkspaceScope` obligatorio (ADR-005 §3.6) y pruebas contra PostgreSQL real sin dobles (ADR-008 §3.5). **Más verificada en 2D**: la resolución exige membresía `ACTIVE`, la entrada externa es opaca, una cadena ordinaria ni un contexto construido con `workspaceId: string` compilan como identificador interno; el único marcado productivo permitido está en la frontera de persistencia del módulo `workspaces` y las respuestas de workspace inexistente, ajeno y sin capacidad son idénticas (A9, A10 verificadas). **Sigue crítica**: el filtrado por `workspace_id` de cada consulta de negocio (A2) no tiene ni una verificación, porque no existe ninguna entidad de negocio. Cerrar `OD-18` sin RLS no rebaja este riesgo — elige el mecanismo, no lo comprueba. |
| **R-14** | `domain_users.id` está vinculado a `"user".id` solo por el trigger `provision_domain_user`, sin clave foránea. Borrar un usuario en Better Auth dejaría identidad y membresías huérfanas | Media | **Nuevo en 2C.** Detectado, no explotable hoy: no existe borrado de cuentas. 2C lo detecta en tiempo de resolución (`IDENTITY_NOT_PROVISIONED`) y **2D lo traduce a `500`, no a una denegación**: un invariante roto no debe esconderse entre los 404 normales. Reforzar el esquema exigiría migración y sigue fuera de alcance. |
| **R-15** | Seis de las once capacidades no tienen todavía ninguna operación que las consuma. Su granularidad se decidió con la documentación delante, pero sin código que la contraste; una división equivocada obligaría a renombrar literales | Media | **Nuevo en 2D.** La agrupación no es inventada: sale de filas idénticas de `ROLES-AND-PERMISSIONS.md` §8. Regla de contención: **añadir** una capacidad es libre; **renombrarla o partirla** exige actualizar §12 en el mismo cambio. El coste está acotado porque los literales viven en un solo archivo, y una prueba de frontera lo garantiza (`ADR-009` T9-R12). |
| **R-16** | Sin RLS, un filtro `workspace_id` olvidado **no falla: devuelve datos**. Es el modo de fallo silencioso de `R-01` | **Crítica** | **Nuevo en 2D**, explícito al cerrar `OD-18`. Toda la mitigación son las pruebas de aislamiento por entidad de [`TESTING.md`](TESTING.md) §6, bloqueantes (T8-R6), más el `WorkspaceScope` no fabricable. Hoy **no hay ninguna entidad** que probar: el riesgo está aceptado y pendiente de verificación desde la iteración 3. |
| **R-17** | El esquema Drizzle de `workspace_members` y `workspaces` **no declara** las claves foráneas hacia `domain_users` que la migración `0000` sí creó (`workspace_members.user_id`, `workspace_members.invited_by`, `workspaces.created_by`). La base tiene tres restricciones que el código no conoce | Media | **Nuevo en 2D**, detectado al escribir las pruebas: borrar un `domain_users` con membresías falla por `ON DELETE RESTRICT`, algo que el esquema TypeScript no anticipa. `pnpm db:generate` no lo detecta porque compara el esquema con su propia instantánea, y a ambos les faltan las tres. **No corregido en 2D**: reconciliarlo exige tocar esquema o migración, ambas cosas fuera de alcance. Es defecto de sincronía, no de comportamiento: la base es la estricta. |
| **R-18** | Cada autorización cuesta dos viajes a PostgreSQL (validación de sesión + fila de acceso) y no se puede cachear | Baja | **Nuevo en 2D.** Aceptado a propósito: un rol cacheado es un permiso que sobrevive a su revocación (`ADR-002` §5, `ADR-006` T6-R1). Con un usuario es irrelevante. Vigilar si una petición llega a autorizar varias veces. |
| R-02 | Publicar contenido interno por descuido | Alta | Mitigada en diseño (D-05, D-06, R10 ampliada a evidencias). Sin verificar. |
| **R-11** | **Drizzle sigue por debajo de 1.0** y su 1.0 es una reescritura del motor de migraciones | Media | **Nuevo en la iteración 1.** Versión exacta `0.45.x`, sin beta. Mitigación de fondo: las migraciones son SQL plano y el esquema es PostgreSQL estándar — sustituir la capa de acceso no movería datos (ADR-005 §3.2.1). |
| **R-12** | **Concentración de proveedor**: Next.js es de Vercel y Better Auth se ha incorporado a Vercel | Media | **Nuevo en la iteración 1.** Ambos de código abierto y autohospedados. Mitigación: sin funciones de plataforma (T4-R7), Better Auth solo para autenticación y tras el módulo `identity` (T6-R3/R4), datos y membresías propios. Criterio de comprobación: la aplicación debe funcionar entera sin servicios de terceros (ADR-007 §4). |
| **R-13** | Divergencia entre desarrollo (nativo) y producción (contenedor) | Baja | **Nuevo en la iteración 1.** Se acota construyendo y arrancando la imagen en CI y ejecutando E2E contra ella (T7-1, T8-R7). |
| R-03 | El registro de tiempo resulta molesto y se abandona | Alta | Mitigada en diseño (criterio E4). Solo se comprueba con uso real. |
| R-04 | El cliente nunca entra en la aplicación | Media | Sin mitigar. Depende de `OD-09`. |
| R-05 | Crecimiento del alcance | Media | Mitigada: `PRODUCT-SCOPE.md` §5 es una lista de rechazos. |
| R-06 | Complejidad del modelo tras normalizar (4 entidades de relación nuevas) | Media | **Nuevo en 0.1.** El modelo es más correcto pero menos inmediato. Se mitiga con §5 y §6 de `DATA-MODEL.md`, que explican el porqué de cada relación. |
| R-07 | La documentación se desincroniza del código futuro | Media | Mitigada: skill `sync-docs` + criterio de terminado en `AGENTS.md` §4. |
| R-08 | Las horas se interpretan como una factura | Media | Mitigada en diseño: no hay sección *Horas*; siempre en contexto de resultado. |
| R-09 | Sobreingeniería para un usuario | Baja | Mitigada: ADR-001. |
| R-10 | Los nombres de ejemplo acaban en el código | Baja | Mitigada: `AGENTS.md` §3.6 lo declara defecto. |

`R-06` sustituye al antiguo riesgo de zonas horarias, ya cerrado con `OD-07`.

### 8.1 Verificaciones técnicas pendientes

Seis cosas que la documentación oficial no resuelve y que hay que comprobar al montar el andamiaje.
Ninguna bloquea la decisión; todas bloquean darla por buena.
Listadas en [`TECHNICAL-FOUNDATION.md`](TECHNICAL-FOUNDATION.md) §5: `moduleResolution` de Zod ·
`SameSite` por defecto de Better Auth · protección CSRF real · copia de `public/` y `.next/static`
en la imagen `standalone` · rendimiento de las bases por plantilla · comportamiento de los índices
parciales únicos.

**Estado de verificaciones tras 2D** (sin cambios respecto a 2C: la autorización no toca ninguna de
las seis):

- **T-1 (Zod + moduleResolution):** ✅ Verificada en 1.5C. Zod 4.4.3 funciona con `moduleResolution: "bundler"` de Next.js.
- **T-2 (`SameSite` por defecto de Better Auth):** ✅ Resuelta por configuración explícita en `internal/auth.ts` (`sameSite: 'lax'`, `useSecureCookies` en producción). La inspección de la cabecera `Set-Cookie` (T6-3) sigue siendo prueba E2E pendiente.
- **T-3 (protección CSRF real):** Pendiente. Requiere E2E (T6-8); no se ha verificado qué aporta Better Auth frente a lo que hay que añadir.
- **T-4 (standalone + public/.next/static):** ✅ Verificada en 1.5C. La imagen standalone se construye y ejecuta correctamente en contenedor Linux.
- **T-5 (bases por plantilla):** Pendiente. Hoy hay **una** base desechable `nj_worktrace_test` recreada por ejecución, con `fileParallelism: false`; el esquema de plantilla + base por trabajador de `TESTING.md` §5 no está implementado.
- **T-6 (índices parciales únicos):** ✅ Verificada en 2A. Los índices parciales de `workspace_members` existen y las pruebas de esquema los ejercitan.

## 9. Próximo paso recomendado

La iteración 2 está **terminada en cuanto a mecanismo**: `A1`, `A3`, `A4`, `A6`, `A7`, `A9` y `A10`
verificadas; `A2`, `A5` y `A8` sin verificar por falta de sujeto (no hay entidades de contenido ni alta
de workspace).

**Iteración 3 — registro de trabajo.** Es la primera que puede cerrar `A2`, y por eso es el paso
siguiente natural. Al crear la primera entidad de negocio hay que hacer, en el mismo cambio:

1. El primer repositorio con `WorkspaceScope` como primer parámetro (`ADR-005` §3.6.2, T5-R5).
2. La comprobación estructural de firmas de repositorio, que hoy no tendría nada que comprobar
   (`ADR-009`, condiciones de revisión).
3. Las pruebas de aislamiento por entidad de [`TESTING.md`](TESTING.md) §6, que son las que rebajarían
   `R-01` y `R-16`.
4. La primera operación que consuma `work.record`, y con ella la primera composición real de
   `WorkspaceScope` + transacción (T5-R14).

**Antes de la iteración 3 conviene cerrar `OD-19`** (restauración de un workspace archivado): será la
primera excepción a D-39, y decidirla cuando existan más capacidades de mutación es más caro.

**No empezar por la interfaz.** El aislamiento sigue siendo lo único cuyo fallo no se puede corregir a
posteriori sin rehacer lo construido encima, y su verificación depende de que existan datos que filtrar.

## 10. Registro de cambios

| Fecha | Cambio |
|---|---|
| 2026-07-29 | **Iteración 2D** — autorización por acción y `WorkspaceScope`. Catálogo cerrado de once capacidades derivado de filas idénticas de `ROLES-AND-PERMISSIONS.md` §8 (D-37), matriz rol → capacidad como `Record` exhaustivo con `review.submit` y `request.create` denegadas para OWNER (D-38), motor puro y síncrono (`decideWorkspaceAction`, `canWorkspace`) sin base, sin Better Auth, sin Next.js y sin librería externa. Workspace archivado en solo lectura como regla general, con el rol evaluado antes del archivado para no revelar qué podría hacer otro rol (D-39). `WorkspaceScope` de tres campos con `WorkspaceId` nominal, cuyo **único punto de marcado** es la frontera de persistencia del módulo `workspaces` (`internal/access.ts`, inmediatamente después del repositorio): desde ahí el identificador viaja marcado por la resolución de membresía, el contexto de acceso y el scope, sin ninguna aserción de tipo en la capa de aplicación. Ni una cadena ordinaria ni un `WorkspaceAccessContext` fabricado a mano compilan (D-40). Corregida la forma conceptual de `ADR-005` §3.6: `userId` en vez de `actor`, `role` incluido, transacción fuera. Traducción HTTP con `Response` estándar: `401` sin sesión o identidad archivada, `500` para el invariante roto de `R-14`, un `404` **único e idéntico** para workspace inexistente, ajeno y falta de capacidad, y `409 {"code":"WORKSPACE_ARCHIVED"}` para el archivado (D-41). `OD-18` **cerrada sin adoptar RLS** (D-42, `ADR-009` §8), con revisión obligatoria antes de exponer usuarios externos reales y sin rebajar `R-01`. Nueva `OD-19` (restauración de workspace archivado). Resueltas `K-24`, `K-25` y `K-26`. `ADR-002` gana `A9` y `A10`; `ADR-005`, `T5-R13` y `T5-R14`; `ADR-004` registra `platform/http/`. Fronteras: seis reglas nuevas de ESLint —cada frontera de ruta declarada en su forma con alias y en la forma que atrapa el especificador relativo equivalente— y siete comprobaciones nuevas en `tests/module-boundary.test.ts` (16 en total), que resuelven la ruta del import antes de comparar capas, de modo que escribir `../..` en vez de `@/` no evade ninguna. Incluyen «los literales de capacidad viven en dos archivos, y se afirma el conjunto observado» y «la marca de `WorkspaceId` se aplica en un único punto de `src/`». Deduplicado `WorkspaceStatus`, ahora propiedad del módulo `workspaces`. Helpers de identidad y workspaces extraídos a `tests/support/` sin cambio semántico. Pruebas: 19 → **144 unitarias** y 57 → **87 de integración**. Detectado `R-17` (el esquema Drizzle no declara tres claves foráneas que la migración `0000` sí creó), no corregido por estar fuera de alcance. Sin migraciones, sin cambios de esquema, sin dependencias nuevas, sin rutas, sin interfaz. |
| 2026-07-29 | **Iteración 2C** — contexto de acceso a workspace. Resolución server-side que compone cabeceras + sesión Better Auth + `domain_users` + `workspacePublicId` + membresía activa en un `WorkspaceAccessContext` de cuatro campos (D-35). Unión discriminada de resultados con precedencia actor → recurso: `UNAUTHENTICATED` → `IDENTITY_NOT_PROVISIONED` → `IDENTITY_ARCHIVED` → `WORKSPACE_NOT_FOUND` → `NO_ACTIVE_MEMBERSHIP` → `GRANTED`. Solo `status = ACTIVE` concede; `INVITED`, `SUSPENDED`, `REMOVED` y la ausencia de fila colapsan en `NO_ACTIVE_MEMBERSHIP` sin revelar el estado concreto. Workspace archivado con membresía activa concede (D-34). Entrada externa siempre `public_id` (D-36). Cerrada la superficie de Better Auth: `identity/index.ts` ya no exporta sus tablas, que pasan a `identity/database-schema.ts` con `platform/database/schema.ts` como único consumidor de producción; el handler de rutas se encapsula en `identity/server.ts` como `authHandler`. Ocho fronteras estructurales verificables en ESLint y en `tests/module-boundary.test.ts`. 19 pruebas de integración nuevas contra PostgreSQL real con identidades creadas por Better Auth. Sin migraciones, sin cambios de esquema, sin dependencias nuevas, sin autorización por acción, sin interfaz. Documentación obsoleta de `AGENTS.md` y de este documento sincronizada. |
| 2026-07-28 | **Iteración 2B** — autenticación y sesiones (PR #3, `1663932`, fusionada en `main`). Better Auth 1.6.25 con `@better-auth/drizzle-adapter`, sesiones persistidas en PostgreSQL, sin `cookieCache`, sin JWT, sin plugins de organización. Migración `0001_melted_abomination.sql` con las tablas `user`, `session`, `account`, `verification` y el trigger `provision_domain_user`, que provisiona `domain_users` de forma atómica al crear un usuario. Ruta `/api/auth/[...all]`. Cookies `httpOnly`, `secure` en producción y `SameSite=Lax` explícito. Pruebas de integración de registro, login, logout, sesión nula sin cookie, sesión no recuperable tras logout y rollback completo del signup ante fallo en `account` o en `session`. |
| 2026-07-28 | **Iteración 2A** — esquema de identidad y workspaces (PR #2, `477a79f`, fusionada en `main`). Tablas `domain_users`, `workspaces`, `workspace_members` con enums cerrados (`workspace_type`, `member_role`, `member_status`, `visibility`). Restricciones CHECK para validación de datos (display_name no vacío, timezone no vacío, cycle_length_days > 0, cycle_start_weekday 1-7, combinaciones válidas de status/fechas). Índices parciales para membresías activas. Trigger diferido para invariante de OWNER activo. Migración versionada `0000_overjoyed_nocturne.sql`. Scripts `db:generate`, `db:migrate`, `db:test:reset`, `db:reset`. Base de pruebas desechable `nj_worktrace_test`. Pruebas de integración para esquema, restricciones e invariante de OWNER. CI actualizado para preparar bases y aplicar migraciones. |
| 2026-07-28 | **Iteración 1.5D** — integración continua mínima. Workflow `.github/workflows/ci.yml` con activadores en push/PR a main y workflow_dispatch. Verifica: instalación reproducible, lint, TypeScript, pruebas unitarias, pruebas de integración contra PostgreSQL 18 real, build de Next.js, build de imagen Docker, arranque de contenedor, health check, readiness, recurso estático y usuario no root. Mecanismo de espera con bucle para servicios healthy (máx 30 intentos, 2s entre intentos). Limpieza y diagnóstico con `if: always()`. Sin secretos reales. Permisos mínimos (contents: read). Ejecución remota pendiente hasta primer push. |
| 2026-07-28 | **Iteración 1.5C** — artefacto de producción en contenedor. Dockerfile multi-etapa con Node.js 24 slim, Corepack, pnpm 11.17.0. Imagen con output `standalone` de Next.js. Usuario no root (uid=1001). Tamaño: 376MB (91.4MB comprimido). Servicio `app` en compose.yaml con health check. Conexión a PostgreSQL mediante red Docker interna. Endpoints verificados: `/api/health`, `/api/ready`, `/container-check.txt`. Comportamiento sin PostgreSQL: health 200, ready 503, sin uncaughtException. Recuperación automática al restaurar PostgreSQL. Build funciona sin PostgreSQL activo. Sin secretos en la imagen. |
| 2026-07-28 | **Iteración 1.5B** — persistencia local mínima. Docker Compose con PostgreSQL 18. Drizzle ORM 0.45.2 + drizzle-kit 0.31.10 (versiones exactas, líneas independientes). Capa de base de datos con pool de pg (máx 4 conexiones). Endpoints `/api/health` (liveness) y `/api/ready` (readiness). Script `db:check` para verificación manual. Pruebas de integración contra PostgreSQL real. Variables de entorno validadas con Zod (`DATABASE_URL` requerida). Sin migraciones, sin tablas de dominio. |
| 2026-07-28 | **Iteración 1.5A** — cimentación ejecutable. Next.js 16.2.12, TypeScript 5.9.3 estricto (5 opciones), Tailwind 4.3.3, Zod 4.4.3, Vitest 4.1.10. Estructura modular con frontera impuesta por ESLint y prueba de arquitectura. Health check funcional con contrato separado. Validación de entorno centralizada. Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `verify`. Todas las validaciones pasan. Sin base de datos, sin autenticación, sin interfaz de dominio. |
| 2026-07-28 | **Corrección final de la iteración 1** — tres precisiones técnicas sobre ADR-005, ADR-006 y ADR-008: (1) `drizzle-orm` y `drizzle-kit` tienen líneas de versión **independientes**, cada una exacta, verificadas como combinación compatible — no se exige que coincidan en número; (2) Vitest fijado en **`4.1.x`** (estable) en lugar de `5.x` (beta), con la adopción de Vitest 5 movida a condición de revisión; (3) el comportamiento de `DEMO_MODE=false` se corrige: las rutas de demostración existen por estructura de archivos de Next.js y responden **404 antes de ejecutar lógica**, no se "desregistran" dinámicamente; la protección de fondo sigue siendo que `DEMO_MODE=true` en producción impide el arranque. Sincronizados: ADR-005, ADR-006, ADR-008, `TECHNICAL-FOUNDATION.md`, `CURRENT-STATE.md`. Sin tocar `UI-WIREFRAMES.md`, que conserva la misma imprecisión en su §1 y queda pendiente para una corrección posterior fuera de este alcance. |
| 2026-07-28 | **Iteración 1** — decisiones técnicas. 5 ADRs nuevos (004–008), 3 documentos técnicos (`TECHNICAL-FOUNDATION`, `ENVIRONMENTS`, `TESTING`), 1 decisión abierta nueva (`OD-18`, RLS), 3 riesgos nuevos (R-11 Drizzle pre-1.0, R-12 concentración de proveedor, R-13 divergencia de entornos), 6 verificaciones técnicas pendientes. Los 10 puntos de la prueba de compatibilidad conceptual se cumplen. Iteración 1.5 añadida al plan. Quedan 13 decisiones abiertas. |
| 2026-07-28 | **Iteración 0.1** — normalización. 7 decisiones cerradas (`K-01`, `K-02`, `OD-02`, `OD-03`, `OD-07`, `OD-08`, `OD-11`), 15 decisiones de producto nuevas (D-19…D-33), 14 contradicciones corregidas (K-10…K-23), 2 decisiones abiertas nuevas (`OD-16`, `OD-17`), 4 entidades de relación añadidas, 3 ADRs revisados. Quedan 12 decisiones abiertas, ninguna bloquea las iteraciones 1–3. |
| 2026-07-28 | **Iteración 0** — fundación documental. 15 decisiones abiertas, 3 ADRs, 18 decisiones de producto, 9 contradicciones documentadas. |
