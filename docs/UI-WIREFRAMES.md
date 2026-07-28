# UI WIREFRAMES

Wireframes de **baja fidelidad**. Sin branding, sin colores decorativos, sin ilustraciones, sin
tipografía definida. Solo estructura, jerarquía y comportamiento.

**Objetivos:** laptop **1366 × 768** y móvil **390 × 844**.
Las cajas ASCII son proporcionales, no medidas exactas.

**Convenciones**
`[Botón]` acción · `[[Acción principal]]` acción primaria · `▾` desplegable ·
`( )` radio · `[ ]` casilla · `···` menú · `▸ ▾` plegable · `⏱` cronómetro activo

Referencias: [`INFORMATION-ARCHITECTURE.md`](INFORMATION-ARCHITECTURE.md) ·
[`USER-FLOWS.md`](USER-FLOWS.md) · [`ROLES-AND-PERMISSIONS.md`](ROLES-AND-PERMISSIONS.md)

---

## Índice

1. [Inicio de sesión](#1--inicio-de-sesión)
2. [Dashboard del propietario](#2--dashboard-del-propietario-inicio)
3. [Proyecto y semana activa](#3--proyecto-y-semana-activa)
4. [Temporizador y registro de trabajo](#4--temporizador-y-registro-de-trabajo)
5. [Preparación de actualización diaria](#5--preparación-de-actualización-diaria)
6. [Dashboard del cliente](#6--dashboard-del-cliente)
7. [Detalle de semana / actualización con conversación](#7--detalle-de-semana--actualización-con-conversación)

Al final: [estados transversales](#estados-transversales) y
[diferencias OWNER / CLIENT](#diferencias-owner--client).

---

## 1 · Inicio de sesión

**Jerarquía:** nombre del producto → formulario → (solo en demo) accesos rápidos.
**Acción principal:** *Entrar*.

### Laptop 1366 × 768

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                                                                          │
│                        nj-worktrace                                      │
│                        Trazabilidad de trabajo                           │
│                                                                          │
│                   ┌────────────────────────────────┐                     │
│                   │ Correo                         │                     │
│                   │ [____________________________] │                     │
│                   │                                │                     │
│                   │ Contraseña                     │                     │
│                   │ [____________________________] │                     │
│                   │                                │                     │
│                   │ [[         Entrar          ]]  │                     │
│                   │                                │                     │
│                   └────────────────────────────────┘                     │
│                                                                          │
│         ┌────────────────────────────────────────────────┐               │
│         │ ⚠ MODO DEMOSTRACIÓN — datos ficticios          │  ← DEMO_MODE  │
│         │                                                │     únicamente│
│         │  [ Entrar como propietario ]                   │               │
│         │  [ Entrar como cliente demo ]                  │               │
│         └────────────────────────────────────────────────┘               │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Móvil 390 × 844

```
┌────────────────────────┐
│                        │
│   nj-worktrace         │
│   Trazabilidad         │
│   de trabajo           │
│                        │
│  Correo                │
│  [__________________]  │
│                        │
│  Contraseña            │
│  [__________________]  │
│                        │
│  [[    Entrar      ]]  │
│                        │
│ ┌────────────────────┐ │
│ │ ⚠ MODO DEMO        │ │  ← solo si
│ │ [ Propietario ]    │ │    DEMO_MODE
│ │ [ Cliente demo ]   │ │    = true
│ └────────────────────┘ │
│                        │
└────────────────────────┘
```

### Sin recuperación de contraseña en el MVP

El enlace *"¿Olvidaste tu contraseña?"* **se ha retirado** en la iteración 0.1. No existe
autoservicio: ni envío de correo, ni enlaces de un solo uso, ni preguntas de seguridad. El correo no
está en el alcance del MVP (`OD-09`), y una recuperación por correo mal implementada es la vía de
entrada más común a una cuenta ajena. Un enlace que no lleva a ninguna parte es peor que su ausencia.

En su lugar, **restablecimiento administrativo**: el usuario contacta al propietario del producto
por un canal externo, este genera un restablecimiento de un solo uso y lo entrega fuera de banda; al
usarlo caduca y se revocan todas las sesiones de ese usuario. Procedimiento completo en
[`ROLES-AND-PERMISSIONS.md`](ROLES-AND-PERMISSIONS.md) §9.1.

Cuando se cierre `OD-09`, la recuperación automatizada se replanteará con su propio ADR.

### `DEMO_MODE`

El bloque de accesos rápidos se renderiza **solo si la variable de servidor `DEMO_MODE` es `true`**.

- La comprobación es **de servidor**, no de cliente. En producción el marcado no llega al navegador.
- Los endpoints de demo **no existen** cuando `DEMO_MODE` es falso: devuelven 404, no 403.
- Los usuarios de demo llevan `users.is_demo = true` y sus sesiones `auth_sessions.is_demo = true`.
- El aviso *MODO DEMOSTRACIÓN* es persistente y visible en toda la aplicación, no solo en el login.
- Los datos de demo viven en workspaces de demo. Nunca se mezclan con datos reales.

### Estados

| Estado | Presentación |
|---|---|
| **Carga** | El botón *Entrar* pasa a *Entrando…* y se deshabilita. El formulario no se bloquea entero. |
| **Error de credenciales** | Mensaje sobre el formulario: *Correo o contraseña incorrectos.* Nunca se indica cuál de los dos falló. |
| **Cuenta bloqueada / suspendida** | *No es posible iniciar sesión con esta cuenta.* Sin más detalle. |
| **Contraseña olvidada** | Sin flujo en la aplicación. El mensaje de error no sugiere recuperación ni menciona que exista un procedimiento: quien lo necesita lo pide por su canal habitual. |
| **Vacío** | No aplica. |
| **Sesión ya iniciada** | Redirección directa a `/w/:ws` o `/c/:ws` según el rol. |
| **Sesión expirada** | Aviso neutro: *Tu sesión ha caducado. Vuelve a entrar.* |

**OWNER / CLIENT:** la pantalla es idéntica. El destino tras entrar lo decide el servidor según el
rol. **Nunca se pregunta al usuario "¿eres cliente o propietario?".**

---

## 2 · Dashboard del propietario (Inicio)

**Jerarquía:** sesión en curso → qué requiere respuesta → estado de la semana → acceso rápido.
**Acción principal:** *Reanudar / Iniciar trabajo*.

### Laptop 1366 × 768

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Sotravil ▾    ⏱ 01:24:07 · Login SSO   [Pausar] [Finalizar]        NJ ▾ │
├──────────┬───────────────────────────────────────────────────────────────┤
│ Inicio ◀ │  Semana 2026-W31 · 27 jul – 2 ago · ACTIVA                    │
│ Trabajo  │  Objetivo: Cerrar autenticación y publicar entorno de pruebas │
│ Actualiz.│                                                               │
│ Reuniones│  ┌──── Sesión en curso ─────────────────────────────────────┐ │
│          │  │ Login SSO · Desarrollo · 01:24:07                        │ │
│ ──────── │  │ [[ Pausar ]]  [ Finalizar ]  [ Cambiar de tarea ]        │ │
│ Ajustes  │  └──────────────────────────────────────────────────────────┘ │
│          │                                                               │
│          │  ┌──── Requiere tu respuesta (3) ───────────────────────────┐ │
│          │  │ ● Aclaración · "¿Incluye recuperación?"       hace 2 h ▸ │ │
│          │  │ ● Solicitud nueva · "Exportar informe"        ayer     ▸ │ │
│          │  │ ● Revisión W30 · cambios solicitados          25 jul  ▸ │ │
│          │  └──────────────────────────────────────────────────────────┘ │
│          │                                                               │
│          │  ┌──── Esta semana ──────────┐ ┌──── Pendiente hoy ─────────┐ │
│          │  │ Horas        14 h 20 m    │ │ ○ Actualización de hoy     │ │
│          │  │ Sesiones     9            │ │   sin publicar             │ │
│          │  │ En curso     3 · Hechas 5 │ │   [[ Preparar ]]           │ │
│          │  │ Publicado    4 de 5 días  │ │ ○ Cierre semanal: viernes  │ │
│          │  └───────────────────────────┘ └────────────────────────────┘ │
│          │                                                               │
│          │  Actividad reciente                                           │
│          │  · 14:02 Sesión finalizada · Login SSO · 1 h 10 m             │
│          │  · 11:30 Evidencia añadida · commit a3f91c                    │
│          │  · 09:15 Actualización 27 jul publicada                       │
└──────────┴───────────────────────────────────────────────────────────────┘
```

### Móvil 390 × 844

```
┌────────────────────────┐
│ Sotravil ▾         NJ ▾│
├────────────────────────┤
│ W31 · ACTIVA           │
│ Cerrar autenticación   │
│ y publicar pruebas     │
│                        │
│ ┌────────────────────┐ │
│ │ ⏱ 01:24:07         │ │
│ │ Login SSO          │ │
│ │ [[Pausar]] [Fin]   │ │
│ └────────────────────┘ │
│                        │
│ Requiere respuesta (3) │
│ ┌────────────────────┐ │
│ │● Aclaración    2h ▸│ │
│ │● Solicitud   ayer ▸│ │
│ │● Revisión W30     ▸│ │
│ └────────────────────┘ │
│                        │
│ Esta semana            │
│ 14 h 20 m · 9 sesiones │
│ 3 en curso · 5 hechas  │
│                        │
│ ○ Actualización de hoy │
│   [[ Preparar ]]       │
│                        │
│ Reciente               │
│ · 14:02 Sesión fin.    │
│ · 11:30 Evidencia      │
├────────────────────────┤
│ ⏱ 01:24:07 Login SSO   │ ← barra fija
├────────────────────────┤
│ Inicio Trab. Act. Reun.│
└────────────────────────┘
```

### Estados

| Estado | Presentación |
|---|---|
| **Vacío — sin workspace** | Pantalla única: *Crea tu primer workspace.* Un solo botón. |
| **Vacío — sin semana activa** | El bloque de semana se sustituye por *No hay semana activa* + `[[ Abrir semana ]]`. |
| **Vacío — sin sesión en curso** | El bloque de sesión muestra la última tarea y `[[ Reanudar Login SSO ]]` + `[ Elegir otra ]`. |
| **Vacío — nada pendiente** | El bloque *Requiere tu respuesta* se retira por completo. No se muestra una caja vacía. |
| **Carga** | Esqueletos por bloque. La cabecera y el cronómetro se pintan primero: es la información más urgente. |
| **Error parcial** | El bloque afectado muestra *No se pudo cargar · [Reintentar]*. El resto de la pantalla sigue viva. |
| **Error total** | *No se pudo cargar el workspace · [Reintentar] · [Cambiar de workspace]*. |
| **Desconectado** | Aviso persistente: *Sin conexión. El cronómetro sigue corriendo en el servidor.* |

### Workspace `PERSONAL`

Desaparecen: *Requiere tu respuesta*, *Publicado 4 de 5 días* y el aviso de cierre semanal con
revisión. El bloque *Esta semana* conserva horas, sesiones y estados. Ver [F14](USER-FLOWS.md#f14--usar-un-workspace-personal-sin-exponerlo).

---

## 3 · Proyecto y semana activa

**Jerarquía:** objetivo del ciclo → progreso → funcionalidades → cierre.
**Acción principal:** *Preparar cierre* (o *Abrir semana* si no hay ninguna activa).

### Laptop 1366 × 768

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Sotravil ▾    ⏱ 01:24:07 · Login SSO                               NJ ▾ │
├──────────┬───────────────────────────────────────────────────────────────┤
│ Inicio   │ Portal Sotravil ▾   ·   Semana 2026-W31 ▾   ·   ACTIVA        │
│ Trabajo ◀│ 27 jul – 2 ago                          [[ Preparar cierre ]] │
│ Actualiz.│                                                               │
│ Reuniones│ Objetivo                                              [Editar]│
│          │ Cerrar autenticación y publicar el entorno de pruebas.        │
│ ──────── │                                                               │
│ Ajustes  │ Horas 14 h 20 m │ Items 8 │ Hechas 5 │ Publicado 4/5 días     │
│          │                                                               │
│          │ Funcionalidades                    [+ Nuevo item]  Filtro ▾   │
│          │ ┌───────────────────────────────────────────────────────────┐ │
│          │ │ ▾ INITIATIVE · Acceso y seguridad          👁 Cliente     │ │
│          │ │   ▾ FEATURE · Login SSO      EN CURSO  6h 40m  👁 Cliente │ │
│          │ │       TASK · Callback OAuth  HECHA     2h 10m  👁 Cliente │ │
│          │ │       TASK · Manejo errores  EN CURSO  1h 05m  🔒 Interno │ │
│          │ │   ▸ FEATURE · Recuperación   BACKLOG   —       🔒 Interno │ │
│          │ │ ▾ INITIATIVE · Entorno de pruebas          👁 Cliente     │ │
│          │ │   ▾ FEATURE · Despliegue     BLOQUEADA 3h 15m  👁 Cliente │ │
│          │ │       ⚠ Bloqueo: faltan credenciales del proveedor        │ │
│          │ └───────────────────────────────────────────────────────────┘ │
│          │                                                               │
│          │ Actualizaciones  ● 27 ● 28 ● 29 ○ 30 ○ 31   (● publicada)     │
│          │ Reuniones        29 jul · Revisión semanal · celebrada     ▸  │
└──────────┴───────────────────────────────────────────────────────────────┘
```

Los indicadores `👁 Cliente` / `🔒 Interno` son **glifos de visibilidad**, no color. La visibilidad
debe leerse sin depender de percepción cromática.

### Móvil 390 × 844

```
┌────────────────────────┐
│ Sotravil ▾         NJ ▾│
├────────────────────────┤
│ Portal Sotravil ▾      │
│ W31 · ACTIVA           │
│ 27 jul – 2 ago         │
│                        │
│ Objetivo               │
│ Cerrar autenticación   │
│ y publicar pruebas.    │
│                        │
│ 14h20m · 8 items       │
│ 5 hechas · 4/5 publ.   │
│                        │
│ [[ Preparar cierre ]]  │
│                        │
│ Funcionalidades  [+]   │
│ ┌────────────────────┐ │
│ │▾ Acceso y segurid. │ │
│ │  Login SSO      👁 │ │
│ │  EN CURSO  6h40m   │ │
│ │  ▸ 2 subtareas     │ │
│ │                    │ │
│ │  Recuperación   🔒 │ │
│ │  BACKLOG           │ │
│ │▾ Entorno pruebas   │ │
│ │  Despliegue     👁 │ │
│ │  BLOQUEADA 3h15m   │ │
│ │  ⚠ faltan credenc. │ │
│ └────────────────────┘ │
│                        │
│ Actualiz. ●●●○○        │
│ Reuniones   1        ▸ │
├────────────────────────┤
│ ⏱ 01:24:07 Login SSO   │
├────────────────────────┤
│ Inicio Trab. Act. Reun.│
└────────────────────────┘
```

### Estados

| Estado | Presentación |
|---|---|
| **Vacío — sin proyecto** | *Crea tu primer proyecto* + `[[ Nuevo proyecto ]]`. |
| **Vacío — sin ciclo activo** | Objetivo y métricas se sustituyen por `[[ Abrir semana ]]` con las fechas propuestas. |
| **Vacío — sin work items** | *Aún no hay funcionalidades* + `[[ Añadir la primera ]]`. |
| **Vacío — sin objetivo** | *Sin objetivo declarado* + `[Definir objetivo]`. Se destaca: un ciclo sin objetivo no se puede cerrar bien. |
| **Carga** | Cabecera y métricas primero; el árbol de items con esqueletos. |
| **Error** | Por bloque, con `[Reintentar]`. El objetivo se cachea y se muestra aunque falle el árbol. |
| **Ciclo `IN_REVIEW`** | Banner: *Cierre publicado el 2 ago · Pendiente de revisión del cliente.* `[[ Ver cierre ]]`. |
| **Ciclo `CLOSED`** | Todo en solo lectura, con marca *Semana cerrada*. `[Abrir semana siguiente]`. |
| **Bloqueo al cerrar** | Diálogo: *2 sesiones siguen abiertas* con la lista y `[Cerrarlas]`. Regla R9. |

---

## 4 · Temporizador y registro de trabajo

Pantalla más usada del producto. **Iniciar trabajo debe costar dos interacciones** (criterio E4).

**Jerarquía:** cronómetro → contexto → controles → sesiones del día.
**Acción principal:** *Iniciar* / *Pausar* / *Finalizar*, según el estado.

### Laptop 1366 × 768 — sesión en curso

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Sotravil ▾                                                         NJ ▾ │
├──────────┬───────────────────────────────────────────────────────────────┤
│ Inicio   │ Trabajo                                                       │
│ Trabajo ◀│                                                               │
│ Actualiz.│  ┌─────────────────────────────────────────────────────────┐  │
│ Reuniones│  │                                                         │  │
│          │  │                    01:24:07                             │  │
│ ──────── │  │                                                         │  │
│ Ajustes  │  │   Login SSO · Portal Sotravil · W31                     │  │
│          │  │   Actividad: Desarrollo ▾                               │  │
│          │  │                                                         │  │
│          │  │   [[  Pausar  ]]   [ Finalizar ]   [ Cambiar de tarea ] │  │
│          │  │                                                         │  │
│          │  │   Segmentos de esta sesión                              │  │
│          │  │   09:15 – 10:40  1 h 25 m                               │  │
│          │  │   11:05 – ahora  0 h 59 m  ← en curso                   │  │
│          │  │   Total efectivo: 2 h 24 m  ·  Pausa: 25 m              │  │
│          │  └─────────────────────────────────────────────────────────┘  │
│          │                                                               │
│          │  Hoy · 28 jul                        3 sesiones · 4 h 10 m    │
│          │  ┌─────────────────────────────────────────────────────────┐  │
│          │  │ Login SSO       Desarrollo  2h24m  en curso           ▸ │  │
│          │  │ Callback OAuth  Desarrollo  1h10m  "Flujo completo"   ▸ │  │
│          │  │ Revisión PR     Revisión    0h36m  "Aprobado con..."  ▸ │  │
│          │  └─────────────────────────────────────────────────────────┘  │
│          │  [ + Registrar tiempo manualmente ]                           │
└──────────┴───────────────────────────────────────────────────────────────┘
```

### Laptop — sin sesión en curso

```
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                      00:00:00                           │  │
│  │                                                         │  │
│  │   Tarea:      Login SSO ▾            [ Buscar item ]    │  │
│  │   Actividad:  Desarrollo ▾                              │  │
│  │                                                         │  │
│  │   [[                Iniciar                          ]] │  │
│  │                                                         │  │
│  │   Recientes: Login SSO · Callback OAuth · Despliegue    │  │
│  └─────────────────────────────────────────────────────────┘  │
```

Dos interacciones desde Inicio: *Trabajo* → *Iniciar*. La tarea y la actividad vienen preseleccionadas
de la última sesión ([F2](USER-FLOWS.md#f2--seleccionar-proyecto-ciclo-y-funcionalidad)).

### Diálogo al finalizar (F4)

```
┌──── Finalizar sesión · Login SSO · 2 h 24 m ────────────────┐
│                                                             │
│ ¿Qué conseguiste?  (obligatorio)                            │
│ [_________________________________________________________] │
│                                                             │
│ Estado de la funcionalidad:  ( ) En curso  (•) En revisión  │
│                              ( ) Hecha     ( ) Bloqueada    │
│                                                             │
│ Evidencias                                     [+ Añadir]   │
│  COMMIT ▾  a3f91c  "Implementa callback"                [×] │
│  [ Pegar varias URLs ]                                      │
│                                                             │
│ Visibilidad de esta sesión:  🔒 Interno  (no cambia)        │
│                                                             │
│              [ Guardar sin resultado ]   [[  Finalizar  ]]  │
└─────────────────────────────────────────────────────────────┘
```

*Guardar sin resultado* existe pero es secundario: la fricción debe estar del lado de no documentar.

### Móvil 390 × 844

```
┌────────────────────────┐
│ Sotravil ▾         NJ ▾│
├────────────────────────┤
│                        │
│      01:24:07          │
│                        │
│   Login SSO            │
│   Desarrollo ▾         │
│                        │
│  [[    Pausar      ]]  │
│  [ Finalizar ]         │
│  [ Cambiar de tarea ]  │
│                        │
│  Segmentos             │
│  09:15–10:40   1h25m   │
│  11:05–ahora   0h59m   │
│  Efectivo      2h24m   │
│                        │
│  Hoy · 3 · 4h10m       │
│ ┌────────────────────┐ │
│ │Login SSO   2h24m  ▸│ │
│ │Callback    1h10m  ▸│ │
│ │Revisión PR 0h36m  ▸│ │
│ └────────────────────┘ │
│ [+ Tiempo manual]      │
│                        │
├────────────────────────┤
│ Inicio Trab. Act. Reun.│
└────────────────────────┘
```

En móvil el cronómetro ocupa el primer pliegue completo. Los controles quedan bajo el pulgar.

### Estados

| Estado | Presentación |
|---|---|
| **Vacío — sin work items** | *Elige o crea una tarea para empezar* + campo de creación en línea. |
| **Vacío — sin sesiones hoy** | *Aún no has registrado tiempo hoy.* Sin culpabilizar. |
| **Carga** | El cronómetro se pinta con el valor del servidor antes que el resto. Nunca arranca desde 00:00 mientras carga. |
| **Error al iniciar** | *No se pudo iniciar la sesión* + `[Reintentar]`. El cronómetro **no** arranca en local: sin confirmación del servidor, no hay sesión. |
| **Error al pausar** | Se reintenta en segundo plano; aviso *Sincronizando…*. La marca de tiempo es la del intento, no la del éxito. |
| **Conflicto: otra sesión activa** | Diálogo **de confirmación obligatoria**: *Tienes "Callback OAuth" en curso desde las 11:05. Se pausará para iniciar "Login SSO".* `[Pausar y continuar]` / `[Cancelar]`. **Nunca se pausa sin confirmar.** Al aceptar, pausa y arranque son **una operación atómica**: si falla, la sesión original sigue corriendo y se informa. Caso alternativo A2 de [F3](USER-FLOWS.md#f3--iniciar-pausar-y-finalizar-una-sesión-de-trabajo). |
| **Sesión abandonada (> 8 h)** | Diálogo con tres opciones explícitas: *Recortar a la última actividad* / *Introducir hora de fin* / *Descartar*. Nunca decide sola. |
| **Desconectado** | *Sin conexión — el tiempo se sigue contando en el servidor.* Los controles se deshabilitan con motivo visible. |

**CLIENT:** esta pantalla **no existe** para el cliente. No hay versión reducida, ni ruta, ni entrada
de navegación. `/w/:ws/work` con rol `CLIENT` devuelve **404**.

---

## 5 · Preparación de actualización diaria

**Jerarquía:** fecha y contexto → borrador presembrado → qué se comparte → vista previa → publicar.
**Acción principal:** *Publicar*.

### Laptop 1366 × 768

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Sotravil ▾                                                         NJ ▾ │
├──────────┬───────────────────────────────────────────────────────────────┤
│ Inicio   │ Actualización · martes 28 jul 2026        BORRADOR            │
│ Trabajo  │ ◀ 27 jul   28 jul ▾   29 jul ▶       [Vista previa] [[Publicar]]│
│ Actualiz◀│                                                               │
│ Reuniones│ ┌── Resumen (obligatorio) ─────────────────────────────────┐  │
│          │ │ Terminado el callback OAuth y el manejo de errores del   │  │
│ ──────── │ │ login. Queda pendiente la recuperación de contraseña.    │  │
│ Ajustes  │ └──────────────────────────────────────────────────────────┘  │
│          │ ┌── Bloqueos ──────────────┐ ┌── Siguientes pasos ─────────┐  │
│          │ │ Faltan credenciales del  │ │ Cerrar recuperación y       │  │
│          │ │ proveedor de despliegue. │ │ empezar entorno de pruebas. │  │
│          │ └──────────────────────────┘ └─────────────────────────────┘  │
│          │                                                               │
│          │ Trabajo de hoy — presembrado desde tus sesiones               │
│          │ ┌───────────────────────────────────────────────────────────┐ │
│          │ │ [x] Login SSO         2h24m  "Callback completo"  👁 Cli. │ │
│          │ │ [x] Callback OAuth    1h10m  "Flujo completo"     👁 Cli. │ │
│          │ │ [ ] Revisión PR       0h36m  "Aprobado con notas" 🔒 Int. │ │
│          │ │     ⚠ Interno: no aparecerá para el cliente               │ │
│          │ └───────────────────────────────────────────────────────────┘ │
│          │                                                               │
│          │ Evidencias                                     [+ Añadir]     │
│          │  [x] COMMIT a3f91c "Implementa callback"           👁 Cli.    │
│          │  [x] TEST_RUN #2841 "Suite de auth verde"          👁 Cli.    │
│          │                                                               │
│          │ Horas a publicar:  (•) Total del día  ( ) Por funcionalidad   │
│          │                    ( ) No publicar horas                      │
│          │                                                               │
│          │ Se compartirá con: Sotravil (CLIENTE)                         │
│          │ Guardado automático · 14:32                                   │
└──────────┴───────────────────────────────────────────────────────────────┘
```

### Vista previa como cliente (obligatoria antes de publicar)

```
┌──── Vista previa · así lo verá Sotravil ────────────────────────────────┐
│                                                                          │
│  Martes 28 de julio                                       3 h 34 m       │
│                                                                          │
│  Terminado el callback OAuth y el manejo de errores del login.           │
│  Queda pendiente la recuperación de contraseña.                          │
│                                                                          │
│  Bloqueos                                                                │
│  Faltan credenciales del proveedor de despliegue.                        │
│                                                                          │
│  Funcionalidades          Login SSO · En revisión                        │
│                           Callback OAuth · Hecha                         │
│                                                                          │
│  Evidencias               commit a3f91c · Implementa callback         ↗  │
│                           Suite de auth verde                         ↗  │
│                                                                          │
│  Oculto para el cliente: 1 sesión interna (Revisión PR)                  │
│  ⓘ El proyecto "Portal Sotravil" es interno: no se mostrará su nombre.   │
│    [ Hacer visible el proyecto ]                                         │
│                                                                          │
│                                  [ Volver a editar ]   [[ Publicar ]]    │
└──────────────────────────────────────────────────────────────────────────┘
```

La línea *Oculto para el cliente* aparece **solo en la vista previa**, nunca en la vista real del
cliente. Sirve para confirmar que lo interno se queda dentro.

El aviso sobre el proyecto es **informativo, no bloqueante**: la actualización se publica igual y el
cliente la ve **sin etiqueta de proyecto** — el campo se omite, no se sustituye por *"(privado)"*.
Un contenedor no se vuelve visible por contener algo visible
([`DATA-MODEL.md`](DATA-MODEL.md) §5.3, regla R13).

### Móvil 390 × 844

```
┌────────────────────────┐
│ Sotravil ▾         NJ ▾│
├────────────────────────┤
│ 28 jul · BORRADOR      │
│ ◀ 27  [28 ▾]  29 ▶     │
│                        │
│ Resumen *              │
│ ┌────────────────────┐ │
│ │ Terminado callback │ │
│ │ OAuth y errores... │ │
│ └────────────────────┘ │
│                        │
│ Bloqueos               │
│ [__________________]   │
│ Siguientes pasos       │
│ [__________________]   │
│                        │
│ Trabajo de hoy         │
│ [x] Login SSO   👁     │
│     2h24m              │
│ [x] Callback    👁     │
│     1h10m              │
│ [ ] Revisión PR 🔒     │
│                        │
│ Evidencias      [+]    │
│ [x] commit a3f91c      │
│ [x] tests #2841        │
│                        │
│ Horas: Total día ▾     │
│                        │
│ [ Vista previa ]       │
│ [[   Publicar    ]]    │
│ Guardado 14:32         │
├────────────────────────┤
│ Inicio Trab. Act. Reun.│
└────────────────────────┘
```

### Estados

| Estado | Presentación |
|---|---|
| **Vacío — sin trabajo hoy** | *No hay sesiones registradas hoy.* Se permite publicar igualmente con resumen escrito a mano (F5 A1). |
| **Vacío — resumen sin escribir** | *Publicar* deshabilitado con motivo visible: *Escribe un resumen para publicar.* |
| **Carga** | El presembrado tarda: esqueleto en *Trabajo de hoy*. El área de texto se activa de inmediato — escribir nunca espera. |
| **Guardando** | *Guardando…* → *Guardado 14:32*. Autoguardado; nunca un botón *Guardar borrador*. |
| **Error de guardado** | Aviso persistente: *No se pudo guardar. Tu texto está a salvo en este dispositivo.* + `[Reintentar]`. |
| **Bloqueo al publicar** | Diálogo (regla R10): *2 funcionalidades y 1 evidencia enlazadas son internas.* Lista + `[Hacerlas visibles]` / `[Quitarlas de la actualización]` / `[Cancelar]`. Nunca se eleva la visibilidad en silencio. El nombre del proyecto **no** bloquea: solo avisa. |
| **Ya publicada** | La cabecera pasa a `PUBLICADA · 28 jul 15:02`. Botón `[Editar]`; editar tras publicar marca *Editado* visible para el cliente. `[Despublicar]` en `···`, con confirmación (sujeto a `OD-04`). |
| **Conflicto de edición** | Si hay otra pestaña editando: *Esta actualización se editó en otro sitio* + `[Ver diferencias]`. |

**Workspace `PERSONAL`:** desaparecen las columnas de visibilidad, la vista previa, el selector de
horas a publicar y el botón *Publicar*. Queda `[Guardar nota del día]`.

**CLIENT:** sin acceso. `/w/:ws/updates` con rol `CLIENT` → **404**.

---

## 6 · Dashboard del cliente

**Jerarquía:** qué persigue esta semana → qué me toca a mí → qué ha pasado → dónde profundizar.
**Acción principal:** responder lo pendiente (revisión o aclaración). Si no hay nada pendiente,
*Ver actividad*.

### Laptop 1366 × 768

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Portal Sotravil                                              Sotravil ▾ │
├──────────┬───────────────────────────────────────────────────────────────┤
│ Resumen ◀│ Semana del 27 de julio al 2 de agosto            EN CURSO     │
│ Actividad│                                                               │
│ Funcional│ ┌─────────────────────────────────────────────────────────┐   │
│ Reuniones│ │ Objetivo de la semana                                   │   │
│ Solicitud│ │ Cerrar autenticación y publicar el entorno de pruebas.  │   │
│          │ └─────────────────────────────────────────────────────────┘   │
│          │                                                               │
│          │ ┌──── Pendiente de ti (2) ────────────────────────────────┐   │
│          │ │ ● Revisión de la semana del 20–26 jul                   │   │
│          │ │   Cierre publicado el 26 jul       [[ Revisar ahora ]]  │   │
│          │ │ ● Nelson respondió tu aclaración sobre Login SSO     ▸  │   │
│          │ └─────────────────────────────────────────────────────────┘   │
│          │                                                               │
│          │ ┌── Horas ────┐ ┌── Funcionalidades ──────────────────────┐   │
│          │ │ 14 h 20 m   │ │ Hechas 5 · En curso 3 · Bloqueadas 1    │   │
│          │ │ esta semana │ │ ⚠ Despliegue bloqueado: faltan          │   │
│          │ │             │ │   credenciales del proveedor            │   │
│          │ └─────────────┘ └─────────────────────────────────────────┘   │
│          │                                                               │
│          │ Últimas actualizaciones                          Ver todas ▸  │
│          │ ┌─────────────────────────────────────────────────────────┐   │
│          │ │ mar 28 jul · 3 h 34 m                                   │   │
│          │ │ Terminado el callback OAuth y el manejo de errores…  ▸  │   │
│          │ │ 2 evidencias · 1 comentario                             │   │
│          │ ├─────────────────────────────────────────────────────────┤   │
│          │ │ lun 27 jul · 5 h 02 m                                   │   │
│          │ │ Arranque del flujo de autenticación…                 ▸  │   │
│          │ └─────────────────────────────────────────────────────────┘   │
│          │                                                               │
│          │ Próxima reunión  jue 30 jul 10:00 · Revisión semanal       ▸  │
│          │ Tus solicitudes  1 aceptada · 1 en revisión                ▸  │
└──────────┴───────────────────────────────────────────────────────────────┘
```

### Móvil 390 × 844

```
┌────────────────────────┐
│ Portal Sotravil    S ▾ │
├────────────────────────┤
│ 27 jul – 2 ago         │
│ EN CURSO               │
│                        │
│ Objetivo               │
│ Cerrar autenticación   │
│ y publicar pruebas.    │
│                        │
│ ┌ Pendiente de ti (2)┐ │
│ │● Revisión 20–26 jul│ │
│ │ [[Revisar ahora]]  │ │
│ │● Respuesta a tu    │ │
│ │  aclaración      ▸ │ │
│ └────────────────────┘ │
│                        │
│ 14 h 20 m esta semana  │
│ 5 hechas · 3 en curso  │
│ ⚠ 1 bloqueada          │
│                        │
│ Últimas actualizaciones│
│ ┌────────────────────┐ │
│ │mar 28 jul · 3h34m  │ │
│ │Terminado callback  │ │
│ │OAuth…            ▸ │ │
│ ├────────────────────┤ │
│ │lun 27 jul · 5h02m  │ │
│ │Arranque del flujo▸ │ │
│ └────────────────────┘ │
│                        │
│ Reunión jue 30, 10:00▸ │
├────────────────────────┤
│Res. Act. Func. Reun. So│
└────────────────────────┘
```

### Estados

| Estado | Presentación |
|---|---|
| **Vacío — sin semana publicada** | *Aún no hay una semana publicada.* No se muestra la última cerrada como si fuera la actual (F7 A1). |
| **Vacío — semana sin actualizaciones** | Objetivo y estructura visibles; el bloque de actualizaciones dice *Todavía no hay actualizaciones publicadas esta semana.* |
| **Vacío — nada pendiente** | El bloque *Pendiente de ti* se retira. No se muestra *0 pendientes*. |
| **Vacío — horas no publicadas** | La tarjeta de horas se retira por completo. No se deja un hueco ni un *—*, que sugeriría ocultación (F8 A4). |
| **Carga** | Objetivo y pendientes primero: es lo accionable. |
| **Error** | Por bloque, con `[Reintentar]`. Un fallo en actualizaciones no oculta el objetivo. |
| **Ciclo `IN_REVIEW`** | El bloque *Pendiente de ti* pasa a lo alto con el banner de revisión destacado. |
| **Acceso revocado** | Cierre de sesión con mensaje neutro. Sin detalles del workspace. |

### Lo que esta pantalla nunca muestra

Borradores · sesiones individuales · segmentos de tiempo · work items internos · otros workspaces ·
lista de miembros · controles de visibilidad · las palabras *borrador*, *interno* o *visibilidad*.

---

## 7 · Detalle de semana / actualización con conversación

Misma plantilla para el ciclo y para una actualización: contenido a la izquierda, conversación a la
derecha. Cambia el contenido, no la estructura.

**Jerarquía:** contenido publicado → evidencias → conversación → acción de revisión.
**Acción principal:** para el cliente, responder (revisar o comentar). Para el propietario, responder
aclaraciones.

### Laptop 1366 × 768 — vista CLIENTE, cierre semanal pendiente de revisión

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Portal Sotravil                                              Sotravil ▾ │
├──────────┬────────────────────────────────────┬──────────────────────────┤
│ Resumen  │ ◀ Semana 20–26 jul · CERRADA       │ Conversación         (4) │
│ Actividad│   Cierre publicado el 26 jul       │                          │
│ Funcional│                                    │ Sotravil · 26 jul 09:12  │
│ Reuniones│ Objetivo                           │ ¿La recuperación de      │
│ Solicitud│ Completar el flujo de acceso.      │ contraseña entra esta    │
│          │                                    │ semana?                  │
│          │ Resumen de cierre                  │ ⓘ Aclaración solicitada  │
│          │ Se completó el flujo de acceso     │                          │
│          │ salvo la recuperación, que pasa a  │ Nelson · 26 jul 11:40    │
│          │ la semana siguiente por el bloqueo │ No: el bloqueo de        │
│          │ de credenciales.                   │ credenciales la desplazó │
│          │                                    │ a la W31. Está planifi-  │
│          │ Horas             22 h 10 m        │ cada.                    │
│          │  Desarrollo       16 h 05 m        │ ✓ Aclaración respondida  │
│          │  Revisión          3 h 20 m        │                          │
│          │  Reuniones         2 h 45 m        │ Sotravil · 26 jul 12:02  │
│          │                                    │ Entendido, gracias.      │
│          │ Entregado                          │                          │
│          │  ✓ Login con usuario y contraseña  │ ───────────────────────  │
│          │  ✓ Callback OAuth                  │ [___________________]    │
│          │  ✓ Sesiones persistentes           │ [ ] Es una solicitud     │
│          │  → Recuperación → pasa a W31       │     de aclaración        │
│          │                                    │            [[ Enviar ]]  │
│          │ Evidencias (6)          Ver todas ▸│                          │
│          │  commit 4b2e1a · Login base     ↗  │                          │
│          │  PR #142 · Callback OAuth       ↗  │                          │
│          │  Suite de auth · 128 pasando    ↗  │                          │
│          │                                    │                          │
│          │ ┌── Tu revisión ─────────────────┐ │                          │
│          │ │ ( ) Confirmo lectura           │ │                          │
│          │ │ (•) Apruebo el cierre          │ │                          │
│          │ │ ( ) Solicito cambios           │ │                          │
│          │ │ Comentario (opcional)          │ │                          │
│          │ │ [____________________________] │ │                          │
│          │ │           [[ Enviar revisión ]]│ │                          │
│          │ └────────────────────────────────┘ │                          │
└──────────┴────────────────────────────────────┴──────────────────────────┘
```

Al elegir *Solicito cambios*, el comentario pasa a ser **obligatorio** y la etiqueta cambia a
*Comentario (obligatorio)*. El botón se deshabilita con el motivo visible hasta que se escriba
([F13](USER-FLOWS.md#f13--revisión-del-cierre-semanal)).

### Laptop — misma pantalla, vista PROPIETARIO

```
├──────────┬────────────────────────────────────┬──────────────────────────┤
│ Inicio   │ ◀ Semana 20–26 jul · CERRADA       │ Conversación         (4) │
│ Trabajo  │   Publicado 26 jul  [···]          │                          │
│ Actualiz.│                                    │ Sotravil · 26 jul 09:12  │
│ Reuniones│ Objetivo                  [Editar] │ ¿La recuperación de…     │
│          │ Completar el flujo de acceso.      │ ⓘ Aclaración pendiente   │
│ ──────── │                                    │                          │
│ Ajustes  │ Resumen de cierre         [Editar] │ [Responder]              │
│          │ …                                  │                          │
│          │                                    │ ─────────────────────    │
│          │ Horas       22 h 10 m  👁 Publicado │ [___________________]    │
│          │  · 3 h 15 m internas no publicadas │            [[ Enviar ]]  │
│          │                                    │                          │
│          │ Entregado                          │                          │
│          │  ✓ Login usuario/contraseña  👁    │                          │
│          │  ✓ Callback OAuth            👁    │                          │
│          │  ✓ Refactor de sesión        🔒    │  ← invisible al cliente  │
│          │                                    │                          │
│          │ ┌── Revisiones (2 clientes) ─────┐ │                          │
│          │ │ Sotravil   APROBADO   26 jul   │ │                          │
│          │ │  historial: cambios → aprobado │ │                          │
│          │ │ M. Ríos    sin respuesta       │ │                          │
│          │ │                                │ │                          │
│          │ │ [ Cerrar semana ]              │ │                          │
│          │ │ [ Reabrir semana ]             │ │                          │
│          │ └────────────────────────────────┘ │                          │
└──────────┴────────────────────────────────────┴──────────────────────────┘
```

El bloque lista **una cadena de revisiones por cliente**. *Sin respuesta* es una condición
**derivada** — no hay ninguna fila pendiente esperando — y no impide cerrar: si el propietario cierra
igualmente, la semana queda marcada como *cerrada sin revisión de M. Ríos*
(`work_cycles.closed_without_review`). **No existe un estado agregado**: mostrar "aprobada" porque
uno de dos aprobó sería falso.

Diferencias visibles: glifos de visibilidad, horas internas no publicadas, work items internos,
acciones de edición, historial completo de revisiones y la acción de cerrar la semana. El cliente no
ve ninguna de ellas.

### Móvil 390 × 844 — conversación como pestaña

```
┌────────────────────────┐
│ ◀ Semana 20–26 jul   ▾ │
├────────────────────────┤
│ [Contenido] [Conver.(4)]│  ← pestañas
├────────────────────────┤
│ CERRADA · publ. 26 jul │
│                        │
│ Objetivo               │
│ Completar el flujo     │
│ de acceso.             │
│                        │
│ Resumen de cierre      │
│ Se completó el flujo   │
│ salvo la recuperación… │
│                        │
│ Horas        22h10m    │
│  Desarrollo  16h05m    │
│  Revisión     3h20m    │
│  Reuniones    2h45m    │
│                        │
│ Entregado              │
│ ✓ Login usuario/contr. │
│ ✓ Callback OAuth       │
│ ✓ Sesiones persist.    │
│ → Recuperación → W31   │
│                        │
│ Evidencias (6)       ▸ │
│                        │
│ ┌ Tu revisión ───────┐ │
│ │( ) Confirmo lectura│ │
│ │(•) Apruebo         │ │
│ │( ) Solicito cambios│ │
│ │[________________]  │ │
│ │[[Enviar revisión]] │ │
│ └────────────────────┘ │
├────────────────────────┤
│Res. Act. Func. Reun. So│
└────────────────────────┘
```

En móvil la conversación es una **pestaña**, no una columna. El contador `(4)` se ve sin abrirla.
Con mensajes sin leer, la pestaña se marca con `●`.

### Estados

| Estado | Presentación |
|---|---|
| **Vacío — sin conversación** | *Sin comentarios todavía* + el campo de escritura. El campo siempre está presente: empezar no debe costar un clic extra. |
| **Vacío — sin evidencias** | La sección se retira. No se muestra *0 evidencias*. |
| **Vacío — sin resumen de cierre** | Solo posible en propietario, ciclo abierto: `[Preparar cierre]`. |
| **Carga** | Contenido primero, conversación después. La conversación puede llegar con esqueleto sin bloquear la lectura. |
| **Error al cargar conversación** | El contenido se lee igual; la columna muestra *No se pudo cargar la conversación · [Reintentar]*. |
| **Error al enviar mensaje** | El mensaje se conserva en el campo, marcado *No enviado · [Reintentar]*. Nunca se pierde texto escrito. |
| **Revisión ya enviada** | El bloque pasa a *Tu revisión: Aprobado · 26 jul* + `[Cambiar mi respuesta]`, que **crea una revisión nueva** encadenada, no edita la anterior (F13 A3, regla R14). |
| **Cambios solicitados** | Banner en propietario: *Cambios solicitados el 26 jul por Sotravil* + `[Reabrir semana]` / `[Cerrar igualmente]`. **Nada se reabre solo.** |
| **Cerrado sin revisión** | Para ambos: *Semana cerrada sin revisión del cliente.* Es un hecho registrado, no un reproche. |
| **Contenido despublicado** | Para el cliente: **404** limpio, sin explicación de qué existió (F8 error). |
| **Mensajes largos** | Paginación por bloques, más recientes abajo. Sin tiempo real: `[Ver mensajes nuevos (2)]` al llegar. |

---

## Estados transversales

Aplican a todas las pantallas.

| Situación | Regla |
|---|---|
| **Carga** | Esqueletos por bloque, nunca una pantalla de carga completa. Lo accionable se pinta primero. |
| **Vacío** | Explicar por qué está vacío y ofrecer una única acción. Nunca *0 elementos* ni un hueco sin más. |
| **Error** | Aislado al bloque afectado, con `[Reintentar]`. Un error nunca deja la pantalla en blanco. |
| **Sin permiso** | **404**, nunca 403. No se revela la existencia de lo inaccesible. |
| **Sin conexión** | Aviso persistente. Las acciones de escritura se deshabilitan con motivo visible. El cronómetro sigue en el servidor. |
| **Texto sin guardar** | Nunca se pierde. Se conserva localmente y se reintenta. |
| **Acción destructiva** | Confirmación con la consecuencia dicha en palabras, no *¿Estás seguro?*. |
| **Publicar** | Siempre precedido de vista previa como cliente. Nunca en un solo clic. |
| **Modo demo** | Aviso persistente en toda la aplicación mientras `DEMO_MODE` esté activo. |

## Adaptación 1366 × 768 → 390 × 844

| Laptop | Móvil |
|---|---|
| Barra lateral 200 px | Barra inferior de 4 (propietario) o 5 (cliente) elementos |
| Dos o tres columnas | Una columna; columnas secundarias → pestañas u hojas |
| Cronómetro en cabecera | Barra fija sobre la barra inferior |
| Conversación en columna lateral | Pestaña con contador |
| Tabla de sesiones | Tarjetas apiladas |
| Diálogos centrados | Hojas a pantalla completa desde abajo |
| Árbol de items expandido | Colapsado a un nivel, con `▸ n subtareas` |
| Vista previa en diálogo | Vista previa a pantalla completa |

**Alto útil en 1366 × 768:** ~640 px tras cabecera del sistema y del navegador. Ningún diseño puede
asumir que la acción principal queda por debajo del pliegue: en Trabajo, Actualizaciones y el bloque
de revisión, la acción primaria va **siempre** en los primeros 640 px.

## Diferencias OWNER / CLIENT

| Aspecto | OWNER | CLIENT |
|---|---|---|
| Rutas | `/w/:ws/*` | `/c/:ws/*` — `:ws` es un `public_id` opaco en ambos casos |
| Secciones | Inicio · Trabajo · Actualizaciones · Reuniones | Resumen · Actividad · Funcionalidades · Reuniones · Solicitudes |
| Workspace | Conmutador en cabecera; administración en Ajustes (`K-01`) | Conmutador solo si pertenece a varios; sin Ajustes |
| Evidencias | Enlazables a varios contextos desde cualquier pantalla | Índice contextual en *Actividad → Evidencias* (`K-02`), además de en su contexto |
| Proyectos | Nivel navegable dentro de *Trabajo* | Sin listado; solo etiqueta, y únicamente si el proyecto es `CLIENT_VISIBLE` |
| Cronómetro | Persistente en toda la interfaz | No existe |
| Sesiones de trabajo | Crea, edita, ajusta tiempo | Sin acceso; solo agregados |
| Borradores | Ve y edita | Nunca los ve ni sabe que existen |
| Glifos de visibilidad | Visibles en todo el contenido | Ausentes |
| Publicar | Acción principal recurrente | No existe |
| Work items internos | Visibles, marcados `🔒` | Ausentes de las listas; enlace directo → 404 |
| Horas | Totales reales, con detalle de lo no publicado | Solo agregados publicados |
| Conversación | Lee y responde; puede resolver hilos; **no edita mensajes ajenos** | Lee y escribe; no resuelve |
| Solicitudes | Bandeja de triaje de todas | Crea y consulta las suyas *(`OD-17`)*; cada una con su hilo propio |
| Revisiones | Lee todas las cadenas, una por cliente; no puede enviar | Envía y relee las suyas; **sin editar** — cambiar de respuesta encadena una nueva |
| Reuniones | Crea, publica notas y decisiones | Lee las visibles; propone puntos de agenda |
| Conmutador de workspace | Sí, si tiene varios | Solo si pertenece a varios (`OD-02`, cerrada) |
| Miembros del workspace | Gestiona | No los ve |
| Auditoría | Consulta | Sin acceso |

**La interfaz del cliente no es la del propietario con elementos ocultos.** Es una aplicación
distinta sobre los mismos datos, con su propio vocabulario ([`INFORMATION-ARCHITECTURE.md`](INFORMATION-ARCHITECTURE.md) §8).

## Pendiente de diseño

Sin branding, paleta, tipografía, iconografía ni ilustración — deliberadamente fuera de esta fase.
Los glifos `👁 🔒 ⚠ ●` son marcadores estructurales, no iconografía definitiva.

Decisiones abiertas que afectan a estas pantallas: `OD-01` (qué horas se muestran) ·
`OD-04` (despublicar) · `OD-05` (adjuntos) · `OD-06` (edición de mensajes) ·
`OD-09` (avisos de contenido nuevo) · `OD-14` (idioma) ·
`OD-17` (si un cliente ve las solicitudes y revisiones de otros clientes).

Cerradas en la iteración 0.1 e incorporadas: `K-01`, `K-02`, `OD-02` (varios clientes: el bloque de
revisiones los lista uno a uno), `OD-03` (revisión informativa: el cierre no se bloquea) y
`OD-07` (fechas y horas en la zona del workspace).
