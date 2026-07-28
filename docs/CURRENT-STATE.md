# CURRENT STATE

**Última actualización: 2026-07-28 — iteración 0.1**

Estado real del proyecto. Este documento se actualiza en **todo** cambio. Si dice algo que no es
cierto, es un defecto.

---

## 1. Estado en una línea

**Iteración 0.1 completa: fundación documental normalizada y sin contradicciones abiertas entre
documentos.** No existe código de producto, ni dependencias, ni esquema ejecutable, ni despliegue.

## 2. Qué existe

```
nj-worktrace/
├── CLAUDE.md                 punto de entrada para agentes
├── AGENTS.md                 contrato de trabajo neutral
├── README.md                 presentación del proyecto
├── docs/
│   ├── START-HERE.md         mapa e índice
│   ├── PRODUCT-SCOPE.md      alcance, exclusiones, criterios de éxito
│   ├── ROLES-AND-PERMISSIONS.md  roles, clases de entidad, matriz
│   ├── USER-FLOWS.md         14 flujos detallados
│   ├── INFORMATION-ARCHITECTURE.md  navegación y rutas
│   ├── DATA-MODEL.md         22 entidades conceptuales
│   ├── UI-WIREFRAMES.md      7 pantallas × laptop + móvil
│   ├── MVP-PLAN.md           iteraciones 0 → 8
│   ├── CURRENT-STATE.md      este documento
│   └── decisions/
│       ├── ADR-001-modular-monolith.md    (revisado en 0.1)
│       ├── ADR-002-workspace-boundary.md  (revisado en 0.1)
│       └── ADR-003-client-interaction.md  (revisado en 0.1)
└── .claude/skills/
    ├── plan-iteration/SKILL.md
    ├── verify-change/SKILL.md
    └── sync-docs/SKILL.md
```

## 3. Qué NO existe

Sin `package.json` · sin dependencias · sin aplicación Next.js ni otro framework · sin base de datos
· sin migraciones · sin autenticación · sin Docker · sin CI · sin pruebas · sin despliegue · sin
integración con GitHub · sin captura de agentes o tokens · sin pagos.

Ningún archivo de este repositorio se ejecuta.

## 4. Estado de Git

- Rama: `docs/product-foundation`
- Rama principal: `main`
- **Commits: ninguno.** El repositorio no tiene historial todavía.
- Todos los archivos están **sin seguimiento** (`untracked`).
- No se ha hecho `commit` ni `push` — restricción explícita de `AGENTS.md` §5.

## 5. Decisiones adoptadas

### Estructurales (con ADR)

| # | Decisión | Revisión |
|---|---|---|
| ADR-001 | Monolito modular. Un despliegue, módulos con fronteras explícitas. Sin microservicios. | 0.1: escalado horizontal posible, orquestación por servicios de aplicación, unidad de trabajo compartida sin acceso a tablas ajenas |
| ADR-002 | El workspace es la única frontera dura de autorización. Sin pertenencia → 404. | 0.1: §9, identificador público opaco; el nombre no identifica ni se valida globalmente |
| ADR-003 | El cliente escribe solo en canales propios. Toda petición pasa por triaje. | 0.1: cuatro canales, revisiones sin filas pendientes, hilos sin visibilidad propia, solicitud como contexto de conversación |

### De producto

| # | Decisión | Dónde | Iteración |
|---|---|---|---|
| D-01 | Cuatro ejes de estado independientes: visibilidad, publicación, estado funcional, estado de revisión | `ROLES-AND-PERMISSIONS.md` §3 | 0 |
| D-02 | Un `CLIENT` ve una entidad **publicable** solo si es `CLIENT_VISIBLE` **y** `PUBLISHED` | ídem §4.1 | 0, matizada en 0.1 |
| D-03 | El tiempo vive en `work_session_segments`; la duración es la suma de segmentos, nunca fin − inicio | `DATA-MODEL.md` §4.10 | 0 |
| D-04 | El cliente nunca lee sesiones; recibe agregados publicados | `ROLES-AND-PERMISSIONS.md` §6.1 | 0 |
| D-05 | Publicar exige vista previa como cliente; nunca es un solo clic | `UI-WIREFRAMES.md` §5 | 0 |
| D-06 | Publicar con enlaces a contenido interno se **detiene**; nada se eleva en silencio | `USER-FLOWS.md` F5 | 0 |
| D-07 | Un hijo nunca es más visible que su padre | `DATA-MODEL.md` §8 R2 | 0 |
| D-08 | `reviews` es append-only; cambiar de opinión encadena, no sobrescribe | `DATA-MODEL.md` §4.16 | 0 |
| D-09 | El tipo de workspace es intención, no permiso; los permisos vienen del rol | `PRODUCT-SCOPE.md` §3 | 0 |
| D-10 | Navegación del propietario en 4 secciones; *Workspaces* a la cabecera + Ajustes | `INFORMATION-ARCHITECTURE.md` §2.1 | **confirmada 0.1 (`K-01`)** |
| D-11 | Navegación del cliente en 5 secciones; *Evidencias* como índice contextual dentro de *Actividad* | ídem §2.2 | **confirmada 0.1 (`K-02`)** |
| D-12 | Prefijos de ruta separados: `/w` propietario, `/c` cliente | ídem §4 | 0 |
| D-13 | Accesos rápidos de demostración solo con `DEMO_MODE=true`, comprobado en servidor | `UI-WIREFRAMES.md` §1 | 0 |
| D-14 | Como máximo una sesión `RUNNING` por usuario | `DATA-MODEL.md` §8 R6 | 0 |
| D-15 | No se mueve contenido entre workspaces | `ADR-002` §7 | 0 |
| D-16 | El servidor es la autoridad para todas las marcas de tiempo | `USER-FLOWS.md` F3 | 0 |
| D-17 | Sin permiso se responde 404, nunca 403 | `ADR-002` §3 | 0 |
| D-18 | La interfaz del cliente es una aplicación distinta, no la del propietario con elementos ocultos | `UI-WIREFRAMES.md` | 0 |
| **D-19** | El workspace se identifica por `public_id` opaco. El nombre es decorativo, sin unicidad global ni mensajes de "nombre en uso" | `DATA-MODEL.md` §4.3.1, `ADR-002` §9 | **0.1** |
| **D-20** | Evidencias multi-contexto vía `evidence_links`. Visibilidad **conjuntiva**: contexto accesible **y** evidencia `CLIENT_VISIBLE` + `PUBLISHED` | `DATA-MODEL.md` §4.12 | **0.1** |
| **D-21** | `reviews` contiene solo respuestas enviadas. `PENDING` eliminado del enum; lo pendiente se deriva. Cliente con `C` y `R`, sin `U` | `DATA-MODEL.md` §4.16.1 | **0.1** |
| **D-22** | Clases de entidad: publicable, estructural con visibilidad, derivada, canal del cliente, de sistema. La regla `CLIENT_VISIBLE + PUBLISHED` solo aplica a las publicables | `ROLES-AND-PERMISSIONS.md` §4 | **0.1** |
| **D-23** | El cliente accede a `projects` de forma derivada y a nivel de etiqueta. Sin listado, sin ruta, sin `description` | `DATA-MODEL.md` §5.3 | **0.1** |
| **D-24** | Relaciones N:M como entidades: `work_cycle_items`, `daily_update_work_items`, `meeting_attendees`, `evidence_links`. Sin listas de claves foráneas | `DATA-MODEL.md` §6 | **0.1** |
| **D-25** | UTC en almacenamiento; zona IANA **obligatoria** por workspace; preferencia IANA opcional por usuario; límites de día y ciclo en la zona del workspace | `DATA-MODEL.md` §7 | **0.1 (`OD-07`)** |
| **D-26** | `CLIENT_REQUEST` es contexto de conversación. `related_thread_id` eliminado; `origin_thread_id` conservado con otro significado | `DATA-MODEL.md` §4.14 | **0.1** |
| **D-27** | Iniciar una segunda sesión exige confirmación explícita; pausa y arranque son una operación atómica | `USER-FLOWS.md` F3 A2 | **0.1** |
| **D-28** | Sin recuperación de contraseña por autoservicio en el MVP. Restablecimiento administrativo de un solo uso | `ROLES-AND-PERMISSIONS.md` §9.1 | **0.1** |
| **D-29** | `discussion_threads` no almacena `visibility`: se resuelve contra el ancla en cada consulta | `DATA-MODEL.md` §4.13 | **0.1** |
| **D-30** | La revisión del cliente es informativa: no cambia `cycle_state`. El propietario cierra o reabre, y cerrar sin revisión deja constancia | `ROLES-AND-PERMISSIONS.md` §7.3 | **0.1 (`OD-03`)** |
| **D-31** | Varios `CLIENT` por workspace; un usuario en varios workspaces; rol por membresía, nunca global; `(workspace_id, user_id)` único | `ROLES-AND-PERMISSIONS.md` §2.1 | **0.1 (`OD-02`, `OD-11`)** |
| **D-32** | Un work item participa en varios ciclos vía `work_cycle_items`, sin duplicarse, conservando planificación, procedencia y estado al inicio y al cierre | `DATA-MODEL.md` §4.8 | **0.1 (`OD-08`)** |
| **D-33** | El cliente escribe en **cuatro** canales: mensajes, solicitudes, revisiones y propuestas de agenda | `ADR-003` §1 | **0.1** |

## 6. Decisiones abiertas

**No implementes nada que dependa de una de estas.** Detente y pregunta.

| # | Decisión | Bloquea | Impacto si se decide tarde |
|---|---|---|---|
| **OD-01** | ¿Qué granularidad de horas se publica: total del ciclo, por día, por funcionalidad o por tipo de actividad? ¿Se congela al publicar o se recalcula? | Iteración 4 | Medio. Afecta a `hours_snapshot` y a la pantalla del cliente. |
| **OD-04** | ¿Se puede editar o despublicar algo ya publicado? ¿Con qué rastro para el cliente? | Iteración 4 | Medio. Afecta a la confianza: un cliente que ve cambiar lo leído. |
| **OD-05** | ¿Las evidencias son solo enlaces o también archivos alojados? | Post-MVP | Alto si se decide tarde: almacenamiento, límites, seguridad, coste. |
| **OD-06** | ¿Los mensajes se pueden editar o borrar? ¿Ventana de tiempo? ¿Qué ve el otro? | Iteración 6 | Bajo. |
| **OD-09** | ¿Hay notificaciones (correo o en la aplicación)? ¿Para qué eventos? De ello depende también la recuperación de contraseña por autoservicio. | Post-MVP | Bajo. Pero si el cliente no vuelve solo, sube a alto. |
| **OD-10** | Política de solicitudes: ¿límite de peticiones abiertas por cliente? ¿El work item derivado nace `CLIENT_VISIBLE` automáticamente? | Iteración 6 | Bajo. |
| **OD-12** | Retención de `audit_events`, especialmente los de acceso del cliente. ¿Cuánto tiempo? ¿Se agregan? | Iteración 5 | Bajo al principio; crece con el volumen. |
| **OD-13** | ¿Integración con calendario externo para reuniones? | Post-MVP | Bajo. Hoy fuera de alcance. |
| **OD-14** | Idioma de la interfaz: solo español, solo inglés, o bilingüe. | Post-MVP | Medio si se decide tarde: reescritura de todos los textos. |
| **OD-15** | Uso de herramientas y agentes: qué se registra, manual o estimado, y cómo se relaciona con las sesiones. | Post-MVP | Bajo. `DATA-MODEL.md` §9 deja la puerta abierta. |
| **OD-16** | ¿Exportación de informes (PDF/CSV)? ¿Qué contiene un informe de cierre exportado? | Post-MVP | Bajo. **Nueva en 0.1**: antes se referenciaba erróneamente como `OD-09`. |
| **OD-17** | Con varios `CLIENT` en un workspace, ¿ve cada uno las solicitudes y revisiones de los demás? | Iteración 5 | Medio. **Nueva en 0.1**, surgida al cerrar `OD-02`. **Valor por defecto del MVP: cada cliente ve solo lo suyo** — el conservador. Si representan a una misma organización, probablemente convenga compartirlas. |

### Cerradas en la iteración 0.1

| # | Cierre |
|---|---|
| `K-01` | El workspace es contexto raíz: se selecciona desde la cabecera, se administra en Ajustes y **no** es sección de navegación principal. → D-10 |
| `K-02` | *Evidencias* no es sección principal del cliente: es pestaña o índice contextual dentro de *Actividad*, y las evidencias siguen apareciendo dentro de actualizaciones, funcionalidades y ciclos. → D-11 |
| `OD-02` | Varios `CLIENT` por workspace; un usuario en varios workspaces; `(workspace_id, user_id)` único. El MVP arranca con un cliente, pero el modelo no lo asume. → D-31 |
| `OD-03` | La revisión es informativa; no cambia `cycle_state`; el propietario puede cerrar sin revisión dejando constancia y decide si reabre tras `CHANGES_REQUESTED`. → D-30 |
| `OD-07` | UTC + zona IANA obligatoria por workspace (`America/Lima` en el ejemplo), preferencia opcional por usuario, límites de día y ciclo en la zona del workspace, sin abreviaturas. → D-25 |
| `OD-08` | `work_cycle_items`: un work item participa en varios ciclos sin duplicarse, conservando planificación, procedencia y estado al inicio y al cierre. → D-32 |
| `OD-11` | El rol nunca es global; se define por membresía. → D-31 |

## 7. Contradicciones

### 7.1 Resueltas en la iteración 0 *(confirmadas)*

| # | Tensión | Resolución |
|---|---|---|
| K-03 | El cliente puede *registrar solicitudes* pero no *modificar el backlog* | Cola `client_requests` independiente + triaje explícito (`ADR-003`) |
| K-04 | «Borradores privados» mezclaba publicación y visibilidad | Dos ejes independientes (D-01) |
| K-05 | El cliente comenta «en el contexto de una funcionalidad», pero hay funcionalidades internas | Solo comenta lo que ya ve; los hilos derivan del ancla |
| K-06 | `IN_REVIEW` en un workspace `PERSONAL` sin revisor | Sin miembros `CLIENT`, la transición es `ACTIVE → CLOSED` |
| K-07 | «Estado de revisión» como eje del ciclo, pero las revisiones son entradas encadenadas | Se deriva de la última revisión de cada cliente; no se almacena duplicado |
| K-08 | El login de demostración presupone autenticación, prohibida en esta fase | Se especifica sin implementar |
| K-09 | El cliente «consulta horas publicadas», pero las horas viven en sesiones que no puede leer | Recibe agregados publicados (D-04). Granularidad: `OD-01` |

### 7.2 Corregidas en la iteración 0.1

| # | Contradicción | Corrección |
|---|---|---|
| **K-10** | `reviews` se declaraba *append-only* y a la vez se creaba una fila `PENDING` por cliente al publicar — una fila que después habría que actualizar | `PENDING` eliminado del enum; lo pendiente se deriva; publicar no escribe en `reviews`; evento `review.requested` eliminado. → D-21 |
| **K-11** | La regla `CLIENT_VISIBLE + PUBLISHED` se aplicaba a *cualquier* registro, pero la mitad de las entidades no tiene `publication_state` | Clasificación por clases y regla de acceso por clase. → D-22 |
| **K-12** | `evidence_items` tenía una asociación única `attached_to_type/_id`, obligando a duplicar una evidencia por cada contexto, cada copia con su propia visibilidad | `evidence_links` como relación N:M + regla de visibilidad conjuntiva. → D-20 |
| **K-13** | El `slug` global del workspace era identificador de ruta y se validaba por unicidad: adivinable y oráculo de existencia, contra `ADR-002` §3 | `public_id` opaco en rutas; nombre decorativo sin unicidad global. → D-19 |
| **K-14** | Listas de claves foráneas (`linked_work_item_ids`, `attendee_user_ids`) usadas como relaciones, sin atributos ni integridad | Cuatro entidades de relación. → D-24 |
| **K-15** | `client_requests.related_thread_id` apuntaba a un hilo sin ancla propia — un hilo suelto, justo lo que `ADR-003` §8 prohíbe | `CLIENT_REQUEST` como `context_type`; `origin_thread_id` conservado con otro significado. → D-26 |
| **K-16** | `USER-FLOWS` F3 A2 decía que la sesión anterior *"se pausa automáticamente"*; el wireframe mostraba un diálogo de confirmación | Confirmación obligatoria + operación atómica, en ambos documentos. → D-27 |
| **K-17** | El wireframe de login ofrecía *"¿Olvidaste tu contraseña?"* sin flujo detrás y sin correo en el alcance | Enlace retirado; restablecimiento administrativo documentado. → D-28 |
| **K-18** | `ADR-003` contaba «tres puntos de escritura» y luego describía cuatro; `ROLES` hablaba de «tres celdas» | Cuatro canales, contados igual en todos los documentos. → D-33 |
| **K-19** | `PRODUCT-SCOPE` remitía la exportación de informes a `OD-09`, que trata de notificaciones | Creada `OD-16` para exportación |
| **K-20** | `discussion_threads` almacenaba `visibility` copiada del ancla, susceptible de desincronizarse | Campo eliminado; la accesibilidad se resuelve contra el ancla. → D-29 |
| **K-21** | El README describía la vista del cliente como *"de solo lectura"*, incompatible con comentar, solicitar y aprobar | *"Vista publicada con interacción controlada"* |
| **K-22** | `ADR-001` afirmaba «escalado únicamente vertical», confundiendo la prioridad del MVP con un límite arquitectónico | Aclarado: vertical primero, horizontal posible sin rediseño, con la disciplina de no guardar estado con autoridad en el proceso |
| **K-23** | Nada definía cómo accede el cliente al proyecto que contiene contenido publicado | Acceso derivado a nivel de etiqueta, sin listado ni ruta. → D-23 |

**Ninguna contradicción queda pendiente de confirmación.**

## 8. Riesgos vigentes

| # | Riesgo | Gravedad | Estado |
|---|---|---|---|
| R-01 | Fuga de datos entre workspaces | **Crítica** | Mitigada en diseño (ADR-002, ahora con A7–A8). Sin verificar: no hay código. |
| R-02 | Publicar contenido interno por descuido | Alta | Mitigada en diseño (D-05, D-06, R10 ampliada a evidencias). Sin verificar. |
| R-03 | El registro de tiempo resulta molesto y se abandona | Alta | Mitigada en diseño (criterio E4). Solo se comprueba con uso real. |
| R-04 | El cliente nunca entra en la aplicación | Media | Sin mitigar. Depende de `OD-09`. |
| R-05 | Crecimiento del alcance | Media | Mitigada: `PRODUCT-SCOPE.md` §5 es una lista de rechazos. |
| R-06 | Complejidad del modelo tras normalizar (4 entidades de relación nuevas) | Media | **Nuevo en 0.1.** El modelo es más correcto pero menos inmediato. Se mitiga con §5 y §6 de `DATA-MODEL.md`, que explican el porqué de cada relación. |
| R-07 | La documentación se desincroniza del código futuro | Media | Mitigada: skill `sync-docs` + criterio de terminado en `AGENTS.md` §4. |
| R-08 | Las horas se interpretan como una factura | Media | Mitigada en diseño: no hay sección *Horas*; siempre en contexto de resultado. |
| R-09 | Sobreingeniería para un usuario | Baja | Mitigada: ADR-001. |
| R-10 | Los nombres de ejemplo acaban en el código | Baja | Mitigada: `AGENTS.md` §3.6 lo declara defecto. |

`R-06` sustituye al antiguo riesgo de zonas horarias, ya cerrado con `OD-07`.

## 9. Próximo paso recomendado

**Iteración 1 — decisiones técnicas.** Ya no hay decisiones de producto que la bloqueen.

1. Registrar como ADR-004 a ADR-008: lenguaje y framework, persistencia, mecanismo de sesión,
   despliegue, enfoque de pruebas.
2. Al elegir persistencia, comprobar que soporta lo que el modelo exige: transacciones que abarcan
   varios módulos (`ADR-001` aclaración *d*), unicidad compuesta (`work_cycle_items`,
   `evidence_links`, `workspace_members`) y aritmética de fechas civiles con zona IANA
   (`DATA-MODEL.md` §7).
3. Después, iteración 2 (aislamiento), cuyo criterio de terminado son las **ocho** reglas A1–A8 de
   `ADR-002`.

**No empezar por la interfaz.** La iteración 2 es la única cuyo fallo no se puede corregir a
posteriori sin rehacer lo construido encima.

## 10. Registro de cambios

| Fecha | Cambio |
|---|---|
| 2026-07-28 | **Iteración 0.1** — normalización. 7 decisiones cerradas (`K-01`, `K-02`, `OD-02`, `OD-03`, `OD-07`, `OD-08`, `OD-11`), 15 decisiones de producto nuevas (D-19…D-33), 14 contradicciones corregidas (K-10…K-23), 2 decisiones abiertas nuevas (`OD-16`, `OD-17`), 4 entidades de relación añadidas, 3 ADRs revisados. Quedan 12 decisiones abiertas, ninguna bloquea las iteraciones 1–3. |
| 2026-07-28 | **Iteración 0** — fundación documental. 15 decisiones abiertas, 3 ADRs, 18 decisiones de producto, 9 contradicciones documentadas. |
