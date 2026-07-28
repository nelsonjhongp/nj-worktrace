# ADR-008 · Estrategia de pruebas

- **Estado:** Aceptada
- **Fecha:** 2026-07-28
- **Contexto de la decisión:** Iteración 1 (decisiones técnicas)
- **Relacionada con:** [`ADR-002`](ADR-002-workspace-boundary.md) A1–A8,
  [`ADR-003`](ADR-003-client-interaction.md) C1–C9, [`ADR-005`](ADR-005-persistence-and-migrations.md)

---

## 1. Contexto

Este producto tiene una propiedad poco común: **su fallo más grave es silencioso**. Un error de
aislamiento no rompe nada, no lanza excepciones y no aparece en los registros. Simplemente un
cliente ve algo que no era suyo, y probablemente nadie se entere.

`ADR-002` y `ADR-003` ya establecieron diecisiete reglas verificables (A1–A8, C1–C9) precisamente
porque una garantía que no se comprueba no es una garantía. Este ADR decide **con qué** se comprueban
y, sobre todo, **contra qué**.

## 2. Fuerzas y restricciones

| # | Fuerza | Implicación |
|---|---|---|
| F1 | El fallo crítico es silencioso | Hay que provocarlo activamente en las pruebas |
| F2 | La autorización vive en la capa de datos (`ADR-005` §3.6) | Un doble de base de datos **no puede** verificarla |
| F3 | Varias invariantes viven en restricciones de PostgreSQL (`ADR-005` §3.5) | Solo PostgreSQL real puede comprobarlas |
| F4 | Un solo mantenedor | Suite rápida; si tarda, se deja de ejecutar |
| F5 | Dos interfaces distintas sobre los mismos datos | E2E con ambos roles, en ambos tamaños |
| F6 | 22 entidades y 15 reglas de integridad | Las pruebas deben mapear a reglas nombradas, no a "cobertura" |

## 3. Decisión

**Vitest para unidad e integración, PostgreSQL real y desechable para toda prueba de autorización o
integridad, y Playwright para extremo a extremo. Prohibidos los dobles de base de datos en las
pruebas de autorización.**

### 3.1 Herramientas

| Nivel | Herramienta | Línea | Contra qué corre |
|---|---|---|---|
| Unidad | **Vitest** | **`4.1.x`** (estable — ver nota) | Memoria. Sin base de datos |
| Integración | **Vitest** | igual | **PostgreSQL real**, base desechable |
| Extremo a extremo | **Playwright** | `1.57+` | Aplicación construida + PostgreSQL real |

Vitest se elige por coherencia: comparte transformación y configuración con el proyecto, con lo que
no hace falta una cadena de compilación distinta solo para probar (F4).

**Nota de versión.** Vitest 5 **sigue en beta** al cerrar este ADR. Para la cimentación se fija
**`4.1.x`**, que es la línea estable que recibe correcciones críticas y de seguridad. Vitest 5 queda
como **condición de revisión** (§8): se evalúa su adopción cuando alcance versión estable, no antes,
y con su propia comprobación de compatibilidad — no como actualización rutinaria de rango.

### 3.2 Qué se prueba en cada nivel

| Nivel | Le corresponde | **No** le corresponde |
|---|---|---|
| **Unidad** | Cálculo de duración a partir de segmentos · límites de día y ciclo en zona IANA · transiciones de estado · esquemas Zod · derivación de "revisión pendiente" | Cualquier cosa que consulte datos |
| **Integración** | **Todo lo que decide quién ve qué** · restricciones e índices parciales · transacciones entre módulos · migraciones desde base vacía · sesiones y revocación | Detalles de presentación |
| **E2E** | Los catorce flujos de [`USER-FLOWS.md`](../USER-FLOWS.md) · la separación `/w` ↔ `/c` · cookies · estados vacíos, de carga y de error · 1366 × 768 y 390 × 844 | Casos límite del dominio, más baratos abajo |

**La forma de la suite no es una pirámide.** El peso está en integración, porque ahí es donde vive el
riesgo (F1, F2). Una suite unitaria enorme sobre un dominio cuyo fallo crítico es de datos daría
confianza falsa.

### 3.3 Prohibición explícita de dobles de base de datos

**Ninguna prueba de autorización, visibilidad, publicación o aislamiento puede usar un doble, un
simulacro o una base en memoria.**

No es una preferencia de estilo. Es que un doble **no puede fallar como falla la realidad**:

- Un `WHERE workspace_id = ?` olvidado se comporta bien contra un doble que ya filtra en su código
  de imitación, y mal contra PostgreSQL.
- Un índice parcial único ausente no lo detecta ningún doble.
- SQLite en memoria no tiene `timestamptz` ni la misma semántica de índices parciales: pasaría
  pruebas que PostgreSQL suspendería, que es el peor resultado posible.

Los dobles siguen siendo válidos para lo que no toca datos: reloj, generación de identificadores,
llamadas externas —de las que hoy no hay ninguna—.

### 3.4 Bases desechables

Requisito: cada trabajador de prueba necesita **su propia base**, aislada y limpia, sin que crearla
cueste segundos (F4).

**Mecanismo elegido — base plantilla:**

1. Una vez por ejecución: crear una base, aplicar **todas las migraciones** y marcarla como
   `TEMPLATE`.
2. Por cada trabajador: `CREATE DATABASE ... TEMPLATE ...`, que en PostgreSQL es una copia de
   archivos, no una reejecución de migraciones.
3. Por cada prueba: transacción con reversión al terminar, o truncado de tablas cuando la prueba
   necesite confirmar de verdad.
4. Al final: eliminar las bases de los trabajadores.

Ventaja adicional: aplicar las migraciones en cada ejecución convierte **T5-7** —el esquema se
reproduce desde cero— en algo que se comprueba continuamente, sin prueba dedicada.

La instancia de PostgreSQL la levanta Docker Compose ([`ENVIRONMENTS.md`](../ENVIRONMENTS.md)). Se
evalúa Testcontainers en la iteración 2 si gestionar el ciclo de vida a mano resulta incómodo; no se
decide hoy porque añade una dependencia para un problema que quizá no aparezca.

### 3.5 Pruebas de aislamiento: obligatorias y sistemáticas

Es la parte no negociable, y por eso tiene su propia sección.

**Regla de cobertura, formulada para poder fallar:** por **cada entidad** de
[`DATA-MODEL.md`](../DATA-MODEL.md) y **cada rol** de
[`ROLES-AND-PERMISSIONS.md`](../ROLES-AND-PERMISSIONS.md) §5, existe una prueba que comprueba que un
actor **sin** la membresía adecuada obtiene **404** —no 403, no una lista vacía, no un error
genérico—.

Escenario base, montado una vez y reutilizado:

```
Workspace A: Nelson OWNER,  Sotravil CLIENT,  M. Ríos CLIENT
Workspace B: Nelson OWNER,  Otro cliente CLIENT
Workspace P: Nelson OWNER   (PERSONAL)
Un usuario sin ninguna membresía
```

Con él se cubren de forma natural:

| Prueba | Regla que respalda |
|---|---|
| Cliente de A pide un recurso de B por su identificador → **404** | `ADR-002` A3, A6 |
| Usuario sin membresía pide cualquier cosa → **404** | A3 |
| Cliente ve borradores o contenido `INTERNAL` → **debe fallar** | D-02, `ADR-002` A2 |
| Cliente escribe fuera de sus cuatro canales → **debe fallar** | `ADR-003` C1 |
| Cliente ve solicitudes o revisiones de otro cliente | `OD-17`, valor por defecto del MVP |
| Sondeo de identificadores entre workspaces | A6 |
| Alta de workspace con nombre repetido no revela nada | A8 |
| Ninguna ruta usa nombre legible como identificador | A7 |

**Estas pruebas son el criterio de terminado de la iteración 2** ([`MVP-PLAN.md`](../MVP-PLAN.md)),
no un añadido posterior.

### 3.6 Trazabilidad entre reglas y pruebas

`ADR-002` A1–A8, `ADR-003` C1–C9 y las reglas T4–T8 de esta iteración forman un conjunto cerrado de
identificadores. **Cada uno se nombra en el título de la prueba que lo respalda**, de modo que sea
posible comprobar mecánicamente que ninguno se quedó sin cubrir.

```
test('A3 · sin membresía activa se responde 404, no 403', ...)
test('C7 · publicar un cierre no crea filas en reviews', ...)
test('T5-5 · solo un ciclo ACTIVE por (workspace, project)', ...)
```

Esto sustituye a los porcentajes de cobertura. **No se fija un umbral de cobertura**: premia probar
lo fácil y no dice nada sobre si lo crítico está cubierto (F6). El indicador es *"toda regla
nombrada tiene su prueba"*, que sí se puede verificar.

### 3.7 E2E

- **Ambos roles**, con `storageState` distinto por rol, para no repetir el inicio de sesión.
- **Ambos tamaños**: 1366 × 768 y 390 × 844, con al menos un recorrido completo en cada uno (F5).
- **Contra la imagen construida** en CI, no contra el servidor de desarrollo: así se verifica de paso
  T7-4, que los estáticos se sirven.
- Los datos se preparan por **API o base de datos**, nunca pinchando por la interfaz para llegar al
  estado de partida.
- **Sin `DEMO_MODE`** en las ejecuciones normales; hay pruebas propias que verifican que sus accesos
  **no existen** cuando está desactivado (T6-6).

### 3.8 Ejecución en CI

| Momento | Qué corre |
|---|---|
| Cada cambio | Tipos, linting, unidad, integración |
| Cada cambio | **Pruebas de aislamiento**, sin excepción |
| Cada cambio | Construcción de la imagen |
| Antes de fusionar | E2E |
| Periódicamente | Auditoría de dependencias |

Regla dura: **una prueba de aislamiento en rojo bloquea la fusión.** No se marca como pendiente, no
se salta, no se fusiona "para arreglarlo después". Si estorba, es señal de que el código está mal, no
la prueba.

## 4. Alternativas consideradas

| Alternativa | Evaluación | Veredicto |
|---|---|---|
| **Vitest** | Comparte transformación con el proyecto; ejecución paralela por trabajador que encaja con la base por trabajador | **Adoptada** |
| **Jest** | Maduro y conocido, pero exige una cadena de transformación aparte para TypeScript moderno | Descartada |
| **Runner nativo de Node.js** | Sin dependencias, atractivo. Ecosistema de utilidades menor y peor integración con el proyecto | Descartada |
| **PostgreSQL real en integración** | Única forma de verificar F2 y F3 | **Adoptada** |
| **SQLite en memoria** | Rapidísimo. Semántica distinta: pasaría pruebas que PostgreSQL suspende. **Peor que no probar** | Descartada |
| **Dobles de repositorio para autorización** | Rápido y cómodo. Verifica el doble, no el sistema (§3.3) | **Prohibida** |
| **Base plantilla de PostgreSQL** | Copia de archivos; barata; verifica las migraciones de paso | **Adoptada** |
| **Testcontainers** | Aislamiento excelente y reproducible. Añade dependencia y tiempo de arranque para un problema que Compose ya resuelve | Aplazada a la iteración 2 |
| **Una sola base compartida con limpieza entre pruebas** | Simple hasta que se paraleliza; entonces produce fallos intermitentes que erosionan la confianza en la suite | Descartada |
| **Playwright** | Multinavegador, viewports, `storageState`, trazas | **Adoptada** |
| **Cypress** | Buena herramienta; multinavegador y paralelismo menos naturales | Descartada |
| **Umbral de porcentaje de cobertura** | Fácil de medir, mal alineado con el riesgo (§3.6) | **Descartada expresamente** |

## 5. Consecuencias

**Positivas**

- La garantía central del producto se comprueba de forma automática y sistemática.
- Probar contra PostgreSQL real detecta la clase de fallo que importa.
- La trazabilidad regla → prueba hace visible lo que falta.
- Las migraciones se validan en cada ejecución, sin prueba dedicada.
- E2E contra la imagen verifica el artefacto real.

**Negativas**

- Integración más lenta que con dobles. Aceptado: es la parte que aporta la confianza.
- Requiere PostgreSQL disponible para desarrollar y para CI.
- Mantener el escenario base cuesta trabajo cuando el modelo cambia.
- Sin umbral de cobertura, hace falta criterio para decidir qué merece prueba; la trazabilidad lo
  acota pero no lo sustituye.

## 6. Reglas derivadas

| # | Regla |
|---|---|
| T8-R1 | Ninguna prueba de autorización, visibilidad, publicación o aislamiento usa dobles de base de datos. |
| T8-R2 | Toda prueba de integración corre contra PostgreSQL real, en base desechable. |
| T8-R3 | Cada trabajador tiene su propia base; ninguna se comparte. |
| T8-R4 | Toda regla nombrada (A1–A8, C1–C9, T4–T8) tiene una prueba que la cita en su título. |
| T8-R5 | Existe prueba de 404 por cada entidad y cada rol. |
| T8-R6 | Una prueba de aislamiento en rojo bloquea la fusión. Sin excepciones ni omisiones. |
| T8-R7 | El E2E corre contra la imagen construida, no contra el servidor de desarrollo. |
| T8-R8 | Los datos de prueba se preparan por API o base, nunca por la interfaz. |
| T8-R9 | No se fija umbral de porcentaje de cobertura. |
| T8-R10 | Las pruebas no se ejecutan con `DEMO_MODE` activo, salvo las que lo verifican. |

## 7. Criterios verificables

| # | Criterio | Cómo se comprueba |
|---|---|---|
| T8-1 | Toda entidad tiene su prueba de aislamiento | Comprobación que cruza la lista de entidades con los títulos de prueba |
| T8-2 | Toda regla A/C/T tiene prueba que la nombra | Comprobación de identificadores en CI |
| T8-3 | La suite pasa en una base creada desde cero | Ejecución limpia en CI |
| T8-4 | Ninguna prueba de autorización importa un doble | Regla de linting sobre los directorios de esas pruebas |
| T8-5 | Correr en paralelo da el mismo resultado que en serie | Ejecución con uno y con varios trabajadores |
| T8-6 | El E2E cubre los 14 flujos en ambos viewports | Inventario de pruebas frente a `USER-FLOWS.md` |
| T8-7 | La suite completa termina en un tiempo que invite a ejecutarla | Medición en CI; si deja de cumplirse, se replantea (F4) |

## 8. Condiciones de revisión

- **La integración se vuelve demasiado lenta** → revisar §3.4 (Testcontainers, plantillas, paralelismo).
  **Nunca** se resuelve reintroduciendo dobles: eso elimina la prueba, no el problema.
- **Aparece un segundo desarrollador** → replantear cadencia de CI y ejecución local.
- **Aparecen servicios externos** → decidir su estrategia de doble; sigue sin aplicar a datos.
- **Vitest 5 alcanza versión estable** → evaluar su adopción con su propia comprobación de
  compatibilidad. Hasta entonces, `4.1.x` es la línea fijada y sigue recibiendo correcciones
  críticas y de seguridad.

## 9. Fuentes oficiales consultadas

Consultadas el 2026-07-28:

- [Vitest — sitio oficial](https://vitest.dev/)
- [Vitest 4.0 — anuncio](https://vitest.dev/blog/vitest-4)
- [Vitest 4.1 — anuncio](https://vitest.dev/blog/vitest-4-1.html)
- [Vitest — Releases (líneas mantenidas)](https://main.vitest.dev/releases)
- [Playwright — Release notes](https://playwright.dev/docs/release-notes)
- [Playwright — Installation](https://playwright.dev/docs/intro)
- [Playwright — Browsers](https://playwright.dev/docs/browsers)
- [PostgreSQL — Documentación 18](https://www.postgresql.org/docs/current/index.html)
