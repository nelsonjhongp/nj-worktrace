# AGENTS.md — Contrato de trabajo para agentes

Documento neutral. Aplica a cualquier agente o asistente de código (Claude Code, OpenCode, Codex,
Cursor, Aider u otros). No depende de ninguna herramienta concreta.

---

## 1. Qué es este repositorio

`nj-worktrace` es una aplicación personal multiespacio para registrar trabajo (tiempo,
funcionalidades, resultados, evidencias, reuniones) y compartir una vista controlada con clientes.

**Fase actual: diseño documental.** No hay código de producto.

## 2. Orden de lectura obligatorio

| Orden | Documento | Para qué |
|---|---|---|
| 1 | `docs/START-HERE.md` | Mapa e índice de toda la documentación |
| 2 | `docs/CURRENT-STATE.md` | Qué existe hoy, qué está decidido, qué está abierto |
| 3 | `docs/PRODUCT-SCOPE.md` | Límites del producto: dentro / fuera |
| 4 | El documento específico de tu tarea | Ver tabla de enrutado en `START-HERE.md` |

## 3. Principios de trabajo

1. **La documentación es la fuente de verdad.** Si el código y la documentación difieren, es un
   defecto: repórtalo, no lo silencies.
2. **Un cambio, un propósito.** No mezcles refactor, alcance nuevo y correcciones.
3. **Nada de alcance implícito.** Si el usuario pide A y notas que falta B, entrega A y **propón** B.
4. **Las decisiones abiertas bloquean.** Ver `OD-xx` en `docs/CURRENT-STATE.md`. Si tu tarea toca
   una decisión abierta, detente y pregunta. No la resuelvas por conveniencia.
5. **Las contradicciones se reportan.** Cita los documentos en conflicto, propón una resolución,
   espera confirmación.
6. **Sin entidades reales codificadas.** `Sotravil` y `RIPNEL` son **ejemplos de configuración**,
   nunca entidades, ramas condicionales ni reglas dentro del producto. Si algún día aparece
   `if (workspace.name === 'Sotravil')`, es un defecto. Los workspaces se identifican por un
   `public_id` opaco; su nombre no identifica nada y no debe gobernar ninguna decisión.

## 4. Definición de terminado (fase documental)

Un cambio está terminado cuando:

- [ ] El documento afectado está actualizado y es internamente coherente.
- [ ] `docs/CURRENT-STATE.md` refleja el nuevo estado (decisiones nuevas o cerradas incluidas).
- [ ] Los enlaces cruzados entre documentos siguen resolviendo.
- [ ] Toda decisión estructural nueva tiene su ADR en `docs/decisions/`.
- [ ] Las decisiones abiertas nuevas están numeradas `OD-xx` y referenciadas desde donde surgen.
- [ ] Se ha listado explícitamente qué quedó sin resolver.

## 5. Restricciones actuales (fase de diseño)

**No hagas** nada de lo siguiente sin instrucción explícita y nueva del usuario:

- Instalar dependencias o crear `package.json`.
- Crear una aplicación Next.js o cualquier scaffold de framework.
- Crear migraciones o esquemas SQL ejecutables.
- Implementar autenticación, sesiones o JWT.
- Configurar Docker o infraestructura.
- Implementar chat en tiempo real (WebSocket, SSE).
- Implementar integración con GitHub.
- Implementar captura de uso de agentes o tokens.
- Implementar pagos o facturación.
- Crear microservicios.
- Hacer `commit` o `push`.

El modelo de datos en `docs/DATA-MODEL.md` es **conceptual**. No es un esquema para ejecutar.

## 6. Convenciones

- **Idioma de la documentación:** español. **Identificadores técnicos** (tablas, campos, enums,
  rutas): inglés, `snake_case` para datos, `SCREAMING_SNAKE_CASE` para valores de enum.
- **Fechas:** absolutas (`2026-07-28`), nunca relativas ("la semana pasada").
- **Enums:** cerrados y documentados en `docs/DATA-MODEL.md`. No introduzcas valores nuevos sin ADR.
- **Decisiones abiertas:** `OD-xx` en `docs/CURRENT-STATE.md`.
  **Decisiones cerradas estructurales:** ADR en `docs/decisions/`.
- **Wireframes:** baja fidelidad, en Markdown. Sin branding, colores decorativos ni ilustraciones.

## 7. Los cuatro ejes de estado (regla central del producto)

Nunca los mezcles. Confundirlos es el error de diseño más caro de este producto.

| Eje | Pregunta que responde | Campo |
|---|---|---|
| **Visibilidad** | ¿Quién *puede* ver este registro? | `visibility` |
| **Publicación** | ¿El autor lo ha *liberado*? | `publication_state` |
| **Estado funcional** | ¿En qué punto está el *trabajo*? | `work_state` |
| **Estado de revisión** | ¿Qué ha dicho el *cliente*? | `review_state` |

Regla derivada: un usuario con rol `CLIENT` ve una **entidad publicable** solo si
`visibility = CLIENT_VISIBLE` **y** `publication_state = PUBLISHED`.

**No toda entidad es publicable.** Solo lo son `work_cycles`, `work_items`, `daily_updates`,
`evidence_items` y `meetings`. Las demás se rigen por su clase: estructurales con visibilidad,
derivadas del ancla, canales del cliente o de sistema. Aplicar la regla indiscriminadamente a
cualquier registro es un error de diseño — ver [`docs/ROLES-AND-PERMISSIONS.md`](docs/ROLES-AND-PERMISSIONS.md) §4.

## 8. Skills disponibles

Especificaciones en `.claude/skills/`. Son procedimientos escritos, no automatizaciones.
Cualquier agente puede seguirlas manualmente, lea o no el formato de skills.

- `plan-iteration` — convertir un objetivo en un plan verificable antes de tocar nada.
- `verify-change` — comprobar coherencia de un cambio antes de darlo por terminado.
- `sync-docs` — detectar y corregir desincronización entre documentos.
