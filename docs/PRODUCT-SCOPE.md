# PRODUCT SCOPE

Define los límites de `nj-worktrace`. **Si algo no está aquí, no forma parte del producto.**

---

## 1. Propósito

Dar a una persona que trabaja en varios contextos simultáneos (proyectos propios, encargos de
clientes, negocio propio) un único lugar donde:

- registrar **en qué** trabaja, **cuánto tiempo** y **con qué resultado**;
- adjuntar **evidencia** verificable;
- **publicar selectivamente** una parte de ese registro a un cliente;
- **conversar** con ese cliente dentro del contexto exacto de lo publicado.

## 2. Usuarios

| Perfil | Descripción | Rol típico |
|---|---|---|
| **Propietario** | La persona que registra el trabajo. Nelson en el primer caso. | `OWNER` |
| **Colaborador** | Persona que trabaja con el propietario en un workspace. Fuera del MVP. | `MEMBER` |
| **Cliente** | Persona externa que consulta el trabajo publicado en su workspace. | `CLIENT` |
| **Observador** | Acceso de solo lectura interno, sin capacidad de comentar. Fuera del MVP. | `VIEWER` |

Un mismo usuario puede tener roles distintos en workspaces distintos.

## 3. Modelo organizativo

Tres tipos de workspace, con **la misma mecánica** y distinta intención:

| Tipo | Intención | ¿Admite miembros `CLIENT`? |
|---|---|---|
| `PERSONAL` | Trabajo propio, no destinado a nadie más | **No.** El tipo es precisamente la declaración de que ahí no entra nadie |
| `CLIENT` | Trabajo para un cliente, con vista publicada | Sí, **uno o varios** |
| `BUSINESS` | Trabajo de negocio propio, potencialmente con colaboradores | Sí, opcional |

Todo workspace tiene una **zona horaria IANA obligatoria**, que define los límites de día y de ciclo.

`OD-02` y `OD-11`, cerradas: un workspace admite **varios miembros `CLIENT`**, un usuario pertenece a
**varios workspaces** y su **rol es por workspace, nunca global** — puede ser `OWNER` en uno y
`CLIENT` en otro. `(workspace_id, user_id)` es único: una membresía, un rol.

El tipo de workspace **no** codifica permisos. Los permisos vienen del rol del miembro. El tipo es
intención, ayuda de la interfaz y valor por defecto de la visibilidad de lo que se crea dentro.

> Configuración inicial de ejemplo: Workspace Personal (Nelson `OWNER`), Workspace Sotravil
> (Nelson `OWNER`, Sotravil `CLIENT`), Workspace RIPNEL (Nelson `OWNER`).
> **Estos nombres son datos, no reglas del producto.**

## 4. Dentro del alcance

### 4.1 Registro de trabajo

- Jerarquía de trabajo: iniciativa → funcionalidad → tarea / bug / investigación.
- Ciclos de trabajo (semanas) con objetivo declarado y cierre.
- Temporizador con **inicio, pausa, reanudación y fin**; y **entrada manual** de tiempo.
- Tipo de actividad por sesión (desarrollo, diseño, reunión, investigación, revisión, soporte…).
- Resultado escrito al cerrar cada sesión.
- Evidencias asociadas a sesión, work item o actualización.

### 4.2 Comunicación con el cliente

- Actualizaciones diarias en borrador → publicadas.
- Cierre semanal con resumen, horas agregadas y funcionalidades entregadas.
- Hilos de discusión anclados a una actualización, un ciclo o un work item.
- Solicitudes del cliente en cola propia, con triaje del propietario.
- Reuniones con agenda, decisiones y siguientes pasos.
- Confirmación de lectura, aprobación o petición de cambios sobre un cierre semanal.

### 4.3 Control de acceso

- Aislamiento estricto por workspace.
- Cuatro ejes de estado independientes (visibilidad, publicación, funcional, revisión).
- Registro de auditoría de todo cambio de estado visible.

## 5. Fuera del alcance (MVP)

| Excluido | Motivo |
|---|---|
| Integración automática con GitHub / GitLab | Evidencia se registra manualmente como enlace. Extensión futura. |
| Captura automática de uso de agentes o tokens | Registro manual o estimado en una fase posterior. |
| Chat en tiempo real | Los hilos son asíncronos. Suficiente para el caso de uso. |
| Pagos, facturación, presupuestos | El producto informa horas; no las cobra. |
| Seguimiento de tiempo automático (detección de actividad) | Invasivo y frágil. El registro es deliberado. |
| Gestión de proyectos completa (dependencias, Gantt, estimación) | No es un sustituto de Jira. |
| Aplicación móvil nativa | Web responsive cubre 390 × 844. |
| Multi-tenant comercial, planes, autoservicio de alta | Producto personal. |
| Informes exportables (PDF/CSV) | Deseable, no MVP. Ver **`OD-16`**. |
| Notificaciones por email o push | Ver `OD-09`. |
| Recuperación de contraseña por autoservicio | Sin correo en el MVP. Restablecimiento administrativo: [`ROLES-AND-PERMISSIONS.md`](ROLES-AND-PERMISSIONS.md) §9.1. |
| Localización multi-idioma | Ver `OD-14`. |
| Calendario externo (Google/Outlook) para reuniones | Las reuniones se registran manualmente. |

## 6. Restricciones de producto

1. **El cliente nunca escribe sobre el registro de trabajo.** Escribe en **cuatro** canales propios:
   `discussion_messages`, `client_requests`, `reviews` y propuestas de `meeting_agenda_items`.
   Ver [`ADR-003`](decisions/ADR-003-client-interaction.md).
2. **Nada es visible al cliente por defecto.** La visibilidad se concede, no se retira.
3. **Publicar es un acto explícito.** No hay publicación automática ni programada.
4. **El tiempo registrado es inmutable para el cliente** y editable por el propietario con auditoría.
5. **El producto no conoce clientes concretos.** Ninguna lógica ramifica por nombre de workspace.

## 7. Criterios de éxito del MVP

| # | Criterio | Cómo se comprueba |
|---|---|---|
| E1 | Nelson registra una semana completa de trabajo real sin salirse de la app | Un ciclo con ≥ 5 días de sesiones y actualizaciones |
| E2 | El cliente entiende el estado sin preguntar por fuera | Cierre semanal aprobado sin petición de aclaración sobre "qué se hizo" |
| E3 | Ningún dato privado se filtra | Auditoría de accesos del cliente: 0 registros `DRAFT` o `PRIVATE` servidos |
| E4 | El registro de tiempo no molesta | Iniciar sesión de trabajo ≤ 2 interacciones desde el inicio |
| E5 | Las solicitudes del cliente no desordenan el backlog | Toda `client_request` tiene resolución explícita |

## 8. Antifunciones

Cosas que el producto **debe evitar activamente**:

- Convertirse en una herramienta de vigilancia del tiempo propio.
- Exigir clasificar el trabajo antes de poder empezar a trabajar.
- Obligar al cliente a aprender un vocabulario de gestión de proyectos.
- Publicar algo por descuido.
