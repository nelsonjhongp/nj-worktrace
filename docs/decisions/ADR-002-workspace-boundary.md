# ADR-002 · El workspace es la frontera de autorización

- **Estado:** Aceptada · **revisada en la iteración 0.1** (§9 añadido)
- **Fecha:** 2026-07-28
- **Contexto de la decisión:** Iteración 0 (fundación documental)
- **Relacionada con:** [`ADR-001`](ADR-001-modular-monolith.md), [`ADR-003`](ADR-003-client-interaction.md)

---

## Contexto

Un mismo usuario (Nelson) trabaja en contextos que **no deben mezclarse jamás**: proyectos
personales, trabajo de cliente, trabajo de negocio propio. Un cliente invitado a un workspace no debe
poder deducir siquiera que los otros existen.

Este es el requisito del que depende la confianza en el producto. Si un cliente ve una línea de otro
cliente, el producto ha fallado de forma irreparable — no es un defecto de gravedad media.

Al mismo tiempo, dentro de un workspace hacen falta grados: privado, interno, visible para el
cliente; borrador y publicado. Esos grados son **filtros**, no fronteras. Confundir ambas cosas
produce sistemas donde un filtro olvidado equivale a una brecha.

## Decisión

**El `workspace` es la única frontera dura de autorización. Todo lo demás es filtrado dentro de ella.**

### 1. Toda entidad de contenido lleva `workspace_id`

Denormalizado, aunque sea derivable por join. Es la columna de aislamiento. Derivarla por relación es
una vía de fuga: basta un join mal escrito.

### 2. Todo acceso empieza por la comprobación de pertenencia

```
resolver_acceso(usuario, workspace):
  m = workspace_members[usuario, workspace] con status = ACTIVE
  si no existe m -> 404
  devolver m.role
```

### 3. Sin pertenencia se responde 404, nunca 403

Un 403 confirma que el recurso existe. Para un cliente que sondea identificadores, la diferencia
entre "no existe" y "existe pero no es tuyo" es información filtrada. **Se responde 404 siempre.**

### 4. El rol es por workspace, nunca global

No existen usuarios administradores globales. El mismo usuario puede ser `OWNER` en uno y `CLIENT` en
otro sin ninguna relación entre ambos.

### 5. El workspace activo es estado de navegación, no de sesión

`auth_sessions` **no** guarda workspace. Una sesión que "recuerda" un permiso es una sesión que puede
llevarlo a donde no toca. Cada petición resuelve su workspace y verifica pertenencia de nuevo.

### 6. Los prefijos de ruta separan las dos aplicaciones

`/w/:ws` para el propietario, `/c/:ws` para el cliente. **El prefijo no es la autorización** — esa
vive en la capa de datos — pero hace visible en los registros del servidor cualquier intento de
servir una pantalla en el contexto equivocado.

### 7. No existe movimiento de datos entre workspaces

Ninguna operación mueve, copia ni referencia contenido de un workspace a otro. Una entidad con dos
`workspace_id` posibles no puede existir. Es una limitación aceptada a propósito
(ver [F14 A3](../USER-FLOWS.md#f14--usar-un-workspace-personal-sin-exponerlo)).

### 8. La visibilidad y la publicación filtran **dentro** del workspace

Nunca lo sustituyen. El orden es siempre: pertenencia → rol → **clase de entidad** → visibilidad →
publicación. Saltarse el primer paso porque el filtro de visibilidad "ya lo cubre" es exactamente el
error que este ADR previene.

El paso *clase de entidad* se añadió en la iteración 0.1: no toda entidad tiene
`publication_state`, y aplicar `CLIENT_VISIBLE + PUBLISHED` indiscriminadamente producía una regla
imposible de cumplir para la mitad del modelo. Ver
[`ROLES-AND-PERMISSIONS.md`](../ROLES-AND-PERMISSIONS.md) §4.

### 9. El identificador de un workspace es opaco; su nombre no identifica nada

Añadido en la iteración 0.1. La versión anterior usaba un `slug` legible con **unicidad global** como
identificador de ruta. Eso rompía la garantía de §3 por dos vías:

1. **Sondeo.** Un identificador legible y adivinable (`/w/sotravil`) invita a probar nombres. El 404
   sigue siendo correcto, pero el coste de intentarlo baja a cero.
2. **Oráculo de existencia.** Una validación de unicidad global responde *"ese nombre ya está en
   uso"*, que es exactamente la información que §3 se esfuerza en no revelar — y a veces revela
   quién es el cliente de otra persona.

Reglas:

- Las rutas usan `workspaces.public_id`: **opaco, no correlativo, no adivinable**.
- El **nombre es decorativo**. Se muestra en la cabecera; no navega y no identifica.
- **No se valida la unicidad del nombre frente a workspaces ajenos.** No existe ningún mensaje del
  tipo *"nombre no disponible"*. Como mucho se avisa de coincidencia **entre los workspaces del
  propio usuario**, y como advertencia, nunca como error.
- Lo mismo aplica a toda entidad que aparezca en una ruta: se expone por `public_id`, no por título.

El identificador opaco **no es la autorización** — esa sigue siendo la pertenencia de §2 — pero
elimina la capa de información que se filtraba antes de llegar a ella.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| **Un solo espacio con etiquetas de cliente** | El aislamiento dependería de recordar un `WHERE` en cada consulta. Un olvido = fuga. Sin frontera estructural que fallar en seguro. |
| **Una base de datos por workspace** | Aislamiento máximo, coste operativo alto y consultas del propietario entre workspaces (su propio panel) imposibles sin federación. Desproporcionado para un producto personal. |
| **Permisos por recurso (ACL)** | Máxima flexibilidad, máxima superficie de error. El caso real no necesita permisos por recurso: necesita "todo mío" o "lo publicado". |
| **Rol global con alcance por workspace** | Introduce la posibilidad de un superusuario. En un producto personal es un riesgo sin contrapartida. |

## Consecuencias

**Positivas**
- El aislamiento es estructural, no un acuerdo entre programadores.
- Una sola comprobación, en un solo lugar, protege todo el sistema.
- Falla en seguro: sin `workspace_id` resuelto, no hay consulta.
- Auditable: cada evento lleva su workspace.

**Negativas**
- Sin informes entre workspaces. El propietario no puede ver "todas mis horas de julio" de una vez.
  Aceptado; si se necesita, será una vista de solo lectura, explícita y con su propio ADR.
- Contenido duplicado si un mismo tema afecta a dos workspaces. Aceptado.
- Los 404 pueden confundir al propio propietario ante un enlace antiguo. Se mitiga con un mensaje
  útil en la propia pantalla de 404, sin revelar nada.

## Reglas verificables

| # | Regla | Cómo se comprueba |
|---|---|---|
| A1 | Toda tabla de contenido tiene `workspace_id` no nulo | Revisión del esquema |
| A2 | Toda consulta de lectura filtra por `workspace_id` | Prueba de aislamiento por entidad |
| A3 | Sin membresía activa se responde 404 | Prueba por ruta |
| A4 | `auth_sessions` no tiene `workspace_id` | Revisión del esquema |
| A5 | Ninguna operación escribe dos `workspace_id` distintos | Revisión de código |
| A6 | Ningún identificador de un workspace es resoluble desde otro | Prueba de sondeo de identificadores |
| A7 | Toda ruta usa `public_id` opaco; ningún nombre legible identifica un recurso | Revisión de rutas |
| A8 | Ninguna validación revela la existencia de un workspace ajeno | Prueba sobre el alta de workspace |

Estas ocho reglas son el criterio de terminado de la iteración 2 de
[`MVP-PLAN.md`](../MVP-PLAN.md).

## Revisión

Reconsiderar solo si aparece un requisito de colaboración entre organizaciones (un cliente que
comparte un proyecto con otro proveedor). No está previsto y exigiría rediseñar el modelo de acceso
por completo, no parchearlo.
