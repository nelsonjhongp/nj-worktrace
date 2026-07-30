# CLAUDE.md — Punto de entrada para agentes

`nj-worktrace` es una aplicación personal multiespacio para trazabilidad de trabajo y colaboración
controlada con clientes.

## Antes de hacer cualquier cosa

1. Lee [`AGENTS.md`](AGENTS.md), el contrato de trabajo para agentes.
2. Lee [`docs/START-HERE.md`](docs/START-HERE.md), el mapa de la documentación.
3. Consulta [`docs/CURRENT-STATE.md`](docs/CURRENT-STATE.md), el estado real, decisiones abiertas y
   rama activa.

No dupliques esos documentos: son la fuente de verdad para el detalle, el alcance y las decisiones.

## Estado actual

**Fase actual: iteración 2D — autorización por acción y `WorkspaceScope`.**

- Rama: `feat/workspace-authorization`.
- Las iteraciones 2A, 2B y 2C están fusionadas en `main`.
- La iteración 2D está implementada localmente, sin `commit` ni `push`.

Ya existe una aplicación ejecutable con Next.js App Router, TypeScript estricto, PostgreSQL,
Drizzle, migraciones SQL versionadas, Better Auth y sesiones persistentes en PostgreSQL. El esquema
ejecutable incluye `domain_users`, `workspaces` y `workspace_members`. También existen
`WorkspaceAccessContext`, el catálogo cerrado de capacidades, la matriz rol → capacidad,
`WorkspaceScope`, la traducción HTTP de resultados de autorización, pruebas unitarias y de
integración, CI y SonarCloud.

Todavía no existen una interfaz funcional, dashboard ni selector visual de workspace; módulos
completos de proyectos, ciclos, trabajo, evidencias, reuniones, solicitudes o revisiones; gestión
visual de memberships; Row-Level Security (RLS); middleware global de autorización; despliegue
remoto productivo ni integraciones externas de negocio.

## Restricciones vigentes

- No implementes UI sin una iteración autorizada.
- No crees módulos de negocio fuera del alcance solicitado.
- No introduzcas RLS ni middleware global de autorización.
- No añadas dependencias sin justificación y autorización.
- No crees migraciones ni cambies el esquema fuera de una iteración que lo requiera.
- No hagas `commit` ni `push` sin petición explícita.
- No mezcles cambios de propósito distinto.
- No codifiques nombres reales como reglas del producto; los workspaces se identifican por un
  `public_id` opaco.
- No importes internals de otros módulos.
- No implementes autorización dentro de rutas ni módulos de dominio; consulta la arquitectura y los
  límites vigentes en `AGENTS.md` y `docs/CURRENT-STATE.md`.

Si encuentras una contradicción documental o una decisión abierta `OD-xx` que afecte la tarea,
repórtala y pide dirección antes de resolverla.
