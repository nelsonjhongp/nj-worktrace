# TECHNICAL FOUNDATION

Resumen del stack técnico y **prueba de compatibilidad** con la fundación de producto.

> Este documento **no** contiene decisiones ni justificaciones: viven en los ADR. Aquí está el
> cuadro de conjunto, la política de versiones y la comprobación de que las piezas encajan entre sí
> y con las iteraciones 0 y 0.1.

**Estado: iteración 1 cerrada. No existe código todavía.**

---

## 1. Stack

| Capa | Elección | Línea | ADR |
|---|---|---|---|
| Framework | Next.js, App Router | `16.2.x` | [004](decisions/ADR-004-application-stack.md) |
| UI | React | `19.x` | [004](decisions/ADR-004-application-stack.md) |
| Lenguaje | TypeScript estricto | `5.5+` | [004](decisions/ADR-004-application-stack.md) |
| Paquetes | pnpm | actual | [004](decisions/ADR-004-application-stack.md) |
| Estilos | Tailwind CSS | `4.x` | [004](decisions/ADR-004-application-stack.md) |
| Componentes | shadcn/ui, copiados al repositorio | — | [004](decisions/ADR-004-application-stack.md) |
| Validación | Zod | `4.x` | [004](decisions/ADR-004-application-stack.md) · [005](decisions/ADR-005-persistence-and-migrations.md) §3.5 |
| Base de datos | PostgreSQL | `18.x` (mínimo 16) | [005](decisions/ADR-005-persistence-and-migrations.md) |
| Acceso a datos | Drizzle ORM + `node-postgres` | `0.45.x` **exacta** | [005](decisions/ADR-005-persistence-and-migrations.md) |
| Migraciones | drizzle-kit, SQL versionado | **exacta, línea propia**, compatible verificada con `0.45.x` | [005](decisions/ADR-005-persistence-and-migrations.md) |
| Autenticación | Better Auth | `1.6.x` | [006](decisions/ADR-006-authentication-and-sessions.md) |
| Runtime | Node.js LTS | `24.x` | [007](decisions/ADR-007-runtime-and-deployment.md) |
| Artefacto | Docker, `output: 'standalone'` | — | [007](decisions/ADR-007-runtime-and-deployment.md) |
| Pruebas | Vitest · Playwright | `4.1.x` · `1.57+` | [008](decisions/ADR-008-testing-strategy.md) |
| Proxy (futuro) | Caddy | — | [007](decisions/ADR-007-runtime-and-deployment.md) §3.7 |

**Línea base de navegador del producto:** Chrome/Edge 111+, **Firefox 128+**, Safari 16.4+ — la más
estricta entre Next.js 16 y Tailwind v4 (ADR-004 R-T4).

## 2. Compatibilidad entre componentes

| Par | Estado | Nota |
|---|---|---|
| Next.js 16 ↔ Node.js 24 | ✅ | Next.js exige ≥ 20.9; 24 es Active LTS |
| Next.js 16 ↔ React 19 | ✅ | El App Router usa canary de React con lo estable de 19 |
| Next.js 16 ↔ TypeScript 5.5+ | ✅ | Mínimo de Next.js: 5.1 |
| Next.js 16 ↔ Tailwind 4 | ✅ | Vía `@tailwindcss/postcss`. **Líneas base de navegador distintas** → §1 |
| Tailwind 4 ↔ shadcn/ui | ✅ | Componentes copiados, adaptados a la versión que se copia |
| Zod 4 ↔ TypeScript | ⚠️ | Requiere `strict: true` y **no** admite `moduleResolution` heredado (`node`/`classic`). Verificar `bundler` (por defecto en Next.js) al montar el andamiaje — T-1 de §5 |
| Drizzle 0.45 ↔ PostgreSQL 18 | ✅ | Vía `node-postgres` |
| Drizzle 0.45 ↔ Node.js 24 | ✅ | Sin dependencias propias |
| Better Auth 1.6 ↔ Drizzle | ✅ | Adaptador oficial, `provider: "pg"` |
| Better Auth 1.6 ↔ PostgreSQL | ✅ | Sesiones en tabla |
| Better Auth 1.6 ↔ Next.js 16 | ✅ | Soporte de Next.js documentado |
| Vitest 4.1 ↔ el proyecto | ✅ | Comparte transformación con Vite. Vitest 5 sigue en beta; no se adopta todavía |
| Playwright ↔ imagen Docker | ✅ | Corre contra el contenedor construido |
| Drizzle 0.45 ↔ Drizzle 1.0 beta | ⚠️ | 1.0 es reescritura; **no se adopta** (ADR-005 §3.2.1) |

Solo hay dos advertencias, ninguna bloqueante, y ambas con verificación asignada.

## 3. Política de versiones

| Regla | Detalle |
|---|---|
| **Fijado exacto** | `drizzle-orm`, `drizzle-kit`, `better-auth`, `next`, `vitest`. Sin `^`. Son las piezas donde un cambio menor puede alterar comportamiento crítico |
| **Rango menor** | Utilidades y herramientas de desarrollo sin superficie en producción |
| **`drizzle-orm` y `drizzle-kit`** | Líneas de versión **independientes**, cada una exacta. No se exige el mismo número; se exige que la combinación esté verificada como compatible antes de fijarse, y se revisa como par al actualizar cualquiera de las dos |
| **Node.js** | Línea mayor fijada en `.nvmrc`; idéntica en desarrollo, CI e imagen |
| **Cadencia** | Revisión de dependencias mensual. Parches de seguridad, de inmediato |
| **Versiones mayores** | Ninguna actualización mayor sin ADR que documente qué cambia y por qué |
| **Bloqueo** | `pnpm-lock.yaml` confirmado; CI con `--frozen-lockfile` |
| **Vigilancia activa** | Drizzle 1.0 estable · Vitest 5 estable · Node.js 26 en LTS (oct. 2026) · PostgreSQL 19 con disponibilidad general · Next.js 16.3 |

## 4. Prueba de compatibilidad conceptual

Los diez puntos exigidos antes de aceptar las decisiones. Cada uno con su comprobación asignada, de
modo que pueda fallar en la iteración 2 en lugar de quedarse en afirmación.

### 1 · No contradicen ADR-001

| Exigencia de ADR-001 | Cómo se cumple |
|---|---|
| Un artefacto desplegable | Una imagen Docker, un proceso (ADR-007 §3.3) |
| Módulos con superficie pública | `modules/<x>/index.ts`; `internal/` inaccesible, con linting (ADR-004 T4-R2) |
| Sin orquestación entre módulos de dominio | `application/` contiene los servicios de aplicación (ADR-004 §3.3) |
| Autorización transversal | `WorkspaceScope` obligatorio en repositorios (ADR-005 §3.6) |
| Unidad de trabajo compartida sin tablas ajenas | `tx` propagado; cada módulo escribe lo suyo (ADR-005 §4) |
| Sin estado con autoridad en el proceso | ADR-007 §3.6, verificado por T7-8 |

**Ninguna contradicción.** ✅

### 2 · Permiten implementar A1–A8 de ADR-002

| Regla | Mecanismo |
|---|---|
| A1 `workspace_id` en toda tabla | Esquema Drizzle + comprobación de catálogo (T5-1) |
| A2 Toda consulta filtra | `WorkspaceScope` obligatorio; sin él no compila |
| A3 404 sin membresía | Resolución de workspace previa a los datos; probado por entidad y rol (T8-5) |
| A4 `auth_sessions` sin workspace | Better Auth sin workspace en sesión (T6-4) |
| A5 Sin dos `workspace_id` en una operación | Revisión + prueba de integración |
| A6 Identificadores no resolubles entre workspaces | `public_id` opaco; prueba de sondeo |
| A7 Rutas por `public_id` | Segmentos `[workspaceId]` con `public_id` (ADR-005 §3.4) |
| A8 Ninguna validación revela workspaces ajenos | Sin unicidad global de nombre (ADR-005 §3.1, `DATA-MODEL` §4.3.1) |

✅ — A7 y A8 fueron precisamente el motivo de eliminar el `slug` global en la iteración 0.1.

### 3 · Permiten implementar C1–C9 de ADR-003

| Regla | Mecanismo |
|---|---|
| C1 El cliente escribe solo en cuatro canales | Servicios de aplicación por canal; prueba por entidad y rol |
| C2 Una solicitud no modifica un work item existente | `converted_work_item_id` único; el servicio solo crea |
| C3 `REJECTED` exige `resolution_note` | `CHECK` en base + validación en el servicio |
| C4 Una revisión no altera `cycle_state` | Ningún servicio de `collaboration` escribe `work_cycles` |
| C5 Un hilo nunca es más visible que su ancla | Sin columna de visibilidad; se resuelve al consultar (D-29) |
| C6 El propietario no edita mensajes ajenos | Comprobación de autoría en el servicio; prueba por rol |
| C7 Ninguna fila de `reviews` sin acción del cliente | Publicar no escribe en `reviews`; prueba sobre el cierre |
| C8 Una revisión nunca se actualiza | Sin operación de actualización; solo inserción encadenada |
| C9 Todo hilo tiene ancla existente y accesible | Clave foránea polimórfica validada + prueba de integridad |

✅

### 4 · Soportan las relaciones N:M del modelo

Las cuatro (`work_cycle_items`, `daily_update_work_items`, `meeting_attendees`, `evidence_links`)
son tablas con atributos propios y unicidad compuesta. Drizzle expresa clave primaria compuesta
(`primaryKey({ columns: [...] })`), unicidad compuesta (`unique().on(...)`), claves foráneas
compuestas (`foreignKey({ columns, foreignColumns })`) e índices con `.on()` y `.where()`.
Verificado en la documentación oficial. ✅

### 5 · Soportan transacciones entre servicios de aplicación sin leer tablas ajenas

El servicio abre la transacción; el `tx` viaja dentro del `WorkspaceScope`; cada módulo escribe solo
sus tablas a través de su superficie pública. Ejemplo desarrollado en ADR-005 §4.
Verificable por T5-6 (reversión conjunta) y por la regla de linting T4-1. ✅

### 6 · Permiten aislar desarrollo, pruebas y producción

Tres entornos, un único contrato (`DATABASE_URL`), configuración validada al arrancar, bases de
prueba desechables por trabajador. Detalle en [`ENVIRONMENTS.md`](ENVIRONMENTS.md). ✅

### 7 · No introducen dependencia irreversible

| Pieza | Coste de sustitución | Qué protege |
|---|---|---|
| PostgreSQL | Alto, pero es un estándar con muchos proveedores | Sin extensiones exóticas (T5-R10) |
| Drizzle | **Medio** — reescribir consultas | Migraciones en SQL plano: **los datos no se mueven** |
| Better Auth | Bajo — un módulo | Solo autenticación; sin sus plugins de organización (T6-R4) |
| Next.js | Alto | Sin funciones de plataforma; `standalone` + Docker |
| Tailwind / shadcn | Bajo | Componentes ya copiados al repositorio |
| Docker / Caddy | Bajo | Estándar |

**Ningún proveedor posee los datos.** Nada exige una cuenta en ningún sitio para funcionar.
Riesgo residual reconocido: Next.js y Better Auth orbitan al mismo actor (ADR-006 §4.1), y Drizzle
está por debajo de 1.0 (ADR-005 §3.2.1). Ambos figuran en [`CURRENT-STATE.md`](CURRENT-STATE.md) §8. ✅

### 8 · El mecanismo de sesión no almacena el workspace activo

La tabla de sesiones no tiene columna de workspace y no la tendrá (T6-R2). El workspace viaja en la
ruta y se resuelve contra `workspace_members` en cada petición. La preferencia de "último workspace"
es comodidad de navegación y **nunca autoriza** (T6-R7). Verificable por T6-4. ✅

### 9 · La base pasa de Docker local a administrada cambiando configuración

`DATABASE_URL` es el único contrato (T5-R1). Sin extensiones fuera de lo habitual en servicios
administrados (T5-R10). Sin dependencia de superusuario en tiempo de ejecución. Verificable por
T5-8 y T7-2, que ejercitan la aplicación contra dos instancias distintas. ✅

### 10 · Las pruebas críticas usan PostgreSQL real

Prohibición explícita de dobles de base de datos en autorización, visibilidad, publicación y
aislamiento (T8-R1), con regla de linting que la respalda (T8-4). Integración y E2E contra
PostgreSQL real en base desechable. ✅

**Resultado: los diez puntos se cumplen.** Dos advertencias abiertas —el `moduleResolution` de Zod y
la versión 1.0 de Drizzle— con verificación y condición de revisión asignadas.

## 5. Verificaciones pendientes para la iteración 2

Cosas que la documentación oficial **no** resuelve y que hay que comprobar al montar el andamiaje.
Se listan aquí para que no se pierdan.

| # | Qué verificar | Origen |
|---|---|---|
| T-1 | Que Zod 4 funciona con el `moduleResolution: "bundler"` que Next.js configura por defecto; si no, fijar `nodenext` | ADR-004 §3.1 |
| T-2 | Valor por defecto de `SameSite` en Better Auth, y fijarlo explícitamente en `Lax` | ADR-006 §3.3 |
| T-3 | Qué protección CSRF aporta Better Auth y qué hay que añadir | ADR-006 §3.3, T6-8 |
| T-4 | Que `public/` y `.next/static` se copian en la imagen `standalone` | ADR-007 §3.3, T7-4 |
| T-5 | Rendimiento real de crear bases desde plantilla; decidir sobre Testcontainers | ADR-008 §3.4 |
| T-6 | Que los índices parciales únicos de R5, R6 y R7 se comportan como se espera | ADR-005 T5-5 |

## 6. Qué **no** decide esta iteración

Sigue sin decidirse, y no bloquea el andamiaje: Row-Level Security como refuerzo (**`OD-18`**,
nueva) · herramienta de CI concreta · supervisión y registro estructurado · copias de seguridad y
restauración · plataforma de alojamiento final · almacenamiento de adjuntos (`OD-05`) · correo
(`OD-09`).

## 7. Fuentes

Cada ADR lista sus fuentes oficiales, todas consultadas el 2026-07-28.
Este documento no añade ninguna.
