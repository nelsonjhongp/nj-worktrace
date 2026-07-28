# ADR-005 · Persistencia y migraciones

- **Estado:** Aceptada
- **Fecha:** 2026-07-28
- **Contexto de la decisión:** Iteración 1 (decisiones técnicas)
- **Relacionada con:** [`ADR-001`](ADR-001-modular-monolith.md) §d (unidad de trabajo),
  [`ADR-002`](ADR-002-workspace-boundary.md) (aislamiento), [`ADR-008`](ADR-008-testing-strategy.md)

---

## 1. Contexto

[`DATA-MODEL.md`](../DATA-MODEL.md) define 22 entidades con exigencias poco habituales para un
producto pequeño: cuatro relaciones N:M con atributos propios, unicidad compuesta en varias tablas,
fechas civiles separadas de instantes, identificadores opacos y un `workspace_id` presente y
filtrado en **toda** consulta.

Además, [`ADR-001`](ADR-001-modular-monolith.md) exige algo que la mayoría de arquitecturas
distribuidas no puede dar: **una transacción que abarca varios módulos sin que ninguno lea las
tablas del otro**.

## 2. Fuerzas y restricciones

| # | Fuerza | Implicación |
|---|---|---|
| F1 | El aislamiento por workspace es la garantía central | El filtro debe vivir en la capa de datos y ser difícil de olvidar |
| F2 | Invariantes atómicas (publicar + elevar visibilidad) | Transacciones reales, propagables entre módulos |
| F3 | Fechas civiles ≠ instantes (`DATA-MODEL` §7) | Dos tipos distintos, no una conversión implícita |
| F4 | Autohospedaje sin proveedor obligatorio | Motor estándar, conexión por cadena, nada propietario |
| F5 | Pruebas de autorización contra base real (`ADR-008`) | Bases desechables, rápidas de crear |
| F6 | Un solo mantenedor | Migraciones legibles y revisables, no generadas y opacas |
| F7 | El esquema es la última línea de defensa | Restricciones expresadas en la base, no solo en el código |

## 3. Decisión

**PostgreSQL como motor, Drizzle ORM sobre `node-postgres`, y migraciones SQL versionadas
generadas por drizzle-kit y confirmadas en el repositorio.**

### 3.1 Motor

| Aspecto | Decisión |
|---|---|
| Motor | **PostgreSQL 18.x** (serie estable actual; 18.4 al cerrar este ADR) |
| Mínimo admitido | **PostgreSQL 16** — para no impedir un servicio administrado que vaya por detrás |
| Desarrollo | Contenedor local vía Docker Compose ([`ENVIRONMENTS.md`](../ENVIRONMENTS.md)) |
| Producción | PostgreSQL administrado **u** hospedado por uno mismo. **Opción, no dependencia** |
| Contrato de conexión | **`DATABASE_URL`**, y nada más |

**PostgreSQL 19 está en beta** (Beta 2, 2026-07-16) y no se adopta. Se revisará cuando alcance
disponibilidad general y el servicio administrado de destino la ofrezca.

No se usa ninguna extensión que no esté disponible de forma habitual en servicios administrados. Si
alguna resulta necesaria, exige un ADR nuevo — es exactamente el punto por donde entra la
dependencia de proveedor.

### 3.2 Capa de acceso

**Drizzle ORM**, línea **`0.45.x`**, con el driver `node-postgres` (`pg`).

**`drizzle-orm` y `drizzle-kit` tienen líneas de versión independientes.** No comparten numeración:
`drizzle-kit` es la herramienta de línea de comandos (generación y aplicación de migraciones) y
`drizzle-orm` es la biblioteca en tiempo de ejecución (esquema y consultas). Ambas se fijan **con
versión exacta**, cada una en la suya, y se tratan como una **combinación verificada**, no como un
par que deba coincidir en número (§3.2.1, T5-R9).

Motivos, en orden de peso:

1. **Es SQL-first.** El esquema se declara en TypeScript pero produce **SQL legible**; las
   migraciones son archivos `.sql` que se leen y se revisan. Cumple F6 y F7.
2. **Tipa el resultado de la consulta**, lo que convierte parte de F1 en comprobación de compilación.
3. **Expresa lo que el modelo necesita**: `primaryKey({ columns: [...] })` para claves compuestas,
   `unique().on(...)` para unicidad compuesta, `foreignKey({ columns, foreignColumns })` para claves
   foráneas compuestas, `index()` / `uniqueIndex()` con `.on()`, `.where()` y `.using()`.
4. **La transacción es un objeto que se pasa**, lo que permite la unidad de trabajo de
   `ADR-001` §d sin que un módulo toque las tablas de otro (§4).

#### 3.2.1 Riesgo asumido y por qué se acepta

**Drizzle no ha alcanzado la versión 1.0.** La línea estable de `drizzle-orm` publicada es `0.45.x`;
existe `1.0.0-beta.2` para el conjunto del proyecto, que es una **reescritura de arquitectura** del
motor de migraciones. Esto es un riesgo real y se documenta como tal, no se minimiza:

- Se fija **`drizzle-orm` en `0.45.x` con versión exacta**, no rango. Nada de `^`.
- Se fija **`drizzle-kit` en su propia versión exacta**, elegida por ser la compatible declarada con
  la línea `0.45.x` de `drizzle-orm` en el momento de montar el andamiaje — no se asume que ambas
  compartan número.
- Esa combinación exacta (`drizzle-orm` + `drizzle-kit`) se **verifica una vez** al fijarla —
  generando y aplicando una migración de prueba— y queda registrada en el lockfile.
- **No se adopta la beta** hasta que haya versión estable y guía de migración publicada.
- La actualización a 1.0 será **su propia tarea, con su propio ADR**, no un cambio de dependencia
  rutinario.

**Lo que hace tolerable el riesgo:** las migraciones son **archivos SQL planos** y el esquema es
PostgreSQL estándar. Si Drizzle desapareciera, cambiara de rumbo o su versión 1.0 resultara
inviable, **la base de datos seguiría intacta y sustituir la capa de acceso no exigiría migrar
datos**. La dependencia es de código, no de datos. Es la razón principal por la que se prefiere una
herramienta SQL-first a una que sea dueña del esquema.

### 3.3 Migraciones

| Regla | Detalle |
|---|---|
| Generación | `drizzle-kit generate` a partir del esquema en TypeScript |
| Formato | Archivos **`.sql` versionados y confirmados** en el repositorio |
| Revisión | **Toda migración se lee antes de confirmarse.** El SQL generado es una propuesta, no un hecho |
| Aplicación | `drizzle-kit migrate` en desarrollo, pruebas y producción — el mismo camino en los tres |
| Prohibido | `drizzle-kit push` contra cualquier base que no sea la desechable de un desarrollador |
| Irreversibles | Una migración que pierde datos se separa de la que no y se anota en su cabecera |
| Orden | Estrictamente lineal. Sin ramas de migración |

`push` queda prohibido fuera del entorno local porque sincroniza esquema sin dejar historia: rompe
F6 y hace irreproducible el estado de producción.

### 3.4 Tipos que el modelo exige

| Concepto del modelo | Tipo en PostgreSQL | Nota |
|---|---|---|
| Instantes (`started_at`, `published_at`, `occurred_at`…) | **`timestamptz`** | Siempre. `timestamp` sin zona queda **prohibido** |
| Fechas civiles (`starts_on`, `ends_on`, `update_date`) | **`date`** | No son instantes y **no se convierten** (`DATA-MODEL` §7) |
| Identificadores internos (`id`) | `uuid` | UUID v7 o equivalente ordenable |
| Identificadores públicos (`public_id`) | `text` | Opaco, no correlativo (`ADR-002` §9) |
| Enums del dominio | `text` + `CHECK`, **no** `enum` nativo | Ver §3.4.1 |
| `hours_snapshot`, `before`/`after` de auditoría | `jsonb` | Contenido validado con Zod al escribir |
| Duraciones (`duration_seconds`) | `integer` | Segundos. Sin `interval`: la aritmética es trivial y `interval` complica la agregación |

#### 3.4.1 Por qué `text` + `CHECK` en lugar de `enum` nativo

Los enums nativos de PostgreSQL son incómodos de modificar: añadir un valor es fácil, quitarlo o
reordenarlo no. `DATA-MODEL.md` §3 tiene 18 enums y ya se ha eliminado un valor una vez
(`review_state.PENDING`, iteración 0.1). Un `text` con `CHECK` se altera con una migración legible y
reversible. Se pierde algo de compacidad; se gana capacidad de corregirse.

### 3.5 Dónde vive cada invariante

`DATA-MODEL.md` §8 lista quince reglas. **No todas pertenecen al mismo sitio**, y duplicarlas en los
tres niveles sería tan malo como no ponerlas en ninguno.

| Nivel | Qué le corresponde | Ejemplos |
|---|---|---|
| **Base de datos** | Lo que debe ser cierto siempre, cueste lo que cueste | R11 unicidad `(workspace_id, user_id)` · unicidad de `evidence_links` y `work_cycle_items` · claves foráneas · `NOT NULL` en `workspace_id` (R1) · `CHECK (ended_at > started_at)` |
| **Índice parcial único** | Invariantes de "como máximo uno" | R5 un ciclo `ACTIVE` por `(workspace_id, project_id)` · R6 una sesión `RUNNING` por usuario · R7 un segmento abierto por sesión |
| **Servicio de aplicación** | Lo que exige leer varias entidades o decidir | R2 herencia de visibilidad · R9 cierre sin sesiones abiertas · R10 publicación sin referencias colgando · R13 contenedores |
| **Zod, en la frontera** | Forma y tipo de lo que entra | Cuerpos de petición, parámetros de ruta, variables de entorno |

**La validación no se duplica.** Zod comprueba **forma**; la base comprueba **integridad**; el
servicio comprueba **reglas de negocio**. Revalidar en Zod algo que la base ya garantiza solo añade
un sitio donde equivocarse. La excepción deliberada es el mensaje de error: cuando una restricción
de base puede activarse por acción normal del usuario, el servicio la comprueba **antes** para poder
dar un mensaje útil, y la base sigue siendo la red de seguridad.

### 3.6 Aislamiento por workspace en la capa de datos

`ADR-002` A2 exige que **toda** consulta filtre por `workspace_id`. Que sea una convención no basta.

**Mecanismo:** ningún módulo recibe el cliente de base de datos desnudo. Recibe un **contexto de
workspace** ya resuelto, y las funciones de repositorio toman ese contexto como primer parámetro
obligatorio. Una consulta sin contexto no compila.

```
// forma conceptual, no código de producción
type WorkspaceScope = { workspaceId: WorkspaceId; actor: Actor; tx: Tx }
findCycles(scope: WorkspaceScope, filters): Promise<WorkCycle[]>
```

Se evalúa **Row-Level Security** de PostgreSQL como refuerzo adicional en la iteración 2. No se
adopta todavía como decisión: RLS con un usuario de aplicación único exige propagar el actor por
variable de sesión, y hacerlo mal da una falsa sensación de seguridad. Queda como **`OD-18`**.

## 4. Transacciones entre módulos sin acceso a tablas ajenas

Es la exigencia de `ADR-001` §d y merece ser explícita, porque es donde una elección equivocada
habría hecho imposible cumplir el ADR-001.

- El **servicio de aplicación** abre la transacción y obtiene un objeto `tx`.
- Ese `tx` se pasa a cada módulo participante como parte de su `WorkspaceScope`.
- Cada módulo escribe **solo sus tablas**, a través de su propia superficie pública.
- Confirmación o reversión conjunta.

Ejemplo real del dominio — publicar una actualización diaria:

```
applicationService.publishDailyUpdate():
  tx = db.transaction()
    work.assertItemsAtLeastAsVisible(scope+tx, itemIds)   // módulo work, tablas de work
    publishing.publish(scope+tx, updateId)                // módulo publishing, sus tablas
    audit.record(scope+tx, 'daily_update.published')      // módulo audit, solo escritura
  commit
```

`publishing` **no consulta** `work_items`: le pregunta a `work`. Comparten transacción, no tablas.
Drizzle lo permite porque la transacción es un valor que se pasa, no un estado global implícito.

## 5. Alternativas consideradas

| Alternativa | Evaluación | Veredicto |
|---|---|---|
| **PostgreSQL** | Único motor de uso común que ofrece a la vez `timestamptz` con zonas IANA, `date` civil separado, índices parciales únicos, `jsonb` y disponibilidad administrada en todos los proveedores | **Adoptado** |
| **MySQL / MariaDB** | Sin índices parciales (R5–R7 exigirían tablas auxiliares); manejo de zonas horarias más pobre. Contradice F3 y F7 | Descartada |
| **SQLite** | Tentadora para un producto personal. Sin `timestamptz`, sin tipos de fecha reales, concurrencia de escritura limitada y ninguna ruta a servicio administrado (F4) | Descartada |
| **Drizzle ORM `0.45.x`** (con `drizzle-kit` en su propia versión exacta compatible) | SQL-first, migraciones legibles, transacciones propagables, restricciones compuestas completas | **Adoptada, con el riesgo de §3.2.1** |
| **Drizzle `1.0.0-beta`** | Corrige problemas conocidos del motor de migraciones, pero es beta y una reescritura. Poner el aislamiento del producto sobre una beta no es defendible | Descartada por ahora |
| **Prisma** | Más maduro y con mejor experiencia de migración. Pero es **dueño del esquema** a través de su propio lenguaje, su cliente pesa más en la frontera y su empresa empuja su propio servicio de PostgreSQL. Contra F6/F7: el SQL queda a un paso de distancia | Descartada |
| **Kysely** | Excelente constructor de consultas tipado, muy alineado con F7. **No gestiona migraciones a partir del esquema**: habría que escribirlas a mano desde el primer día. Opción de respaldo natural si Drizzle falla, porque el esquema SQL ya existiría | Descartada, retenida como plan B |
| **SQL plano con `pg`** | Máximo control, cero magia. Coste: tipar a mano 22 entidades y sus consultas, para un solo mantenedor (F1) | Descartada |
| **TypeORM / Sequelize** | Orientadas a entidades activas y con menor calidad de tipos; alejan del SQL | Descartada |
| **`enum` nativo de PostgreSQL** | Compacto, pero rígido ante cambios; ya hubo uno | Descartada (§3.4.1) |
| **Un esquema de PostgreSQL por workspace** | Aislamiento fortísimo. Imposibilita las consultas propias del propietario y multiplica las migraciones por el número de workspaces. Desproporcionado | Descartada |

## 6. Consecuencias

**Positivas**

- El esquema es PostgreSQL estándar: la base es portable entre local, administrado y autohospedado.
- Las migraciones son SQL legible y revisable, confirmado en el repositorio.
- `DATABASE_URL` como único contrato hace que cambiar de local a administrado sea configuración.
- La transacción propagable cumple `ADR-001` §d sin excepciones.
- Restricciones e índices parciales convierten en imposibles varias invariantes críticas.
- Si hay que sustituir la capa de acceso, los datos no se mueven.

**Negativas**

- Drizzle está por debajo de 1.0 y su 1.0 es una reescritura (§3.2.1). Es el riesgo técnico mayor
  de esta iteración.
- `text` + `CHECK` en vez de `enum` nativo: algo más de verbosidad en el esquema.
- Los índices parciales únicos son potentes pero fáciles de escribir mal; exigen prueba propia.
- Repartir invariantes en cuatro niveles (§3.5) requiere disciplina y criterio, y no es mecánico.

## 7. Reglas derivadas

| # | Regla |
|---|---|
| T5-R1 | `DATABASE_URL` es el **único** contrato de conexión. Ningún componente lee credenciales por otra vía. |
| T5-R2 | Todo instante es `timestamptz`. `timestamp` sin zona está prohibido en el esquema. |
| T5-R3 | Toda fecha civil es `date` y nunca se convierte a instante ni al revés. |
| T5-R4 | Toda tabla de contenido tiene `workspace_id NOT NULL` con índice. |
| T5-R5 | Ninguna función de repositorio se invoca sin `WorkspaceScope`. |
| T5-R6 | `drizzle-kit push` está prohibido fuera de la base local desechable de un desarrollador. |
| T5-R7 | Toda migración se lee y revisa antes de confirmarse; el SQL generado es una propuesta. |
| T5-R8 | Las migraciones son lineales; no existen ramas de migración. |
| T5-R9 | `drizzle-orm` y `drizzle-kit` se fijan cada uno con versión exacta, **en sus propias líneas de numeración**; no se exige que coincidan, pero la combinación se verifica y se registra como compatible. |
| T5-R10 | Ninguna extensión de PostgreSQL fuera de las habituales en servicios administrados sin ADR nuevo. |
| T5-R11 | Un módulo escribe únicamente sus propias tablas, aunque comparta transacción. |
| T5-R12 | Una invariante vive en **un** nivel de §3.5, salvo la excepción de mensaje de error allí descrita. |

## 8. Criterios verificables

| # | Criterio | Cómo se comprueba |
|---|---|---|
| T5-1 | Toda tabla de contenido tiene `workspace_id NOT NULL` e índice | Prueba que recorre el catálogo (`information_schema`) |
| T5-2 | Ninguna columna es `timestamp` sin zona | Prueba sobre el catálogo |
| T5-3 | `starts_on`, `ends_on`, `update_date` son `date` | Prueba sobre el catálogo |
| T5-4 | Existen las unicidades compuestas de `workspace_members`, `work_cycle_items`, `evidence_links`, `daily_update_work_items` | Prueba de integridad: insertar duplicado y esperar violación |
| T5-5 | Los índices parciales de R5, R6 y R7 impiden el segundo registro | Prueba de integridad por cada regla |
| T5-6 | Una transacción que abarca dos módulos revierte entera al fallar el segundo | Prueba de integración |
| T5-7 | La migración desde base vacía reproduce el esquema exacto | Prueba en base desechable en CI |
| T5-8 | La aplicación funciona cambiando solo `DATABASE_URL` entre dos instancias distintas | Prueba de integración con dos bases |
| T5-9 | Ningún archivo de migración modificado a posteriori | Comprobación de sumas de verificación en CI |

## 9. Condiciones de revisión

- **Drizzle 1.0 estable con guía de migración publicada** → evaluar la actualización en un ADR propio.
- **Drizzle abandonado, o su 1.0 inviable** → migrar a Kysely conservando esquema y migraciones. El
  coste es reescribir consultas, no mover datos.
- **PostgreSQL 19 con disponibilidad general y soporte del servicio administrado** → revisar §3.1.
- **Aparece un requisito de consulta entre workspaces** → revisar §3.6 y `ADR-002` §7 juntos.
- **RLS se considera necesaria** → cerrar `OD-18` con su propio ADR.

## 10. Fuentes oficiales consultadas

Consultadas el 2026-07-28:

- [PostgreSQL — Versioning Policy](https://www.postgresql.org/support/versioning/)
- [PostgreSQL 18.4, 17.10, 16.14, 15.18 y 14.23 publicadas](https://www.postgresql.org/about/news/postgresql-184-1710-1614-1518-and-1423-released-3297/)
- [PostgreSQL — Documentación 18 (versión actual)](https://www.postgresql.org/docs/current/index.html)
- [PostgreSQL — Release 19 (en beta)](https://www.postgresql.org/docs/19/release-19.html)
- [Drizzle ORM — Overview](https://orm.drizzle.team/docs/overview)
- [Drizzle ORM — Indexes & Constraints (claves y unicidad compuestas)](https://orm.drizzle.team/docs/indexes-constraints)
- [Drizzle ORM — Latest releases](https://orm.drizzle.team/docs/latest-releases)
- [Drizzle ORM y Drizzle Kit v1.0.0-beta.2](https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v1beta2)
- [Drizzle ORM — v1 Roadmap](https://orm.drizzle.team/roadmap)
- [drizzle-orm en npm (versiones publicadas)](https://www.npmjs.com/package/drizzle-orm?activeTab=versions)
