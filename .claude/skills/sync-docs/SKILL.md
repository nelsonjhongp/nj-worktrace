---
name: sync-docs
description: Detectar y corregir desincronización entre los documentos de nj-worktrace. Úsala cuando la documentación parezca desfasada, tras varios cambios seguidos, o al empezar a trabajar después de una pausa.
---

# sync-docs

Procedimiento escrito. **Sin automatización.** Auditoría manual de coherencia.

## Cuándo aplica

- Al retomar el proyecto tras una pausa.
- Después de varios cambios seguidos sin verificación.
- Cuando `CURRENT-STATE.md` parezca no reflejar la realidad.
- Cuando dos documentos parezcan decir cosas distintas.
- Antes de empezar una iteración nueva.

## Procedimiento

### 1. Estado real primero

Observa el repositorio **antes** de leer lo que dice de sí mismo:

- ¿Qué archivos existen realmente?
- ¿Hay código? ¿Dependencias? ¿Pruebas?
- ¿Cuál es el estado de Git: rama, commits, cambios sin seguimiento?

Anota lo observado. Todavía no lo compares.

### 2. Contrastar con `CURRENT-STATE.md`

| Sección | Comprueba |
|---|---|
| §2 Qué existe | ¿El árbol coincide con la realidad? |
| §3 Qué no existe | ¿Sigue sin existir de verdad? |
| §4 Estado de Git | ¿Rama, commits y estado son los actuales? |
| §5 Decisiones adoptadas | ¿Cada una sigue reflejada en su documento? |
| §6 Decisiones abiertas | ¿Alguna se cerró de hecho sin registrarse? |
| §7 Contradicciones | ¿Alguna sigue pendiente de confirmación? |
| §8 Riesgos | ¿Alguno se materializó o desapareció? |
| §9 Próximo paso | ¿Sigue siendo el correcto? |

### 3. Matriz de coherencia cruzada

Comprueba cada par. Marca discrepancias, **no las corrijas todavía**.

| Par | Debe coincidir |
|---|---|
| `DATA-MODEL` ↔ `ROLES-AND-PERMISSIONS` | Toda entidad aparece en la matriz de permisos |
| `DATA-MODEL` ↔ `USER-FLOWS` | Toda entidad se crea o modifica en algún flujo |
| `ROLES-AND-PERMISSIONS` ↔ `USER-FLOWS` | Los permisos de cada flujo respetan la matriz |
| `USER-FLOWS` ↔ `UI-WIREFRAMES` | Todo flujo tiene pantalla, o se declara sin interfaz |
| `UI-WIREFRAMES` ↔ `INFORMATION-ARCHITECTURE` | Toda pantalla tiene ruta; toda ruta tiene pantalla |
| `PRODUCT-SCOPE` ↔ `MVP-PLAN` | Nada del plan queda fuera del alcance |
| `MVP-PLAN` ↔ `CURRENT-STATE` | La iteración declarada coincide con lo que existe |
| ADRs ↔ todo lo demás | Ninguna decisión se contradice en otro documento |
| `START-HERE` ↔ `docs/` | El índice lista todos los documentos existentes |
| `AGENTS.md` ↔ `.claude/skills/` | Las skills listadas existen |

### 4. Clasificar los hallazgos

| Tipo | Qué es | Qué hacer |
|---|---|---|
| **Desfase** | Un documento quedó atrás; el correcto es evidente | Corregir y anotar |
| **Contradicción** | Dos documentos afirman cosas incompatibles y ninguno es claramente el correcto | **Reportar. No elegir.** |
| **Hueco** | Falta algo que debería estar | Reportar y proponer |
| **Sobrante** | Documentado algo que ya no aplica | Reportar y proponer retirada |

### 5. Corregir solo lo inequívoco

**Corrige** los desfases: erratas, enlaces rotos, referencias a archivos renombrados, tablas
desactualizadas cuya versión correcta es obvia.

**No corrijas** contradicciones. Preséntalas así:

```markdown
### Contradicción: <tema>
- `docs/A.md` §X dice: "…"
- `docs/B.md` §Y dice: "…"
- Son incompatibles porque: …
- Resolución propuesta: …
- **Requiere confirmación antes de aplicarse.**
```

### 6. Actualizar el estado

Actualiza `docs/CURRENT-STATE.md`:

- §2, §3, §4 con lo observado en el paso 1.
- §7 con las contradicciones nuevas.
- §10 con una entrada de fecha absoluta.

### 7. Informar

```markdown
## Sincronización de documentación — <fecha absoluta>

### Estado real observado
- …

### Corregido
- ruta §sección — qué estaba mal

### Contradicciones (requieren decisión)
- …

### Huecos detectados
- …

### Sobrante
- …

### CURRENT-STATE actualizado
- sí / no · qué secciones
```

## Reglas

1. **Observa antes de leer.** El repositorio manda sobre lo que dice de sí mismo.
2. **Nunca resuelvas una contradicción en silencio.** Es la regla 7 de `CLAUDE.md`.
3. **No amplíes el alcance.** Sincronizar es alinear, no rediseñar.
4. **Fechas absolutas** en todo lo que escribas.
5. Si `CURRENT-STATE.md` estaba muy desfasado, dilo. Es señal de que el criterio de terminado de
   `AGENTS.md` §4 no se está aplicando.
