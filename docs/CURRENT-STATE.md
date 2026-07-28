# CURRENT STATE

**Última actualización: 2026-07-28 — iteración 1.5C, artefacto de producción en contenedor**

Estado real del proyecto. Este documento se actualiza en **todo** cambio. Si dice algo que no es
cierto, es un defecto.

---

## 1. Estado en una línea

**Iteración 1.5C completa: artefacto de producción en contenedor Linux.** Imagen Docker multi-etapa
con Node.js 24 slim, output `standalone` de Next.js, usuario no root, conexión a PostgreSQL local
mediante Docker Compose. El dominio todavía no está implementado. No hay migraciones, ni
autenticación, ni interfaz de usuario funcional.

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
│       └── ADR-008-testing-strategy.md          ← iteración 1
├── src/
│   ├── app/
│   │   ├── layout.tsx        layout raíz
│   │   ├── page.tsx          página temporal técnica
│   │   ├── globals.css       Tailwind + variables
│   │   └── api/
│   │       ├── health/
│   │       │   └── route.ts  GET /api/health (liveness)
│   │       └── ready/
│   │           └── route.ts  GET /api/ready (readiness)
│   ├── modules/
│   │   ├── identity/
│   │   │   ├── index.ts      superficie pública (placeholder)
│   │   │   └── internal/     acceso prohibido desde fuera
│   │   └── workspaces/
│   │       ├── index.ts      superficie pública (placeholder)
│   │       └── internal/     acceso prohibido desde fuera
│   ├── application/          servicios de aplicación (vacío)
│   ├── platform/
│   │   ├── env.ts            validación de entorno con Zod
│   │   ├── health.ts         contrato del health check
│   │   ├── readiness.ts      contrato del readiness check
│   │   └── database/
│   │       ├── client.ts     Pool de pg + cliente Drizzle
│   │       ├── health.ts     verificación de conexión
│   │       └── schema.ts     esquema (vacío, sin tablas de dominio)
│   └── ui/                   componentes compartidos (vacío)
├── public/
│   └── container-check.txt   Recurso estático de verificación
├── scripts/
│   ├── db-check.ts           script de verificación de base de datos
│   └── container-check.ts    script de verificación del contenedor
├── tests/
│   ├── health.test.ts        contrato del health check
│   ├── readiness.test.ts     contrato del readiness check
│   ├── env.test.ts           validación de entorno
│   ├── module-boundary.test.ts  frontera modular
│   └── integration/
│       └── database.test.ts  prueba de integración con PostgreSQL real
└── .claude/skills/
    ├── plan-iteration/SKILL.md
    ├── verify-change/SKILL.md
    └── sync-docs/SKILL.md
```

## 3. Qué NO existe

Sin migraciones · sin tablas de dominio · sin autenticación implementada · sin CI · sin despliegue
remoto · sin integración con GitHub · sin captura de agentes o tokens · sin pagos · sin interfaz
de usuario funcional (solo página temporal técnica).

**El stack de producción está creado pero sin esquema de dominio**: la imagen Docker se construye
y ejecuta correctamente, pero no hay tablas de negocio todavía.

## 4. Estado de Git

- Rama actual: **`feat/persistence-foundation`**
- Rama principal: `main`
- Historial: **3 commits** previos a la iteración 1.5B.
- Cambios de la iteración 1.5B: **sin confirmar**, en el árbol de trabajo.
- No se ha hecho `commit` ni `push` — restricción de `AGENTS.md` §5.3.

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
| **OD-18** | ¿Se añade **Row-Level Security** de PostgreSQL como refuerzo del aislamiento, además del `WorkspaceScope` de la capa de datos? | Iteración 2 | Medio. **Nueva en la iteración 1** (`ADR-005` §3.6). RLS con un usuario de aplicación único exige propagar el actor por variable de sesión; hacerlo a medias da falsa seguridad. Decidible dentro de la iteración 2, con medidas reales delante. |

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

**Ninguna contradicción queda pendiente de confirmación.**

## 8. Riesgos vigentes

| # | Riesgo | Gravedad | Estado |
|---|---|---|---|
| R-01 | Fuga de datos entre workspaces | **Crítica** | Mitigada en diseño (ADR-002 A1–A8) y ahora también en estrategia: `WorkspaceScope` obligatorio (ADR-005 §3.6) y pruebas contra PostgreSQL real sin dobles (ADR-008 §3.5). Sin verificar: no hay código. |
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

**Estado de verificaciones en 1.5C:**

- **T-1 (Zod + moduleResolution):** ✅ Verificada. Zod 4.4.3 funciona con `moduleResolution: "bundler"` de Next.js.
- **T-2, T-3:** Pendientes de iteración 2 (requieren Better Auth).
- **T-4 (standalone + public/.next/static):** ✅ Verificada. La imagen standalone se construye y ejecuta correctamente en contenedor Linux.
- **T-5 (bases por plantilla):** Pendiente de iteración 2 (requiere migraciones).
- **T-6 (índices parciales únicos):** Pendiente de iteración 2 (requiere esquema de dominio).

## 9. Próximo paso recomendado

**Iteración 2 — aislamiento por workspace.** La siguiente iteración debe:

1. Esquema de dominio mínimo (workspaces, usuarios, membresías).
2. Migraciones con Drizzle.
3. Pruebas de aislamiento A1–A8 de `ADR-002`.
4. Better Auth para autenticación.

**No empezar por la interfaz.** La iteración 2 sigue siendo la única cuyo fallo no se puede corregir
a posteriori sin rehacer lo construido encima.

## 10. Registro de cambios

| Fecha | Cambio |
|---|---|
| 2026-07-28 | **Iteración 1.5C** — artefacto de producción en contenedor. Dockerfile multi-etapa con Node.js 24 slim, Corepack, pnpm 11.17.0. Imagen con output `standalone` de Next.js. Usuario no root (uid=1001). Tamaño: 376MB (91.4MB comprimido). Servicio `app` en compose.yaml con health check. Conexión a PostgreSQL mediante red Docker interna. Endpoints verificados: `/api/health`, `/api/ready`, `/container-check.txt`. Comportamiento sin PostgreSQL: health 200, ready 503, sin uncaughtException. Recuperación automática al restaurar PostgreSQL. Build funciona sin PostgreSQL activo. Sin secretos en la imagen. |
| 2026-07-28 | **Iteración 1.5B** — persistencia local mínima. Docker Compose con PostgreSQL 18. Drizzle ORM 0.45.2 + drizzle-kit 0.31.10 (versiones exactas, líneas independientes). Capa de base de datos con pool de pg (máx 4 conexiones). Endpoints `/api/health` (liveness) y `/api/ready` (readiness). Script `db:check` para verificación manual. Pruebas de integración contra PostgreSQL real. Variables de entorno validadas con Zod (`DATABASE_URL` requerida). Sin migraciones, sin tablas de dominio. |
| 2026-07-28 | **Iteración 1.5A** — cimentación ejecutable. Next.js 16.2.12, TypeScript 5.9.3 estricto (5 opciones), Tailwind 4.3.3, Zod 4.4.3, Vitest 4.1.10. Estructura modular con frontera impuesta por ESLint y prueba de arquitectura. Health check funcional con contrato separado. Validación de entorno centralizada. Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `verify`. Todas las validaciones pasan. Sin base de datos, sin autenticación, sin interfaz de dominio. |
| 2026-07-28 | **Corrección final de la iteración 1** — tres precisiones técnicas sobre ADR-005, ADR-006 y ADR-008: (1) `drizzle-orm` y `drizzle-kit` tienen líneas de versión **independientes**, cada una exacta, verificadas como combinación compatible — no se exige que coincidan en número; (2) Vitest fijado en **`4.1.x`** (estable) en lugar de `5.x` (beta), con la adopción de Vitest 5 movida a condición de revisión; (3) el comportamiento de `DEMO_MODE=false` se corrige: las rutas de demostración existen por estructura de archivos de Next.js y responden **404 antes de ejecutar lógica**, no se "desregistran" dinámicamente; la protección de fondo sigue siendo que `DEMO_MODE=true` en producción impide el arranque. Sincronizados: ADR-005, ADR-006, ADR-008, `TECHNICAL-FOUNDATION.md`, `CURRENT-STATE.md`. Sin tocar `UI-WIREFRAMES.md`, que conserva la misma imprecisión en su §1 y queda pendiente para una corrección posterior fuera de este alcance. |
| 2026-07-28 | **Iteración 1** — decisiones técnicas. 5 ADRs nuevos (004–008), 3 documentos técnicos (`TECHNICAL-FOUNDATION`, `ENVIRONMENTS`, `TESTING`), 1 decisión abierta nueva (`OD-18`, RLS), 3 riesgos nuevos (R-11 Drizzle pre-1.0, R-12 concentración de proveedor, R-13 divergencia de entornos), 6 verificaciones técnicas pendientes. Los 10 puntos de la prueba de compatibilidad conceptual se cumplen. Iteración 1.5 añadida al plan. Quedan 13 decisiones abiertas. |
| 2026-07-28 | **Iteración 0.1** — normalización. 7 decisiones cerradas (`K-01`, `K-02`, `OD-02`, `OD-03`, `OD-07`, `OD-08`, `OD-11`), 15 decisiones de producto nuevas (D-19…D-33), 14 contradicciones corregidas (K-10…K-23), 2 decisiones abiertas nuevas (`OD-16`, `OD-17`), 4 entidades de relación añadidas, 3 ADRs revisados. Quedan 12 decisiones abiertas, ninguna bloquea las iteraciones 1–3. |
| 2026-07-28 | **Iteración 0** — fundación documental. 15 decisiones abiertas, 3 ADRs, 18 decisiones de producto, 9 contradicciones documentadas. |
