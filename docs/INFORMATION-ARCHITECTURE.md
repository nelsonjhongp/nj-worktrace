# INFORMATION ARCHITECTURE

Navegación, jerarquía y rutas. Dos aplicaciones distintas sobre los mismos datos: la del propietario
y la del cliente.

> Revisado en la **iteración 0.1**: `K-01` y `K-02` **confirmadas** (ya no son propuestas), rutas
> por identificador opaco y acceso derivado del cliente a los proyectos.

---

## 1. Principio rector

**El workspace es el contexto raíz, no una sección.**
Todo lo que ves depende de un workspace activo. Cambiar de workspace cambia toda la aplicación. Por
eso el conmutador vive en la cabecera y no en la navegación principal — no es un destino, es un
marco.

Segundo principio: **la navegación del cliente no es la del propietario con cosas ocultas.** Son dos
mapas distintos. Ocultar botones de una interfaz de propietario produce una interfaz confusa y una
superficie de fuga.

## 2. Navegación (confirmada en la iteración 0.1)

### 2.1 Propietario

| Propuesta inicial | Decisión | Motivo |
|---|---|---|
| Inicio | **Inicio** | Se mantiene. Es la bandeja de lo que requiere atención. |
| Trabajo | **Trabajo** | Se mantiene. Es donde se pasa el 80 % del tiempo. |
| Proyectos | *(absorbido en Trabajo)* | Un proyecto sin su ciclo y sus items no es nada. Separarlo obliga a saltar entre secciones para una sola tarea. Pasa a ser el **primer nivel de la jerarquía dentro de Trabajo**. |
| Actualizaciones | **Actualizaciones** | Se mantiene. Es un ritual distinto del registro: se redacta y se publica, con su propia cadencia. |
| Reuniones | **Reuniones** | Se mantiene. Baja frecuencia, pero contenido y ciclo de vida propios. |
| Workspaces | **A la cabecera + Ajustes** *(`K-01` confirmada)* | El workspace es el **contexto raíz**, no un destino: como sección, la navegación se vuelve recursiva. Se **selecciona desde la cabecera**; su **administración vive en Ajustes** (miembros, tipo, zona horaria). **No es una sección de navegación principal.** |

**Resultado: 4 secciones principales.**

```
Inicio · Trabajo · Actualizaciones · Reuniones
[cabecera: conmutador de workspace · cronómetro activo · ajustes]
```

### 2.2 Cliente

| Propuesta inicial | Decisión | Motivo |
|---|---|---|
| Resumen | **Resumen** | Se mantiene. Semana activa, objetivo, pendientes del cliente. |
| Actividad | **Actividad** | Se mantiene. Línea temporal de actualizaciones publicadas. |
| Funcionalidades | **Funcionalidades** | Se mantiene. Vista por resultado, no por día. Complementa a Actividad, no la duplica. |
| Evidencias | **Pestaña dentro de Actividad** *(`K-02` confirmada)* | Una evidencia siempre está enlazada a algo. Como sección propia es una lista sin contexto. **No es sección principal**: es un **índice contextual filtrable** (`Actividad → Evidencias`), útil para auditar. Las evidencias **siguen apareciendo dentro de** actualizaciones, funcionalidades y ciclos, que es la vía principal. |
| Reuniones | **Reuniones** | Se mantiene. |
| Solicitudes | **Solicitudes** | Se mantiene. Es el canal propio del cliente; debe ser obvio. |

**Resultado: 5 secciones principales** — el máximo razonable para una barra inferior móvil.

```
Resumen · Actividad · Funcionalidades · Reuniones · Solicitudes
```

### 2.3 Lo que se rechazó

- **Fusionar Actividad y Funcionalidades.** Responden a preguntas distintas: *¿qué pasó esta semana?*
  frente a *¿en qué estado está lo que pedí?* Fusionarlas obliga a elegir un eje y perder el otro.
- **Dar al cliente un "Inicio" idéntico al del propietario.** El cliente no tiene bandeja de trabajo;
  tiene un resumen de estado y sus propios pendientes.
- **Una sección "Horas".** Las horas son un atributo de la actividad y del ciclo, no un destino.
  Aislarlas convierte la relación en un contador y desplaza la conversación a la facturación.

## 3. Jerarquía de contenido

```
Workspace
└── Proyecto
    ├── Ciclo de trabajo (semana)
    │   ├── Objetivo
    │   ├── Actualizaciones diarias
    │   ├── Cierre + revisión del cliente
    │   └── Reuniones asociadas
    └── Work items (árbol)
        ├── INITIATIVE
        │   └── FEATURE
        │       └── TASK / BUG / RESEARCH
        ├── Sesiones de trabajo → segmentos
        └── Evidencias
```

Los ciclos y los work items son **ejes cruzados**: un ciclo planifica work items y un work item
puede atravesar varios ciclos, mediante `work_cycle_items` (`OD-08`, cerrada). La interfaz debe
permitir entrar por cualquiera de los dos, y el detalle de un item muestra **en qué ciclos ha
participado**, con su estado al cierre de cada uno.

## 4. Rutas

Toda ruta de contenido lleva el workspace. Es explícito a propósito: hace obvio el aislamiento y
hace imposible una ruta ambigua.

**`:ws` es `workspaces.public_id`: un identificador opaco, no correlativo y no adivinable.**
Nunca es el nombre ni un `slug` legible. Un identificador adivinable invita al sondeo, y una
validación global de nombres es un oráculo de existencia
([`DATA-MODEL.md`](DATA-MODEL.md) §4.3.1). El nombre legible se muestra en la cabecera; no navega.
Lo mismo aplica a `:projectId`, `:cycleId`, `:itemId`, `:updateId` y `:meetingId`, que usan el
`public_id` de su entidad.

### 4.1 Propietario

| Ruta | Pantalla |
|---|---|
| `/login` | Inicio de sesión |
| `/w` | Selector de workspace *(solo si hay más de uno)* |
| `/w/:ws` | Inicio |
| `/w/:ws/work` | Trabajo — cronómetro + ciclo activo |
| `/w/:ws/work/projects` | Lista de proyectos |
| `/w/:ws/work/projects/:projectId` | Proyecto: ciclos e items |
| `/w/:ws/work/cycles/:cycleId` | Ciclo: objetivo, items, horas, cierre |
| `/w/:ws/work/items/:itemId` | Work item: detalle, sesiones, evidencias, hilo |
| `/w/:ws/updates` | Actualizaciones diarias |
| `/w/:ws/updates/:date` | Editor / detalle de una actualización |
| `/w/:ws/meetings` | Reuniones |
| `/w/:ws/meetings/:meetingId` | Reunión: agenda, notas, decisiones |
| `/w/:ws/requests` | Bandeja de solicitudes del cliente *(no es sección; se entra desde Inicio)* |
| `/w/:ws/settings` | Ajustes del workspace: miembros, tipo, zona horaria |
| `/account` | Perfil y sesiones activas |

### 4.2 Cliente

| Ruta | Pantalla |
|---|---|
| `/c/:ws` | Resumen |
| `/c/:ws/activity` | Actividad (actualizaciones publicadas) |
| `/c/:ws/activity/evidence` | Índice de evidencias |
| `/c/:ws/activity/:updateId` | Actualización + conversación |
| `/c/:ws/features` | Funcionalidades visibles |
| `/c/:ws/features/:itemId` | Funcionalidad: estado, horas, evidencias, hilo |
| `/c/:ws/cycles/:cycleId` | Semana: objetivo, actividad, cierre, revisión |
| `/c/:ws/meetings` · `/c/:ws/meetings/:id` | Reuniones |
| `/c/:ws/requests` · `/c/:ws/requests/:id` | Solicitudes *(y su conversación)* |

**Rutas que no existen para el cliente**, y devuelven **404**: `/c/:ws/projects` — el cliente no
tiene listado de proyectos. El nombre del proyecto le llega como **etiqueta** junto al contenido
accesible, y solo si `projects.visibility = CLIENT_VISIBLE`; en caso contrario el campo se omite.
Ver [`DATA-MODEL.md`](DATA-MODEL.md) §5.3 y [`ROLES-AND-PERMISSIONS.md`](ROLES-AND-PERMISSIONS.md) §6.2.

**Prefijos distintos (`/w` y `/c`) a propósito.** Hacen imposible que una ruta de propietario se
sirva por accidente en contexto de cliente, y hacen visible el error en los registros del servidor.
El prefijo no es la autorización — esa vive en la capa de datos — pero sí una segunda barrera.

## 5. Simplificaciones adaptativas

La interfaz esconde niveles que no aportan:

| Condición | Efecto |
|---|---|
| Un solo workspace | Sin conmutador ni `/w`. Se entra directo. |
| Un solo proyecto en el workspace | El nivel *Proyecto* desaparece de la navegación; se mantiene en los datos. Para el cliente, la etiqueta de proyecto se omite siempre por irrelevante. |
| Workspace `PERSONAL` | Sin *publicar*, *vista previa como cliente*, *solicitudes* ni *revisiones*. **Ausentes, no deshabilitados.** |
| Workspace sin miembros `CLIENT` | Los controles de visibilidad se simplifican a `PRIVATE` / `INTERNAL`. |
| Cliente en un solo workspace | Sin conmutador. Nunca se insinúa que existan otros. |
| Cliente en varios workspaces | Conmutador mínimo en la cabecera, solo con sus membresías activas (`OD-02`, cerrada). |
| Usuario con roles distintos según workspace | Al conmutar cambia la aplicación entera: prefijo, secciones y vocabulario. Ser `OWNER` en uno no concede nada en otro (`OD-11`, cerrada). |
| Un solo cliente en el workspace | La interfaz del propietario dice *"el cliente"*; con varios, nombra a cada uno. Ninguna consulta asume la cardinalidad. |

Regla: **nunca se muestra un control deshabilitado cuyo motivo no se pueda explicar en una línea.**
Un control que no aplica se retira.

## 6. Estructura de pantalla

**Laptop 1366 × 768** — el alto útil es escaso: ~640 px tras cabecera y barra del navegador.

```
┌────────────────────────────────────────────────────────┐
│ Cabecera 48px: workspace ▾ · cronómetro · perfil       │
├──────────┬─────────────────────────────────────────────┤
│ Lateral  │ Contenido                                   │
│ 200px    │ máx. 1100px, columna principal + panel      │
│ 4–5 items│                                             │
└──────────┴─────────────────────────────────────────────┘
```

**Móvil 390 × 844**

```
┌──────────────────────┐
│ Cabecera 56px        │
├──────────────────────┤
│ Contenido            │
│ una sola columna     │
│ paneles → hojas      │
├──────────────────────┤
│ Barra inferior 56px  │  ← 4 (propietario) / 5 (cliente)
└──────────────────────┘
```

El **cronómetro activo** es persistente en ambos tamaños: en la cabecera en laptop, como barra fija
sobre la barra inferior en móvil. Nunca se pierde de vista una sesión en marcha.

## 7. Acción principal por pantalla

Una sola acción primaria por pantalla. Las demás son secundarias.

| Pantalla | Acción principal |
|---|---|
| Inicio (propietario) | Reanudar o iniciar trabajo |
| Trabajo | Iniciar / pausar / finalizar sesión |
| Proyecto · Ciclo | Abrir o preparar el cierre del ciclo |
| Editor de actualización | Publicar |
| Reunión | Registrar decisiones |
| Resumen (cliente) | Responder lo pendiente (revisión o aclaración) |
| Actividad (cliente) | Comentar |
| Funcionalidades (cliente) | Abrir detalle |
| Solicitudes (cliente) | Nueva solicitud |

## 8. Vocabulario visible

El cliente no debería aprender jerga interna.

| Concepto interno | Etiqueta para el propietario | Etiqueta para el cliente |
|---|---|---|
| `work_cycle` | Ciclo / Semana | Semana |
| `work_item` (`FEATURE`) | Work item | Funcionalidad |
| `daily_update` | Actualización | Actualización diaria |
| `evidence_item` | Evidencia | Evidencia |
| `client_request` | Solicitud | Mi solicitud |
| `review` | Revisión del cliente | Tu revisión |
| `work_state` | Estado | Estado |
| `visibility` | Visibilidad | *(no se muestra)* |
| `publication_state` | Borrador / Publicado | *(no se muestra)* |

El cliente **nunca** ve las palabras "visibilidad", "borrador" ni "interno". Solo ve lo que existe
para él; la maquinaria que lo decide es invisible.

## 9. Decisiones abiertas relacionadas

`OD-14` (idioma de la interfaz) · `OD-17` (si un cliente ve las solicitudes de otros clientes →
afecta al listado de *Solicitudes*).

Cerradas en la iteración 0.1 y ya incorporadas aquí: `K-01` (workspace fuera de la navegación
principal), `K-02` (evidencias como pestaña de *Actividad*), `OD-02` (conmutador para el cliente),
`OD-08` (navegación cruzada ciclo ↔ item vía `work_cycle_items`) y `OD-11` (roles por workspace).
