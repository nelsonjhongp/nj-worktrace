# CLAUDE.md — Punto de entrada

`nj-worktrace` es una aplicación personal multiespacio para **trazabilidad de trabajo** y
**colaboración controlada con clientes**. Hoy el repositorio contiene **solo documentación**.

## Antes de hacer cualquier cosa

1. Lee [`AGENTS.md`](AGENTS.md) — contrato de trabajo para agentes.
2. Lee [`docs/START-HERE.md`](docs/START-HERE.md) — mapa de la documentación.
3. Consulta [`docs/CURRENT-STATE.md`](docs/CURRENT-STATE.md) — qué existe realmente hoy.

## Reglas no negociables

4. **No inventes alcance.** Si algo no está en `docs/PRODUCT-SCOPE.md`, no existe. Propónlo, no lo asumas.
5. **No implementes decisiones pendientes.** Las decisiones abiertas viven en
   `docs/CURRENT-STATE.md` como `OD-xx`. Si tu tarea depende de una, detente y pregunta.
6. **Mantén la documentación sincronizada.** Todo cambio de comportamiento actualiza el documento
   que lo describe y `docs/CURRENT-STATE.md` en el mismo cambio.
7. **Informa contradicciones antes de resolverlas.** Si dos documentos se contradicen, cita ambos,
   propón una resolución y espera confirmación. No elijas en silencio.

## Estado actual: fase de diseño

No implementes todavía Next.js, PostgreSQL, Docker, autenticación, JWT, migraciones, tiempo real,
integración con GitHub, captura de agentes/tokens, pagos ni microservicios.
La lista viva de restricciones está en [`AGENTS.md`](AGENTS.md) §5.
