# MVP PLAN

Qué se construye, en qué orden y qué se deja fuera. **Este documento no autoriza a escribir código.**
Las restricciones de [`AGENTS.md`](../AGENTS.md) §5 siguen vigentes hasta que el usuario las levante
explícitamente.

---

## 1. Objetivo del MVP

Que Nelson registre **una semana real completa** de trabajo para un cliente y que ese cliente pueda
seguirla sin preguntar nada por fuera de la aplicación.

Primer caso real: un workspace de tipo `CLIENT`. Si esa semana funciona, el producto sirve.

## 2. Corte del alcance

### Dentro

| Bloque | Contenido |
|---|---|
| Identidad | Alta manual de usuarios, inicio de sesión, sesiones revocables, `DEMO_MODE` |
| Workspaces | Crear, conmutar, tipos, miembros con rol, aislamiento estricto |
| Estructura | Proyecto (posiblemente implícito), ciclos semanales, work items jerárquicos |
| Tiempo | Cronómetro con segmentos, entrada manual, ajuste con motivo |
| Resultado | `outcome_note` por sesión, evidencias como enlaces |
| Publicación | Actualizaciones diarias, cierre semanal, vista previa como cliente |
| Cliente | Resumen, actividad, funcionalidades, evidencias, reuniones, solicitudes |
| Conversación | Hilos anclados, aclaraciones marcadas |
| Solicitudes | Cola propia, triaje, conversión a work item |
| Reuniones | Agenda, notas, decisiones, siguientes pasos |
| Revisión | Confirmación de lectura, aprobación, petición de cambios |
| Auditoría | Eventos de cambio de estado visible y de acceso del cliente |

### Fuera (y por qué)

| Excluido | Motivo | ¿Cuándo? |
|---|---|---|
| Rol `MEMBER` operativo | Nelson trabaja solo hoy. El modelo lo contempla; la interfaz no. | Cuando haya un segundo colaborador |
| Rol `VIEWER` operativo | Sin caso de uso todavía | Sin fecha |
| Integración GitHub | Evidencia manual basta para validar el producto | Tras el MVP |
| Uso de agentes y tokens | Ver `OD-15` | Extensión posterior |
| Notificaciones | Ver `OD-09` | Si el cliente no vuelve solo |
| Exportación PDF/CSV | Deseable, no bloqueante. Ver `OD-16` | Tras el MVP |
| Recuperación de contraseña por autoservicio | Depende del correo (`OD-09`). En el MVP, restablecimiento administrativo | Con `OD-09` |
| Adjuntos alojados | Ver `OD-05` | Cuando aparezcan capturas |
| Tiempo real | Los hilos asíncronos bastan | No previsto |
| Calendario externo | Ver `OD-13` | No previsto |
| Multi-idioma | Ver `OD-14` | Si entra un cliente no hispanohablante |
| Facturación | El producto informa horas; no las cobra | No previsto |

## 3. Secuencia por iteraciones

Cada iteración termina en algo **usable de verdad**, no en una capa técnica.
El orden prioriza el riesgo: primero el aislamiento, luego el registro, luego la exposición.

### Iteración 0 — Fundación

Alcance, roles, flujos, arquitectura de información, modelo de datos, wireframes, ADRs.
**Estado: completa.**

### Iteración 0.1 — Normalización y consistencia

Cierre de `K-01`, `K-02`, `OD-02`, `OD-03`, `OD-07`, `OD-08` y `OD-11`. Corrección de las
contradicciones detectadas: evidencias multi-contexto, revisiones sin filas pendientes, clases de
entidad publicable, identificador opaco de workspace, relaciones N:M normalizadas, conversación
sobre solicitudes, cambio de sesión atómico y restablecimiento de contraseña.
**Estado: completa.**

### Iteración 1 — Decisiones técnicas

Elegir y registrar en ADRs: lenguaje y framework, motor de persistencia, mecanismo de sesión,
estrategia de despliegue, enfoque de pruebas.

`OD-07` ya está cerrada (UTC + zona IANA del workspace), así que el esquema tiene su base temporal
definida. Lo que queda por decidir aquí es técnico, no de producto.

*Terminado cuando:* existen ADR-004 a ADR-008 y ninguna decisión técnica queda implícita.

### Iteración 2 — Aislamiento y acceso

Usuarios, sesiones, workspaces, miembros, conmutador. La regla de §3.5 de
[`ROLES-AND-PERMISSIONS.md`](ROLES-AND-PERMISSIONS.md) aplicada en la capa de datos. `DEMO_MODE`.

*Terminado cuando:* se cumplen las **ocho** reglas verificables A1–A8 de
[`ADR-002`](decisions/ADR-002-workspace-boundary.md), comprobadas con pruebas automatizadas —
incluidas A7 (rutas por `public_id` opaco) y A8 (ninguna validación revela workspaces ajenos).
Esta es la iteración que no se puede hacer mal.

### Iteración 3 — Registro de trabajo

Proyectos, ciclos, work items jerárquicos, sesiones con segmentos, entrada manual, resultado,
evidencias como enlaces. Sin nada orientado al cliente todavía.

*Terminado cuando:* Nelson registra tres días reales en un workspace `PERSONAL` y el total de horas
cuadra con la realidad.

### Iteración 4 — Publicación

Visibilidad, publicación, actualizaciones diarias, vista previa como cliente, cierre semanal con
`hours_snapshot`.

*Terminado cuando:* una actualización publicada muestra en vista previa exactamente lo que verá el
cliente, y publicar con enlaces internos se **detiene** (regla R10).

### Iteración 5 — Aplicación del cliente

Rutas `/c/:ws`, resumen, actividad, funcionalidades, evidencias, estados vacíos honestos, auditoría
de acceso.

*Terminado cuando:* el cliente entiende la semana sin ayuda y la auditoría registra **cero** accesos
a contenido `DRAFT` o no `CLIENT_VISIBLE` (criterio E3).

### Iteración 6 — Interacción del cliente

Hilos, aclaraciones, solicitudes con triaje, revisiones de cierre.

*Terminado cuando:* el ciclo completo *publicar → comentar → aclarar → solicitar → triar → revisar*
transcurre entero dentro de la aplicación, y se cumplen las reglas C1–C9 de
[`ADR-003`](decisions/ADR-003-client-interaction.md).

### Iteración 7 — Reuniones

Reuniones, agenda con propuestas del cliente, decisiones, siguientes pasos.

*Terminado cuando:* una reunión real queda registrada y sus decisiones son consultables meses después.

### Iteración 8 — Endurecimiento

Revisión de la matriz de permisos contra la implementación, pruebas de aislamiento, auditoría
completa, estados de error, comportamiento sin conexión, accesibilidad básica.

*Terminado cuando:* cada celda de la matriz de permisos tiene una prueba que la respalda.

## 4. Dependencias

```mermaid
graph LR
    I0[0 · Fundación] --> I01[0.1 · Normalización]
    I01 --> I1[1 · Decisiones técnicas]
    I1 --> I2[2 · Aislamiento]
    I2 --> I3[3 · Registro]
    I3 --> I4[4 · Publicación]
    I4 --> I5[5 · App cliente]
    I5 --> I6[6 · Interacción]
    I4 --> I7[7 · Reuniones]
    I6 --> I8[8 · Endurecimiento]
    I7 --> I8
```

La iteración 2 es la única que bloquea todo lo demás. Un fallo de aislamiento detectado en la
iteración 8 obliga a rehacer las capas intermedias.

## 5. Decisiones abiertas por iteración

| Debe cerrarse antes de | Decisiones |
|---|---|
| Iteración 1 | *(ninguna: `OD-07` se cerró en la 0.1)* |
| Iteración 2 | *(ninguna: `OD-02` y `OD-11` se cerraron en la 0.1)* |
| Iteración 3 | *(ninguna: `OD-08` se cerró en la 0.1)* |
| Iteración 4 | `OD-01` agregación de horas · `OD-04` despublicar |
| Iteración 5 | `OD-12` retención de auditoría · `OD-17` visibilidad entre clientes |
| Iteración 6 | `OD-06` edición de mensajes · `OD-10` conversión de solicitudes |
| Tras el MVP | `OD-05` adjuntos · `OD-09` notificaciones · `OD-13` calendario · `OD-14` idioma · `OD-15` agentes · `OD-16` exportación |

**Ninguna decisión abierta bloquea ya las iteraciones 1, 2 y 3.** Era el objetivo de la iteración
0.1: despejar el camino hasta que exista registro de trabajo funcionando.

## 6. Riesgos de entrega

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Fuga entre workspaces | Crítico: destruye la confianza del cliente | Iteración 2 primero, con pruebas de aislamiento como criterio de terminado |
| Publicar algo interno por descuido | Alto | Vista previa obligatoria, bloqueo de publicación con enlaces internos, glifos de visibilidad siempre a la vista |
| Fricción en el registro de tiempo | Alto: si molesta, no se usa, y sin datos no hay producto | Criterio E4: iniciar en dos interacciones; preselección agresiva |
| El cliente nunca entra | Medio: el valor se evapora | Resumen que se entiende en 10 segundos; revisar `OD-09` si no vuelve |
| Alcance creciente | Medio | `PRODUCT-SCOPE.md` §5 como lista de rechazos, no de deseos |
| Sobreingeniería para un solo usuario | Medio | ADR-001: monolito modular; nada distribuido |
| Las horas se leen como factura | Medio | No hay sección "Horas"; siempre en contexto de resultado |

## 7. Qué **no** se mide en el MVP

Deliberadamente: productividad, comparación entre semanas, coste por funcionalidad, estimado vs.
real. El producto registra y comunica. Convertirlo en un panel de rendimiento personal cambiaría su
naturaleza — ver [`PRODUCT-SCOPE.md`](PRODUCT-SCOPE.md) §8.
