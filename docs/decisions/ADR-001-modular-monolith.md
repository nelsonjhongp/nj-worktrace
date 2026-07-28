# ADR-001 · Monolito modular

- **Estado:** Aceptada · **revisada en la iteración 0.1** (§4 y §6 aclarados)
- **Fecha:** 2026-07-28
- **Contexto de la decisión:** Iteración 0 (fundación documental)
- **Decide sobre:** forma del sistema, no sobre tecnología concreta

---

## Contexto

`nj-worktrace` es un producto personal. Un usuario que escribe, unos pocos que leen. Los volúmenes
esperados son de miles de registros al año, no de millones. No hay equipo de operaciones: quien lo
construye es quien lo mantiene, en su tiempo disponible.

Al mismo tiempo el dominio **sí** tiene fronteras internas nítidas: identidad, workspaces, registro
de trabajo, publicación, interacción con el cliente, auditoría. Ignorarlas produciría un sistema
donde una consulta cualquiera puede leer cualquier cosa — precisamente el fallo que este producto no
se puede permitir (ver [`ADR-002`](ADR-002-workspace-boundary.md)).

## Decisión

**Un único despliegue, organizado en módulos con fronteras explícitas.**

1. **Un proceso, un almacén de datos, un artefacto desplegable.**
2. **Módulos de dominio con superficie pública declarada.** Cada módulo expone un conjunto de
   operaciones; el resto de su contenido es interno. Los módulos no leen las tablas de otros.
3. **Módulos previstos:** `identity`, `workspaces`, `work` (proyectos, ciclos, items, sesiones),
   `publishing` (visibilidad, publicación, actualizaciones, cierres), `collaboration` (hilos,
   solicitudes, revisiones, reuniones), `audit`.
4. **La autorización es transversal y no negociable.** Vive en una capa que todos los módulos
   atraviesan, no replicada dentro de cada uno.
5. **Sin comunicación por red entre módulos.** Llamadas en proceso, transacciones locales.

### Aclaraciones de la iteración 0.1

**a. El escalado vertical es la prioridad del MVP, no un techo arquitectónico.**
El MVP se despliega como **una sola instancia** y se dimensiona verticalmente porque es lo
proporcionado al uso previsto. Eso **no** es lo mismo que decir que el monolito impide escalar
horizontalmente: un monolito sin estado en memoria compartida se replica detrás de un balanceador
como cualquier otro proceso. Lo que sí exige es disciplina desde el principio —
estado de sesión fuera del proceso, sin caché local con autoridad, sin temporizadores en memoria —
y esa disciplina se adopta ahora, aunque hoy solo corra una instancia.
La afirmación correcta es: *escalado vertical primero, horizontal posible sin rediseño.*

**b. Las operaciones entre módulos las coordina un servicio de aplicación.**
Un módulo de dominio **no orquesta** a otro. Cuando una operación abarca varios — publicar una
actualización toca `publishing`, `work` y `audit` — existe un **servicio de aplicación** (caso de
uso) por encima de los módulos que los invoca en orden y decide el resultado. Los módulos siguen
siendo ignorantes unos de otros; el orquestador es quien conoce la secuencia.

**c. El acceso entre módulos es siempre por superficie pública.**
Un módulo expone operaciones y tipos; todo lo demás es interno. Ningún módulo consulta las tablas de
otro, ni siquiera para leer. Si `publishing` necesita saber si un work item es visible, **pregunta a
`work`**; no hace un `select` sobre sus tablas.

**d. Una unidad de trabajo puede abarcar varios módulos sin romper (c).**
El orquestador abre una **unidad de trabajo** (transacción) y la propaga a los módulos que
participan. Todos escriben dentro de la misma transacción y confirman o revierten juntos. Compartir
transacción **no** autoriza a compartir tablas: cada módulo escribe únicamente las suyas, a través
de su propia superficie. Es la combinación que un microservicio no puede ofrecer y que aquí protege
invariantes como *publicar y elevar visibilidad ocurren juntos o no ocurren*.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| **Microservicios** | Coste operativo desproporcionado para un usuario. Convertiría toda invariante entre módulos en consistencia eventual — incluidas las reglas de visibilidad, donde un desfase es una fuga de datos. |
| **Monolito sin módulos** | Rápido al principio. Pero las reglas de aislamiento acaban dispersas por cada consulta, y basta olvidar un filtro `workspace_id` una vez para tener el fallo crítico del producto. |
| **Serverless por función** | Estado del cronómetro y transacciones multi-tabla encajan mal. Arranque en frío perceptible en la pantalla más usada. |
| **Monolito modular** ✅ | Coste de un monolito, fronteras de un sistema modular. Reversible: si un módulo necesitara separarse, la frontera ya existe. |

## Consecuencias

**Positivas**
- Un despliegue, un backup, una restauración.
- Transacciones reales: publicar una actualización y elevar la visibilidad de sus work items ocurre
  de forma atómica.
- Las reglas de autorización se aplican en un solo lugar y se prueban en un solo lugar.
- Las fronteras existen desde el día uno; extraer un módulo más adelante es posible.

**Negativas**
- Escalado vertical primero. La réplica horizontal es posible pero exige mantener el proceso sin
  estado propio desde el principio (§ aclaración *a*); es una disciplina, no una garantía gratuita.
- La disciplina modular depende de convención y revisión. Sin barrera de red, nada impide un atajo.
  Se mitiga con revisión explícita en `verify-change`.
- Un fallo en despliegue afecta a toda la aplicación. Aceptable para un producto personal.

**Neutras**
- No compromete lenguaje, framework ni motor de datos. Esas decisiones son de la iteración 1.

## Reglas derivadas

1. Ningún módulo consulta tablas propiedad de otro, ni para leer. Se pasa por su superficie pública.
2. Ningún módulo de dominio orquesta a otro: eso corresponde a un servicio de aplicación.
3. La autorización nunca se implementa dentro de un módulo de dominio.
4. `audit` es de solo escritura para todos los demás módulos.
5. Una operación que cruza módulos ocurre en **una sola unidad de trabajo** o no ocurre.
6. Compartir transacción no autoriza a compartir tablas.
7. El proceso no guarda estado con autoridad en memoria: sesiones, temporizadores y caché viven
   fuera, para que la réplica horizontal siga siendo posible.
8. Añadir un módulo exige un ADR nuevo.

## Revisión

Reconsiderar si: aparecen varios usuarios concurrentes escribiendo de forma sostenida; algún módulo
necesita un perfil de recursos radicalmente distinto; o el producto deja de ser personal.

Ninguna de esas condiciones es previsible hoy. Y si llegaran, el primer paso sería **replicar el
monolito**, no descomponerlo: la descomposición solo se justifica cuando un módulo concreto necesita
escalar o desplegarse por separado del resto.
