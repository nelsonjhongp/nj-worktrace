# nj-worktrace

Aplicación personal **multiespacio** para trazabilidad de trabajo y colaboración controlada con
clientes.

> **Estado: esquema de identidad y workspaces (iteración 2A).** Esquema de base de datos con tablas
> `domain_users`, `workspaces` y `workspace_members`, migraciones versionadas y pruebas de integración.
> La autenticación y la interfaz todavía no están implementadas.

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

## Desarrollo

### Requisitos

- Node.js 24.x
- pnpm 11.x
- Docker y Docker Compose

### Instalación

```bash
# Copiar variables de entorno
cp .env.example .env

# Instalar dependencias
pnpm install
```

### PostgreSQL local

```bash
pnpm db:up        # Iniciar PostgreSQL en contenedor
pnpm db:down      # Detener y eliminar contenedor
pnpm db:logs      # Ver logs de PostgreSQL
pnpm db:check     # Verificar conexión a la base de datos
```

### Migraciones

```bash
pnpm db:generate      # Generar migración desde el esquema
pnpm db:migrate       # Aplicar migraciones a la base de desarrollo
pnpm db:test:reset    # Resetear base de datos de pruebas
```

La base de datos de pruebas (`nj_worktrace_test`) es desechable y se resetea antes de cada ejecución
de pruebas de integración. La base de desarrollo (`nj_worktrace`) no se destruye automáticamente.

### Comandos

```bash
pnpm dev              # Servidor de desarrollo
pnpm build            # Construcción de producción
pnpm start            # Servidor de producción (requiere build previo)
pnpm lint             # ESLint
pnpm typecheck        # TypeScript sin emisión
pnpm test             # Pruebas unitarias con Vitest
pnpm test:integration # Pruebas de integración (requiere PostgreSQL)
pnpm verify           # lint + typecheck + test + test:integration + build
```

### Contenedor de producción

```bash
pnpm container:build    # Construir imagen Docker
pnpm container:up       # Iniciar aplicación en contenedor
pnpm container:down     # Detener contenedor
pnpm container:logs     # Ver logs del contenedor
pnpm container:check    # Verificar endpoints del contenedor
```

La imagen se construye con `output: 'standalone'` de Next.js y corre como usuario no root.

### Integración continua

El workflow `.github/workflows/ci.yml` se ejecuta automáticamente en:

- Push a `main`
- Pull requests hacia `main`
- Ejecución manual (`workflow_dispatch`)

Verifica:

- Instalación reproducible con `pnpm install --frozen-lockfile`
- Lint con ESLint
- Type check con TypeScript
- Pruebas unitarias con Vitest
- Pruebas de integración contra PostgreSQL 18 real
- Build de Next.js
- Build de la imagen Docker
- Arranque del contenedor con usuario no root
- Health check, readiness y recurso estático

La primera ejecución remota del workflow queda pendiente hasta hacer push.

### Health check

```bash
curl http://localhost:3000/api/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "nj-worktrace"
}
```

### Readiness check

```bash
curl http://localhost:3000/api/ready
```

Respuesta esperada con PostgreSQL activo:

```json
{
  "status": "ok",
  "service": "nj-worktrace",
  "database": "ok"
}
```

Respuesta esperada sin PostgreSQL:

```json
{
  "status": "error",
  "service": "nj-worktrace",
  "database": "unavailable"
}
```

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
| [`docs/TECHNICAL-FOUNDATION.md`](docs/TECHNICAL-FOUNDATION.md) | Stack, compatibilidad y política de versiones |
| [`docs/ENVIRONMENTS.md`](docs/ENVIRONMENTS.md) | Entornos y configuración |
| [`docs/TESTING.md`](docs/TESTING.md) | Estrategia y convenciones de prueba |
| [`docs/decisions/`](docs/decisions/) | Registros de decisión (ADR-001 … ADR-008) |

## Stack

Next.js 16 (App Router) · TypeScript estricto · Tailwind CSS 4 · shadcn/ui copiado al repositorio ·
PostgreSQL 18 · Drizzle ORM con migraciones SQL versionadas · Better Auth con sesiones en base ·
Node.js 24 LTS · Docker (`output: 'standalone'`) · Vitest y Playwright contra PostgreSQL real.

Sin dependencia obligatoria de ninguna plataforma de despliegue. Ver
[`docs/TECHNICAL-FOUNDATION.md`](docs/TECHNICAL-FOUNDATION.md).

## Para agentes de código

Lee [`CLAUDE.md`](CLAUDE.md) y [`AGENTS.md`](AGENTS.md) antes de cualquier cambio.

## Licencia

Repositorio público. Sin licencia explícita; todos los derechos reservados hasta que se adopte una.
