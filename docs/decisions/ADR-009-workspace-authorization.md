# ADR-009 · Autorización por acción y aislamiento por `WorkspaceScope`

- **Estado:** Aceptada
- **Fecha:** 2026-07-29
- **Contexto de la decisión:** Iteración 2D (autorización por acción)
- **Cierra:** `OD-18` (Row-Level Security)
- **Relacionada con:** [`ADR-001`](ADR-001-modular-monolith.md), [`ADR-002`](ADR-002-workspace-boundary.md),
  [`ADR-003`](ADR-003-client-interaction.md), [`ADR-005`](ADR-005-persistence-and-migrations.md),
  [`ADR-008`](ADR-008-testing-strategy.md)

---

## Contexto

La iteración 2C dejó resuelto **quién es el actor y qué es en este workspace**: un
`WorkspaceAccessContext` de cuatro campos (`userId`, `workspaceId`, `role`, `workspaceStatus`),
producido en cada petición sin caché y solo cuando existe una membresía `ACTIVE` (D-35).

Ese contexto no decide nada. `ADR-002` §2 se detiene exactamente ahí: «devolver `m.role`». Lo que
falta es la tercera capa de aplicación de
[`ROLES-AND-PERMISSIONS.md`](../ROLES-AND-PERMISSIONS.md) §10: **cada comando comprueba el permiso
de §8**. Y falta el mecanismo que `ADR-005` §3.6 exige para que ninguna consulta pueda olvidar el
workspace.

Se decide antes de que existan los módulos de negocio a propósito. Es la única iteración cuyo fallo
no se puede corregir a posteriori sin rehacer lo construido encima, y decidir el aislamiento después
de escribir la primera consulta significaría reescribirla.

## Decisión

### 1. Un catálogo cerrado de capacidades, no un permiso por endpoint

**Once capacidades**, enumeradas en `src/application/authorization/workspace-capability.ts` y
documentadas en [`ROLES-AND-PERMISSIONS.md`](../ROLES-AND-PERMISSIONS.md) §12.

El criterio de agrupación es verificable: **una capacidad por fila distinta de la matriz de acciones
de §8**. Si dos acciones tienen el mismo conjunto de roles y el mismo efecto, son una sola
capacidad — «comentar en hilo accesible» y «proponer punto de agenda» son ambas `✔ ✔ ✔ ✖`, luego son
`collaboration.participate`. Una capacidad por entidad y operación daría unas 88 celdas que la
documentación no distingue, y cada celda inventada sería una decisión de autorización que nadie ha
tomado.

Quedan **fuera** del catálogo, y no por olvido:

| Fuera | Por qué |
|---|---|
| `workspace.create` | No existe contexto de workspace en el momento de crear uno. Es una acción de identidad autenticada (§12.1 de `ROLES-AND-PERMISSIONS.md`) |
| `workspace.unarchive` | Nadie ha decidido quién restaura un workspace archivado ni con qué operación: `OD-19` |
| `visibility`, `publication_state` | Son **filtros, no permisos** (`ROLES-AND-PERMISSIONS.md` §1.4). La capacidad es *cambiarlos*; *aplicarlos* es de la capa de datos |
| La propiedad del registro (el `(p)` de §5) | Depende del registro, no del contexto. Un motor que solo ve `WorkspaceAccessContext` no puede evaluarla, y fingir que sí sería peor que no tenerla |

### 2. La matriz es un dato exhaustivo, no una cadena de condicionales

`Record<WorkspaceCapability, CapabilitySpec>`, con `effect: 'READ' | 'MUTATION'` y la lista de roles.
Añadir una capacidad al catálogo sin su fila **no compila**: el catálogo y la matriz no pueden
desincronizarse.

Dos filas obligan a que sea un dato y no un `if`: `review.submit` y `request.create` están
**denegadas para OWNER** y permitidas para CLIENT (`ROLES-AND-PERMISSIONS.md` §8 y §7.2). Cualquier
implementación con un atajo `if (role === 'OWNER') return ALLOWED` sería incorrecta, y como datos la
asimetría se ve en vez de esconderse en el orden de unos condicionales.

### 3. Workspace archivado: lectura sí, mutación no, y como regla general

```
READ      → permitida
MUTATION  → DENIED_ARCHIVED
```

La regla vive **una vez** en el motor y no repetida por capacidad: repetirla serían once
oportunidades de olvidarla, y una invariante vive en un solo nivel (`ADR-005` T5-R12). Es la
imposición que D-34 dejó pendiente para esta iteración.

**Precedencia: el rol antes del archivado.** Si el archivado se evaluara primero, un CLIENT que
intenta `publication.manage` en un workspace archivado recibiría `DENIED_ARCHIVED`, informándole de
que su rol *sí* tendría la capacidad en un workspace activo. Es un oráculo pequeño y gratuito de
cerrar.

No se implementa el desarchivado. Nada en la documentación dice quién restaura un workspace: la
matriz de acciones de §8 no tiene fila, `DATA-MODEL.md` §4.17 no lista el evento y `USER-FLOWS.md`
menciona el estado archivado solo como consecuencia (F1 A3, F7). Es `OD-19`.

### 4. El motor es puro y tiene un solo consumidor

```ts
decideWorkspaceAction(context, capability): AuthorizationDecision
canWorkspace(context, capability): boolean          // delega, nunca reimplementa
```

Síncrono, sin base de datos, sin Better Auth, sin Next.js, sin `Response`, sin `Headers`, sin
registro y sin dependencia externa de autorización. Que lo sea es lo que permite probar las 88
celdas de la matriz sin levantar nada.

`AuthorizationDecision` es una unión discriminada y **no un `boolean`**, por dos razones
comprobables: `DENIED_ROLE` y `DENIED_ARCHIVED` traducen a respuestas HTTP distintas (§6), y un
`false` no es auditable. `canWorkspace` existe para que, cuando llegue la interfaz, ocultar un
control no obligue a inventar un segundo motor — sin que ocultar un control pase a ser un punto de
aplicación (`ROLES-AND-PERMISSIONS.md` §10).

Vive en `src/application/authorization/` porque `ADR-001` lo exige: la autorización es transversal y
**nunca** se implementa dentro de un módulo de dominio.

### 5. El resultado es una unión plana, y el scope viaja dentro

`WorkspaceAuthorizationResult` reúne los cinco fallos de 2C y las dos denegaciones de la política en
una unión **plana**. Envolverlos en `{ outcome: 'DENIED', reason: … }` obligaría a desempaquetar en
el traductor HTTP y perdería la exhaustividad del `switch`. Con la unión plana, TypeScript falla si
el traductor olvida un caso — que es el fallo que hunde este tipo de código: un caso no contemplado
que cae en un `default` permisivo.

`AUTHORIZED` transporta el `WorkspaceScope`. No es una comodidad: es el mecanismo central de la
iteración. Al ser la única forma de obtener un scope, **tener uno es la prueba de haber sido
autorizado**.

La dependencia con la traducción HTTP va en un solo sentido: `platform/http` conoce el vocabulario
de resultados de la aplicación; la aplicación no conoce HTTP.

### 6. Traducción HTTP: tres resultados, un solo 404

| Resultado interno | HTTP | Cuerpo |
|---|---|---|
| `UNAUTHENTICATED` | 401 | `{}` |
| `IDENTITY_ARCHIVED` | 401 | `{}` |
| `IDENTITY_NOT_PROVISIONED` | **500** | `{}` |
| `WORKSPACE_NOT_FOUND` | 404 | `{}` |
| `NO_ACTIVE_MEMBERSHIP` | 404 | `{}` |
| `DENIED_ROLE` | 404 | `{}` |
| `DENIED_ARCHIVED` | **409** | `{"code":"WORKSPACE_ARCHIVED"}` |

Los tres 404 salen de **una sola construcción** y son idénticos en estado, cuerpo y cabeceras. Que lo
sean se comprueba comparando las tres respuestas serializadas enteras, no leyendo el código.

El cuerpo vacío no es pereza: cualquier `message`, `code` o `error` legible sería exactamente el
oráculo que `ADR-002` §3 evita. Ninguna respuesta denegada contiene identificador de workspace,
`public_id`, rol, estado de membresía, nombre ni correo.

**`IDENTITY_NOT_PROVISIONED` es 500 y no una denegación.** Es el invariante roto de `R-14`: existe una
sesión válida de Better Auth cuyo `domain_users` no existe. Tratarlo como un 404 lo escondería entre
las denegaciones normales, que es justo lo que un invariante roto no debe hacer.

**`DENIED_ARCHIVED` es 409 y dice el estado.** Puede: quien lo recibe tiene membresía activa y ya sabe
que el workspace existe, y `USER-FLOWS.md` F1 A3 y F7 exigen avisarle («solo lectura con aviso»). Es
409 y no 403 porque el impedimento es el **estado del recurso**, no un permiso que falte, de modo que
no reabre D-17 («sin permiso se responde 404, nunca 403»).

Se usa `Response` estándar de la plataforma web. Nunca `NextResponse`, `notFound()` ni `redirect()`:
sustituir el framework debe afectar a las rutas, no a la traducción (`ADR-004` §3.5).

### 7. `WorkspaceScope`: tres campos y un identificador marcado

```ts
export type WorkspaceId = string & { readonly [workspaceIdBrand]: never };

export type WorkspaceScope = {
  readonly workspaceId: WorkspaceId;
  readonly userId: string;
  readonly role: WorkspaceRole;
};

export function createWorkspaceScope(context: WorkspaceAccessContext): WorkspaceScope;
```

Corrige la forma conceptual de `ADR-005` §3.6 en tres puntos, y cada corrección tiene su motivo:

| `ADR-005` §3.6 proponía | Decisión | Por qué |
|---|---|---|
| `actor` | **`userId`** | «Actor» es ambiguo: ¿usuario, rol, sistema? `userId` coincide con D-35 y con `workspace_members.user_id` |
| — | **`role` incluido** | Dos consumidores reales: el filtro de visibilidad, que `ROLES-AND-PERMISSIONS.md` §10 sitúa en la capa de datos, y `audit_events.actor_role`, que debe congelar el rol del momento del hecho en vez de reconsultarlo. Filtrar y auditar no es autorizar (§1.4) |
| `tx` obligatorio | **fuera del scope** | Exigirla obligaría a abrir una transacción para cada lectura, o —peor— a inventar una transacción nula. `ADR-005` §4 dice que el servicio de aplicación abre la transacción y la propaga: se compondrá con el scope cuando exista la primera operación real que la necesite |

Tampoco lleva `workspaceStatus` (la escritura ya se bloqueó antes; llevarlo invitaría a un segundo
punto de imposición del archivado) ni capacidades (un repositorio con capacidades es un segundo motor
de políticas). Es inmutable y serializable: tres primitivos, ninguna referencia viva, se puede volcar
íntegro en un registro del servidor.

**El identificador está marcado en el tipo, y el dueño de la marca es el módulo `workspaces`.**
`WorkspaceId` se declara en `src/modules/workspaces/internal/types.ts` y se expone por `index.ts`. En
tiempo de ejecución es el `uuid` de `workspaces.id`; en compilación no es un `string` cualquiera.

La **única** aserción de tipo que aplica la marca vive en `src/modules/workspaces/internal/access.ts`,
inmediatamente después del repositorio: es el punto exacto en el que un valor leído de PostgreSQL pasa
a ser el identificador confiable. Desde ahí viaja marcado por `WorkspaceMembershipResolution` →
`WorkspaceAccessContext` → `WorkspaceScope`, y **ni `createWorkspaceScope` ni el orquestador ni
`resolve-workspace-access` contienen ninguna aserción**: solo reencuadran un valor que ya llega
marcado. `tests/module-boundary.test.ts` afirma el conjunto exacto de archivos que pueden aplicar la
marca, de modo que aparecer un segundo punto rompe la suite.

Qué garantiza esa cadena, con precisión:

- una cadena ordinaria —de una ruta, de un cuerpo JSON, de un parámetro de búsqueda— **no compila**
  como `WorkspaceId`, luego no llega por accidente ni al contexto, ni al scope, ni a un repositorio;
- **tampoco compila un `WorkspaceAccessContext` fabricado a mano** con `workspaceId: string`, que era
  el camino lateral de la primera versión de esta iteración: se podía construir un contexto literal
  con cualquier cadena y blanquearla a través del constructor del scope. El campo del contexto está
  marcado, así que ese camino está cerrado y una prueba `@ts-expect-error` lo fija.

Qué **no** garantiza, y conviene no confundirlo:

- nada frente a quien eluda deliberadamente el sistema de tipos con `as`, con `any` o con código sin
  tipar. Es una comprobación de compilación, no un control de ejecución;
- nada sobre si una consulta filtra de verdad por `workspace_id`. Eso depende de los repositorios de
  negocio, que **no existen todavía** (§8.1).

### 8. No se adopta Row-Level Security — `OD-18` cerrada

**`OD-18` queda cerrada: no se adopta Row-Level Security de PostgreSQL en el MVP actual.**

El aislamiento primario se compone de siete controles. **Cuatro existen y están verificados hoy; tres
son reglas escritas cuyo cumplimiento no se puede comprobar todavía**, y confundir ambos grupos sería
exactamente el autoengaño que este ADR dice querer evitar al rechazar «RLS a medias».

**Implantado y verificado en 2D:**

1. `WorkspaceAccessContext` resuelto en cada petición, sin memoización ni caché.
2. Catálogo cerrado de capacidades y matriz rol → capacidad como dato exhaustivo.
3. `WorkspaceId` nominal, con un único punto de marcado en la frontera de persistencia del módulo
   `workspaces`, más `WorkspaceScope`, el motor puro y el orquestador.
4. Fronteras estructurales verificadas en TypeScript, ESLint y `tests/module-boundary.test.ts`, y
   pruebas contra PostgreSQL real sin dobles (`ADR-008` T8-R1).

**Pendiente desde la iteración 3, cuando exista la primera entidad de negocio:**

5. El primer repositorio de negocio, con `WorkspaceScope` como primer parámetro real (`ADR-005`
   T5-R5). **Hoy no existe ninguno**, así que la regla no está en vigor sobre ningún código.
6. Consultas que filtren por `workspace_id` **en el `WHERE`**, nunca comparándolo después
   (`ADR-005` T5-R13). Sin consultas de negocio, no hay nada que comprobar.
7. Las pruebas de aislamiento por entidad que cierran `ADR-002` **A2** ([`TESTING.md`](../TESTING.md)
   §6), más la comprobación estructural de firmas de repositorio.

El punto 3 es lo que hace que los puntos 5 y 6 sean *implementables sin fricción* cuando llegue el
momento: el tipo del identificador ya no admite un valor arbitrario. Pero un tipo no sustituye a un
`WHERE`, y hasta que existan consultas reales `R-01` sigue siendo **crítica** (§Consecuencias).

**Por qué se difiere y no se adopta a medias.** RLS con un usuario de aplicación único exige propagar
el actor por variable de sesión en cada transacción. Hoy `src/platform/database/client.ts` mantiene un
`Pool` compartido de cuatro conexiones a nivel de módulo y ninguna transacción emite `SET LOCAL`.
Añadir RLS con conexiones que no fijan la variable daría una falsa seguridad **peor que no tenerla**:
las políticas parecerían proteger y no protegerían. Es la advertencia que ya recogía `ADR-005` §3.6, y
sigue siendo válida.

**Por qué diferirla es reversible.** `WorkspaceScope` transporta `workspaceId` y `userId`, que son
exactamente los dos valores que RLS necesitaría fijar como variables de sesión. Adoptarla más tarde
sería añadir un `SET LOCAL` en la apertura de transacción y las políticas SQL: **no habría que rehacer
el acceso a datos.**

**Revisión obligatoria** antes de una exposición multiusuario externa, y concretamente cuando ocurra
lo primero de:

- se invita al primer usuario externo real a un workspace `CLIENT`;
- aparece un segundo consumidor del `Pool` que no pasa por la capa de autorización.

**Lo que este cierre no autoriza:** rebajar `R-01` (fuga de datos entre workspaces) de gravedad
crítica. Sin entidades de negocio, el filtrado por `workspace_id` de cada consulta sigue sin una sola
verificación. `OD-18` cerrada significa que se ha elegido el mecanismo, no que esté comprobado.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| **Row-Level Security ahora** | El pool comparte un usuario de aplicación y ninguna transacción propaga el actor. RLS parcial da falsa seguridad (§8) |
| **Un `boolean` como decisión** | No distingue `DENIED_ROLE` de `DENIED_ARCHIVED`, que traducen a HTTP distinto; obligaría a re-derivar la razón, es decir, a una segunda copia de la regla del archivado |
| **Librería externa de autorización** (CASL, Casbin, Oso) | La matriz cabe en una pantalla. Una librería añadiría un DSL que habría que probar igual, una dependencia nueva —prohibida— y un lugar donde las reglas dejan de leerse como las tablas de `ROLES-AND-PERMISSIONS.md` |
| **Una capacidad por entidad y operación** | ~88 celdas que la documentación no distingue. Cada celda inventada es una decisión de autorización que nadie tomó |
| **Políticas dentro de cada módulo de dominio** | Contradice `ADR-001` regla 3. Además dispersaría la matriz y haría imposible probarla entera |
| **Autorización en un middleware global** | Un middleware no sabe qué acción se intenta, solo qué ruta se pide. Sería un punto de aplicación ciego a la mitad de la decisión |
| **403 para `DENIED_ARCHIVED`** | Reabriría D-17 sin necesidad. 409 describe mejor el impedimento: el estado del recurso, no un permiso ausente |
| **404 para `DENIED_ARCHIVED`** | Contradiría F1 A3 y F7, que exigen avisar al miembro de que el workspace está en solo lectura |
| **`tx` obligatoria en el scope** | Obligaría a abrir transacciones para leer, o a inventar una transacción nula |

## Consecuencias

**Positivas**

- La autorización es un dato legible al lado de la documentación que la justifica, no lógica dispersa.
- Un identificador de workspace llegado de fuera **no compila** donde se espera el interno, ni
  directamente ni a través de un contexto fabricado. Cuando existan repositorios, recibirán un tipo
  que una cadena arbitraria no satisface — pero el filtrado efectivo sigue siendo cosa de sus
  consultas, no del tipo (§8.1).
- Los tres resultados que deben ser indistinguibles salen de una sola construcción, y una prueba
  comprueba que sus cabeceras son además **mínimas**.
- El motor se prueba entero sin base de datos: 88 celdas, dos estados de workspace, sin escenario.
- Adoptar RLS más adelante no obligaría a rehacer el acceso a datos.

**Negativas**

- Seis de las once capacidades no tienen todavía operación que las consuma. Su granularidad se decidió
  con la documentación delante, pero sin código que la contraste: ver `R-15`.
- Sin RLS, un filtro `workspace_id` olvidado no falla, **devuelve datos**. Toda la mitigación son las
  pruebas de aislamiento por entidad, y no existe ninguna entidad todavía (`R-16`).
- Cada autorización cuesta dos viajes a PostgreSQL y no se puede cachear (`ADR-006` T6-R1). Aceptado a
  propósito: un rol cacheado sobrevive a su revocación.
- La marca de tipo de `WorkspaceId` exige una aserción en un punto. Está confinada a la frontera de
  persistencia del módulo `workspaces` y el conjunto de archivos que pueden aplicarla está afirmado por
  una prueba, pero sigue siendo una aserción: la corrección de ese único punto no la comprueba el
  compilador, la comprueba la revisión.
- Las pruebas unitarias del motor necesitan contextos sintéticos, así que el árbol de pruebas tiene su
  propio punto de marcado en `tests/support/workspace-access.ts`. Es deliberado y único, pero significa
  que la disciplina de «un solo lugar» se sostiene en dos sitios, no en uno.

## Reglas verificables

| # | Regla | Cómo se comprueba |
|---|---|---|
| T9-R1 | El catálogo tiene exactamente once capacidades y ningún duplicado | Prueba unitaria |
| T9-R2 | Toda capacidad tiene al menos un rol permitido y un efecto `READ` o `MUTATION` | Prueba unitaria por comportamiento |
| T9-R3 | Una capacidad fuera del catálogo no compila | `@ts-expect-error` en prueba unitaria |
| T9-R4 | La matriz cubre las 88 celdas y coincide con una tabla escrita a mano | Prueba unitaria con tabla duplicada a propósito |
| T9-R5 | El rol se evalúa antes del archivado | Prueba unitaria y de integración |
| T9-R6 | Toda mutación se deniega en un workspace archivado; toda lectura se permite | Pruebas unitarias (44 celdas) y de integración |
| T9-R7 | `WORKSPACE_NOT_FOUND`, `NO_ACTIVE_MEMBERSHIP` y `DENIED_ROLE` producen respuestas idénticas en estado, cuerpo y cabeceras | Prueba de integración que compara las tres respuestas serializadas |
| T9-R8 | Ninguna respuesta denegada contiene identificador, `public_id`, rol, estado de membresía, nombre ni correo | Prueba de integración |
| T9-R9 | El scope tiene exactamente `workspaceId`, `userId` y `role` | Pruebas unitaria y de integración |
| T9-R10 | El scope lleva el `uuid` interno, nunca el `public_id` | Prueba de integración |
| T9-R11 | La marca de `WorkspaceId` se aplica en un único punto de `src/`: la frontera de persistencia de `modules/workspaces`. Ni el contexto, ni el scope, ni el orquestador la reaplican | `tests/module-boundary.test.ts`, que afirma el conjunto exacto de archivos |
| T9-R12 | Los literales de capacidad existen solo en el catálogo y en la matriz | `tests/module-boundary.test.ts`, que afirma el conjunto **observado** de archivos con literales |
| T9-R13 | El motor puro no importa Next.js, Drizzle, Better Auth, la capa de datos ni HTTP | ESLint (alias y ruta relativa) y `tests/module-boundary.test.ts` sobre la ruta resuelta |
| T9-R14 | `platform/http` no importa el motor de políticas | ídem |
| T9-R15 | Ningún módulo de dominio importa la capa de autorización | ídem |
| **T9-R17** | Las cinco fronteras de capa se detectan **igual por alias que por ruta relativa** | `tests/module-boundary.test.ts`, con fixtures explícitos de ambas formas |
| **T9-R18** | Un `WorkspaceAccessContext` con `workspaceId: string` no compila | `@ts-expect-error` en prueba unitaria, verificado por `pnpm typecheck` |
| **T9-R19** | Las tres respuestas 404 llevan exactamente una cabecera: `content-type: application/json` | Prueba de integración |
| T9-R16 | Un fallo de infraestructura se propaga; no se traduce a denegación ni a 404 | Revisión de código: no hay `catch` en el orquestador |

## Condiciones de revisión

- **Se invita al primer usuario externo real, o aparece un consumidor del `Pool` fuera de la capa de
  autorización** → reevaluar RLS con su propio ADR (§8).
- **Aparece el primer repositorio de negocio** → añadir la comprobación estructural de firmas
  (`scope` como primer parámetro) que hoy no tendría nada que comprobar, y las pruebas de aislamiento
  por entidad de [`TESTING.md`](../TESTING.md) §6.
- **Se cierra `OD-19`** (restauración de workspace archivado) → añadir la capacidad correspondiente y,
  si es una mutación que debe permitirse estando archivado, será la primera excepción a §3.
- **Se resuelve `OD-17`** (visibilidad entre clientes) → puede afectar a `request.create` y a
  `review.submit` en el plano del filtrado, no en el de la capacidad.
- **Una capacidad necesita partirse o renombrarse** → se actualiza
  [`ROLES-AND-PERMISSIONS.md`](../ROLES-AND-PERMISSIONS.md) §12 en el mismo cambio. Añadir es libre;
  renombrar o partir no.
