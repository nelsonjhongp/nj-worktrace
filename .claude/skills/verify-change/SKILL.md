---
name: verify-change
description: Comprobar la coherencia de un cambio en nj-worktrace antes de darlo por terminado. Úsala tras editar documentación o código, y antes de informar de que algo está hecho.
---

# verify-change

Procedimiento escrito. **Sin automatización.** Verificación manual guiada.

## Cuándo aplica

Siempre, antes de decir «terminado». También antes de proponer un commit.

## Procedimiento

### 1. Coherencia interna

- [ ] El documento modificado no se contradice a sí mismo.
- [ ] Los enlaces relativos resuelven.
- [ ] Las referencias `OD-xx` existen en `docs/CURRENT-STATE.md` §6.
- [ ] Las referencias a ADR existen en `docs/decisions/`.
- [ ] Los nombres de entidades y enums coinciden con `docs/DATA-MODEL.md` §3.

### 2. Coherencia entre documentos

Si cambiaste… comprueba también:

| Cambiaste | Comprueba |
|---|---|
| Una entidad o campo | `DATA-MODEL.md`, `ROLES-AND-PERMISSIONS.md` (matriz), `USER-FLOWS.md` |
| Un permiso | `ROLES-AND-PERMISSIONS.md`, `USER-FLOWS.md` (permisos por flujo), ADR-002, ADR-003 |
| Un flujo | `USER-FLOWS.md`, `UI-WIREFRAMES.md`, eventos de auditoría |
| Una pantalla | `UI-WIREFRAMES.md`, `INFORMATION-ARCHITECTURE.md` (rutas y navegación) |
| El alcance | `PRODUCT-SCOPE.md`, `MVP-PLAN.md`, `CURRENT-STATE.md` |
| Una ruta | `INFORMATION-ARCHITECTURE.md` §4, wireframes afectados |
| Un enum | `DATA-MODEL.md` §3 y todos los sitios que lo mencionan |

### 3. Invariantes del producto

Todo cambio debe respetarlas. Recórrelas explícitamente:

- [ ] **Frontera de workspace.** Nada cruza. Sin pertenencia → 404, no 403.
- [ ] **Los cuatro ejes siguen separados.** Visibilidad ≠ publicación ≠ estado funcional ≠ revisión.
- [ ] **Regla del cliente.** Ve una entidad **publicable** solo si es `CLIENT_VISIBLE` **y**
      `PUBLISHED`. Las entidades no publicables se rigen por su clase
      (`ROLES-AND-PERMISSIONS.md` §4), no por esta regla.
- [ ] **Escritura del cliente.** Solo los **cuatro** canales: `discussion_messages`,
      `client_requests`, `reviews` y propuestas de `meeting_agenda_items`.
- [ ] **Herencia de visibilidad.** Ningún hijo es más visible que su padre, y ningún contenedor se
      vuelve visible por contener algo visible.
- [ ] **Relaciones.** Ninguna entidad guarda listas de claves foráneas como sustituto de una relación.
- [ ] **Auditoría.** Todo cambio de estado visible emite un evento.
- [ ] **Sin entidades reales codificadas.** Ni «Sotravil» ni «RIPNEL» como lógica.

### 4. Comprobación de estado

- [ ] `docs/CURRENT-STATE.md` refleja el nuevo estado.
- [ ] Las decisiones nuevas están registradas (D-xx o ADR).
- [ ] Las decisiones abiertas nuevas están numeradas y referenciadas.
- [ ] Las decisiones cerradas se han retirado de §6 y añadido a §5.
- [ ] El registro de cambios (§10) tiene una entrada con fecha absoluta.

### 5. Comprobación de restricciones

- [ ] No se ha instalado ninguna dependencia.
- [ ] No se ha creado ningún scaffold de framework.
- [ ] No se han creado migraciones ni esquemas ejecutables.
- [ ] No se ha implementado autenticación, JWT, Docker, tiempo real, integración con GitHub,
      captura de agentes ni pagos.
- [ ] No se ha hecho `commit` ni `push`.

Si alguna casilla no se cumple, **no está terminado**: revierte o pide autorización.

### 6. Informar

```markdown
## Cambio
Una frase.

## Archivos modificados
- ruta — qué cambió

## Verificación
- Coherencia interna: OK / hallazgos
- Coherencia entre documentos: OK / hallazgos
- Invariantes: OK / hallazgos
- Estado actualizado: sí / no
- Restricciones respetadas: sí / no

## Sin resolver
- …

## Contradicciones detectadas
- … (si las hay: cita ambos documentos, no elijas)
```

## Reglas

1. **No informes de terminado con casillas sin marcar.** Di qué falta.
2. **No resuelvas contradicciones por tu cuenta.** Repórtalas y espera.
3. **No amplíes el alcance durante la verificación.** Si encuentras algo, anótalo aparte.
4. Verificar es leer de verdad, no afirmar que se ha leído.
