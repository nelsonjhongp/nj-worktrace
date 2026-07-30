# TESTING

Referencia práctica de pruebas: dónde vive cada cosa, cómo se nombra y qué debe existir.

> La decisión y su justificación están en [`ADR-008`](decisions/ADR-008-testing-strategy.md).
> Aquí no se repiten: esto es el manual de trabajo.

**Estado en la iteración 2D:** existen **144 pruebas unitarias** y **87 de integración** contra
PostgreSQL real. Al empezar 2D la base era de 19 unitarias y 57 de integración. El resto de este
documento sigue siendo en parte especificación: lo que todavía no existe está marcado en §2.

---

## 1. Regla que gobierna todo lo demás

> **Ninguna prueba de autorización, visibilidad, publicación o aislamiento usa dobles de base de
> datos.** Corre contra PostgreSQL real o no cuenta.

Todo lo que sigue es consecuencia de esa regla (T8-R1).

## 2. Disposición

`✅` existe · `⏳` especificado, sin construir

```
tests/
├── unit/                     sin base de datos
│   ├── authorization/     ✅ catálogo, matriz rol × capacidad, WorkspaceScope
│   ├── time/              ⏳ duración por segmentos, límites de día y ciclo
│   ├── state/             ⏳ transiciones de ciclo, item y solicitud
│   └── schemas/           ⏳ esquemas Zod
├── integration/              PostgreSQL real, base desechable
│   ├── access/            ✅ resolución del contexto de acceso (2C)
│   ├── authorization/     ✅ autorización por acción y traducción HTTP (2D)
│   ├── isolation/         ⏳ ← obligatorio; bloquea la fusión
│   ├── integrity/         ⏳ restricciones, índices parciales, claves foráneas
│   ├── transactions/      ⏳ unidad de trabajo entre módulos
│   └── sessions/          ⏳ creación, validación, revocación
├── e2e/                   ⏳ Playwright contra la imagen construida
│   ├── owner/
│   ├── client/
│   └── viewports/            1366 × 768 y 390 × 844
└── support/
    ├── identity.ts        ✅ identidades reales creadas por Better Auth
    ├── workspaces.ts      ✅ workspaces y membresías
    ├── workspace-access.ts ✅ único punto de marcado de WorkspaceId en pruebas
    ├── database/          ⏳ plantilla, bases por trabajador, limpieza
    ├── scenario/          ⏳ escenario base (§4)
    └── factories/         ⏳ constructores de datos
```

Además existen, fuera de esta disposición y como desviación previa a 2D:
`tests/health.test.ts`, `tests/readiness.test.ts`, `tests/env.test.ts` y
`tests/module-boundary.test.ts` (16 comprobaciones de frontera estructural). Mover esos cuatro a
`tests/unit/` es un cambio con su propio propósito; no se ha hecho en 2D.

`tests/integration/isolation/` tendrá una regla de linting propia: **no puede importar dobles**
(T8-4). Hoy la prohibición se sostiene por `ADR-008` T8-R1 y por no existir ningún doble en el
repositorio.

### 2.1 Pruebas de autorización (iteración 2D)

| Archivo | Qué cubre |
|---|---|
| `tests/unit/authorization/workspace-capability.test.ts` | Catálogo cerrado de once capacidades; capacidad desconocida imposible en TypeScript |
| `tests/unit/authorization/workspace-policy.test.ts` | Las 88 celdas: 4 roles × 11 capacidades × `ACTIVE`/`ARCHIVED`; precedencia; asimetrías; pureza |
| `tests/unit/authorization/workspace-scope.test.ts` | Forma exacta del scope, serializabilidad, y la marca nominal: ni una cadena ni un contexto fabricado a mano compilan |
| `tests/integration/authorization/authorize-workspace-action.test.ts` | Autorización real contra PostgreSQL y Better Auth; traducción HTTP e indistinguibilidad |

**La tabla esperada de la matriz se escribe a mano en la prueba, no se importa de producción.** Una
prueba que calcula lo que espera a partir del código que prueba es una tautología: pasaría con una
matriz que lo concediera todo a todos. Es la regla más importante de este bloque.

El motor de políticas es puro, así que las 88 celdas se prueban **sin base de datos**. Eso no contradice
T8-R1: la prueba unitaria no usa un doble de PostgreSQL, es que no toca datos en absoluto. Lo que sí
exige PostgreSQL real es todo lo que parte de un contexto de acceso — y eso está en
`tests/integration/authorization/`.

## 3. Nombres de prueba

Toda regla nombrada aparece en el título de la prueba que la respalda (T8-R4). Así se puede
comprobar mecánicamente qué falta.

```
A1–A10   aislamiento por workspace        ADR-002
C1–C9    interacción del cliente          ADR-003
T4-n     stack de aplicación              ADR-004
T5-n     persistencia                     ADR-005
T6-n     autenticación y sesiones         ADR-006
T7-n     runtime y despliegue             ADR-007
T8-n     pruebas                          ADR-008
T9-n     autorización                     ADR-009
R1–R15   integridad del modelo            DATA-MODEL §8
D-nn     decisiones de producto           CURRENT-STATE §5
F1–F14   flujos                           USER-FLOWS
```

Formato: `<identificador> · <afirmación en presente>`

```
A3  · sin membresía activa se responde 404, no 403
A6  · un identificador de otro workspace no resuelve
A9  · workspace inexistente, ajeno y sin capacidad producen un 404 idéntico
C7  · publicar un cierre no crea filas en reviews
R6  · un usuario no puede tener dos sesiones RUNNING
T5-5 · los índices parciales de R5, R6 y R7 impiden el segundo registro
F13 · el cliente cambia su respuesta y se encadena una revisión nueva
```

*(El ejemplo de `T5-5` estaba mal en la versión anterior: citaba «solo un ciclo ACTIVE por
(workspace, project)», que no es lo que `ADR-005` §8 define como `T5-5`. Corregido para que el
índice no mienta, que es exactamente lo que §9 dice que le quita el valor.)*

Una prueba puede citar varios identificadores si de verdad cubre varios. No se cita lo que no se
prueba: el índice pierde su valor en cuanto miente una vez.

## 4. Escenario base

Montado una vez por ejecución sobre la base plantilla; cada prueba parte de él.

```
Workspace A  (CLIENT, America/Lima)
  Nelson      OWNER
  Sotravil    CLIENT
  M. Ríos     CLIENT        ← obliga a no asumir un cliente único (OD-02)

Workspace B  (CLIENT, Europe/Madrid)
  Nelson      OWNER         ← mismo usuario, otro workspace
  Otro cli.   CLIENT        ← no debe ver nada de A

Workspace P  (PERSONAL, America/Lima)
  Nelson      OWNER

Usuario sin ninguna membresía
```

Elegido para que los fallos aparezcan solos:

- **Dos clientes en A** — cualquier consulta que asuma singular falla aquí.
- **Nelson en A, B y P** — el rol no puede ser global (`OD-11`); si se filtrara, se vería.
- **Zonas horarias distintas** — un cálculo de día hecho en la zona equivocada produce resultados
  distintos en A y B.
- **Usuario sin membresía** — la prueba de 404 más importante.

Contenido mínimo en A: un ciclo `ACTIVE` y otro `CLOSED` con revisión; work items visibles e
internos; actualizaciones publicadas y en borrador; evidencias enlazadas a varios contextos, unas
publicadas y otras no; solicitudes de ambos clientes; una reunión publicada y otra interna.

**Ese contenido no es decorativo.** Cada pieza existe para que alguna prueba de fuga tenga algo que
encontrar si el filtro falla.

## 5. Ciclo de vida de la base

```
por ejecución    crear base → aplicar TODAS las migraciones → marcar como TEMPLATE
por trabajador   CREATE DATABASE ... TEMPLATE ...          (copia de archivos)
por prueba       transacción con reversión, o truncado si necesita confirmar
al terminar      eliminar las bases de los trabajadores
```

Efecto secundario valioso: como cada ejecución aplica las migraciones desde cero, **T5-7 —el esquema
se reproduce desde una base vacía— se verifica continuamente**, sin prueba dedicada.

Una base por trabajador, nunca compartida (T8-R3): compartirla produce fallos intermitentes al
paralelizar, y una suite en la que se desconfía de los fallos intermitentes deja de leerse.

## 6. Cobertura obligatoria de aislamiento

Por **cada entidad** de [`DATA-MODEL.md`](DATA-MODEL.md) §4 y **cada rol**, una prueba que compruebe
que un actor sin la membresía adecuada obtiene **404** — no 403, no lista vacía, no error genérico
(T8-R5).

| Bloque | Qué debe fallar |
|---|---|
| Entre workspaces | Cliente de A pide recurso de B por identificador |
| Sin membresía | Usuario sin membresías pide cualquier recurso |
| Borradores | Cliente ve algo `DRAFT` |
| Interno | Cliente ve algo `INTERNAL` |
| Sesiones | Cliente lee `work_sessions` o segmentos |
| Proyectos | Cliente obtiene un listado de proyectos, o el nombre de uno `INTERNAL` |
| Evidencias | Evidencia publicada enlazada solo a contexto interno aparece en el índice |
| Hilos | Cliente lee un hilo cuyo ancla dejó de ser accesible |
| Canales | Cliente escribe fuera de sus cuatro canales |
| Entre clientes | Un cliente ve solicitudes o revisiones de otro (`OD-17`) |
| Sondeo | Enumerar identificadores atraviesa un workspace |
| Nombres | El alta de workspace revela que un nombre existe (A8) |
| Capacidades | Un rol ejecuta una acción sin su capacidad, o la distingue de un recurso inexistente (A9) |
| Archivado | Una mutación se ejecuta en un workspace archivado (D-34) |

## 7. Extremo a extremo

| Aspecto | Regla |
|---|---|
| Objetivo | La **imagen construida**, no el servidor de desarrollo (T8-R7) |
| Roles | `storageState` separado para propietario y cliente |
| Viewports | 1366 × 768 y 390 × 844; al menos un recorrido completo en cada uno |
| Datos | Preparados por API o base, nunca pinchando por la interfaz (T8-R8) |
| Cobertura | Los 14 flujos de [`USER-FLOWS.md`](USER-FLOWS.md) |
| Estados | Vacío, carga y error, no solo el camino feliz |
| `DEMO_MODE` | Desactivado, salvo las pruebas que verifican su ausencia |

Comprobaciones E2E que no encajan en otro sitio:

- La cookie de sesión trae `HttpOnly`, `Secure` y `SameSite=Lax` (T6-3).
- Los estáticos y `public/` se sirven desde la imagen (T7-4).
- Una ruta `/w/...` con rol `CLIENT` devuelve 404.
- Con `DEMO_MODE` desactivado, los accesos de demostración no existen (T6-6).

## 8. En integración continua

| Momento | Qué corre |
|---|---|
| Cada cambio | Tipos · linting · unidad · **integración** · **aislamiento** · construcción de imagen |
| Antes de fusionar | E2E |
| Periódico | Auditoría de dependencias |

**Una prueba de aislamiento en rojo bloquea la fusión** (T8-R6). No se marca como pendiente, no se
omite, no se fusiona con la promesa de arreglarlo después. Si una prueba de aislamiento estorba,
lo que está mal es el código.

## 9. Lo que no se mide

**No hay umbral de porcentaje de cobertura** (T8-R9). Premia probar lo fácil y no dice nada sobre si
lo crítico está cubierto.

El indicador es otro, y sí se puede verificar: **toda regla nombrada tiene una prueba que la cita**
(T8-2). Si un identificador no aparece en ningún título, está sin cubrir, y eso es una respuesta
útil — a diferencia de un 84 %.
