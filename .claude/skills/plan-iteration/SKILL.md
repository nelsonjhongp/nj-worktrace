---
name: plan-iteration
description: Convertir un objetivo de nj-worktrace en un plan verificable antes de tocar nada. Úsala cuando el usuario pida empezar una iteración, añadir una funcionalidad o abordar un cambio con más de un paso.
---

# plan-iteration

Procedimiento escrito. **Sin automatización.** Cualquier agente puede seguirlo a mano.

## Cuándo aplica

- El usuario pide iniciar una iteración de [`docs/MVP-PLAN.md`](../../../docs/MVP-PLAN.md).
- El trabajo toca más de un documento o más de un módulo.
- Existe cualquier duda sobre el alcance.

**No aplica** a correcciones de una línea, erratas ni cambios de redacción.

## Procedimiento

### 1. Leer antes de escribir

En este orden, sin saltarse ninguno:

1. `docs/CURRENT-STATE.md` — qué existe y qué está abierto
2. `docs/PRODUCT-SCOPE.md` — si está dentro del alcance
3. El documento específico del área afectada
4. Los ADRs relacionados

### 2. Comprobar decisiones abiertas

Recorre la tabla `OD-xx` de `CURRENT-STATE.md` §6.

> **Si el objetivo depende de una decisión abierta, detente aquí.**
> Enuncia la decisión, explica por qué bloquea y pregunta. No la resuelvas por conveniencia,
> ni siquiera con la opción "obvia".

### 3. Comprobar el alcance

¿Está en `PRODUCT-SCOPE.md` §4? Si no:

- Si está en §5 (fuera de alcance) → dilo y explica el motivo registrado.
- Si no aparece en ninguna → es alcance nuevo. **Propónlo, no lo asumas.**

### 4. Redactar el plan

```markdown
## Objetivo
Una frase. Qué será cierto al terminar que no lo es ahora.

## En alcance
- …

## Fuera de alcance
- … (lo que alguien podría esperar y no se hará)

## Decisiones abiertas que afecta
- OD-xx: … → ¿bloquea o se puede rodear?

## Pasos
1. … → documento o archivo que cambia
2. …

## Cómo se comprueba
- Criterio observable 1
- Criterio observable 2

## Documentos a actualizar
- docs/… (por qué)
- docs/CURRENT-STATE.md (siempre)

## Riesgos
- …

## Qué queda sin resolver
- …
```

### 5. Confirmar antes de ejecutar

Presenta el plan. **Espera aprobación.** Un plan que se ejecuta solo no era un plan: era una
suposición.

## Reglas

1. Ningún paso mezcla propósitos. Refactor, alcance nuevo y correcciones van por separado.
2. Todo paso tiene un criterio observable. "Mejorar X" no es un paso.
3. Todo plan actualiza `docs/CURRENT-STATE.md`.
4. Toda decisión estructural nueva exige un ADR — inclúyelo como paso.
5. Si el plan supera ocho pasos, probablemente son dos iteraciones. Propón dividirlo.
6. Si el plan requiere levantar una restricción de `AGENTS.md` §5, dilo de forma explícita y
   espera autorización.

## Salida esperada

Un plan en el chat, no un archivo. Los planes son efímeros; lo que perdura es la documentación que
producen.
