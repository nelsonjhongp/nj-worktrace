# nj-worktrace

Aplicación personal **multiespacio** para trazabilidad de trabajo y colaboración controlada con
clientes.

> **Estado: diseño documental.** No hay código de producto. Este repositorio contiene la fundación
> conceptual, los flujos y los wireframes de baja fidelidad.

## El problema

Nelson trabaja simultáneamente en proyectos personales, encargos de clientes y trabajo de negocio
propio. Necesita un único lugar donde registrar en qué trabaja, cuánto tiempo, con qué resultado y
con qué evidencia — y, para los clientes, una **vista publicada con interacción controlada** sobre
ese registro: el cliente lee lo que se ha publicado, comenta, pregunta, solicita y aprueba, sin
poder alterar el registro ni ver borradores u otros espacios.

## Idea en una frase

Nelson registra su trabajo en privado; decide qué se publica; el cliente lee, comenta y solicita —
pero nunca escribe sobre el registro.

## Conceptos clave

- **Workspace** — frontera dura de aislamiento. Tipos: `PERSONAL`, `CLIENT`, `BUSINESS`.
- **Work cycle** — una semana o ciclo de trabajo, con objetivo y cierre.
- **Work item** — jerarquía de trabajo: iniciativa → funcionalidad → tarea / bug / investigación.
  Participa en uno o varios ciclos sin duplicarse.
- **Work session** — tiempo real trabajado, con pausas, sobre un work item.
- **Daily update** — narrativa diaria que se prepara en borrador y se publica.
- **Evidence** — commits, pruebas, experimentos, enlaces y capturas. Una evidencia puede acreditar
  varios contextos a la vez sin copiarse.
- **Client request** — petición del cliente, en cola propia; nunca escribe en el backlog.
- **Review** — respuesta del cliente al cierre de una semana: lectura, aprobación o cambios.

## Modelo organizativo inicial (ejemplo de configuración, no reglas del producto)

| Workspace | Tipo | Miembros |
|---|---|---|
| Personal | `PERSONAL` | Nelson (`OWNER`) |
| Sotravil | `CLIENT` | Nelson (`OWNER`), Sotravil (`CLIENT`) — zona `America/Lima` |
| RIPNEL | `BUSINESS` | Nelson (`OWNER`) |

`Sotravil` y `RIPNEL` son **datos de ejemplo**. El producto no los conoce.

El modelo admite **varios miembros `CLIENT` por workspace** y que un mismo usuario tenga roles
distintos en workspaces distintos. El MVP arranca con un solo cliente: es configuración, no premisa.

## Documentación

Empieza por **[`docs/START-HERE.md`](docs/START-HERE.md)**.

| Documento | Contenido |
|---|---|
| [`docs/PRODUCT-SCOPE.md`](docs/PRODUCT-SCOPE.md) | Qué es y qué no es el producto |
| [`docs/ROLES-AND-PERMISSIONS.md`](docs/ROLES-AND-PERMISSIONS.md) | Roles y matriz de permisos |
| [`docs/USER-FLOWS.md`](docs/USER-FLOWS.md) | 14 flujos detallados |
| [`docs/INFORMATION-ARCHITECTURE.md`](docs/INFORMATION-ARCHITECTURE.md) | Navegación y jerarquía |
| [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) | Modelo conceptual de datos |
| [`docs/UI-WIREFRAMES.md`](docs/UI-WIREFRAMES.md) | Wireframes de baja fidelidad |
| [`docs/MVP-PLAN.md`](docs/MVP-PLAN.md) | Alcance y secuencia del MVP |
| [`docs/CURRENT-STATE.md`](docs/CURRENT-STATE.md) | Estado real y decisiones abiertas |
| [`docs/decisions/`](docs/decisions/) | Registros de decisión (ADR) |

## Para agentes de código

Lee [`CLAUDE.md`](CLAUDE.md) y [`AGENTS.md`](AGENTS.md) antes de cualquier cambio.

## Licencia

Sin definir. Proyecto privado.
