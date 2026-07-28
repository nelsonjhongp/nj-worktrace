# ADR-006 · Autenticación y sesiones

- **Estado:** Aceptada
- **Fecha:** 2026-07-28
- **Contexto de la decisión:** Iteración 1 (decisiones técnicas)
- **Relacionada con:** [`ADR-002`](ADR-002-workspace-boundary.md) (§5: la sesión no guarda workspace),
  [`ROLES-AND-PERMISSIONS.md`](../ROLES-AND-PERMISSIONS.md) §9

---

## 1. Contexto

[`ROLES-AND-PERMISSIONS.md`](../ROLES-AND-PERMISSIONS.md) §9 fijó requisitos conceptuales de sesión
antes de elegir mecanismo: sesiones **del lado del servidor**, revocables una a una y en bloque,
pertenecientes a un usuario y **no a un workspace**, con expiración absoluta y por inactividad.

[`ADR-002`](ADR-002-workspace-boundary.md) §5 añadió el requisito más importante: **el workspace
activo no se guarda en la sesión**. Una sesión que recuerda un permiso es una sesión que puede
llevarlo a donde no toca.

Además hay que separar dos cosas que suelen confundirse: **autenticación** (quién eres) y
**autorización** (qué puedes hacer aquí). La segunda es propiedad del producto y no se delega.

## 2. Fuerzas y restricciones

| # | Fuerza | Implicación |
|---|---|---|
| F1 | Revocación inmediata y verificable | La sesión debe consultarse contra la base, no creerse a sí misma |
| F2 | La sesión no puede llevar el workspace (`ADR-002` §5) | Ni en cookie, ni en token, ni en caché de sesión |
| F3 | La autorización es del producto | `workspace_members` manda; ninguna biblioteca decide permisos |
| F4 | Autohospedaje sin proveedor de identidad obligatorio | Nada de servicio externo de autenticación en el MVP |
| F5 | `DEMO_MODE` no puede existir en producción | Separación comprobable, no un `if` de configuración |
| F6 | Sin correo en el MVP (`OD-09`) | Sin recuperación por autoservicio (D-28) |
| F7 | Un solo mantenedor | No escribir criptografía ni gestión de sesiones a mano |

## 3. Decisión

**Better Auth (línea `1.6.x`) con sesiones persistidas en PostgreSQL mediante el adaptador de
Drizzle, cookies de sesión opacas, y la caché de sesión en cookie desactivada.**

### 3.1 Qué se adopta

| Aspecto | Decisión |
|---|---|
| Biblioteca | **Better Auth `1.6.x`** (estable; `1.6.17` al cerrar este ADR) |
| Almacenamiento | Tabla de sesiones en **PostgreSQL**, vía adaptador de Drizzle (`provider: "pg"`) |
| Transporte | **Cookie**, con el token de sesión. Opaca: no transporta datos |
| `httpOnly` | **Sí**, siempre |
| `secure` | **Sí** en producción; forzado también en preproducción con `useSecureCookies` |
| `sameSite` | **`Lax`**, fijado explícitamente (§3.3) |
| Método inicial | Correo + contraseña, con alta manual de usuarios |
| `cookieCache` | **Desactivada** (§3.2) |
| Modo sin estado | **Prohibido** |
| JWT como sesión de navegador | **Prohibido** |

### 3.2 Por qué la caché de sesión en cookie queda desactivada

Better Auth ofrece `cookieCache`: guarda los datos de sesión en una cookie firmada para evitar
consultar la base en cada petición. Su propia documentación advierte de la consecuencia: *las
sesiones revocadas pueden seguir activas en otros dispositivos hasta que expire la caché.*

Para este producto eso es inaceptable. La revocación es la manera de cortar el acceso de un cliente
cuando termina una relación comercial, y una ventana de validez residual convierte una garantía en
una promesa aproximada (F1). El coste —una consulta por petición— es despreciable con el volumen
esperado.

Mismo razonamiento contra el **modo sin estado**: elimina la consulta y con ella la revocación.

**Regla:** si algún día se activa `cookieCache` por rendimiento, será con `maxAge` de segundos, con
`disableCookieCache` en toda operación sensible, y con su propio ADR. No como un ajuste.

### 3.3 Cookies

La documentación oficial consultada afirma que todas las cookies son `httpOnly` y `secure` en
producción, pero **no documenta el valor por defecto de `SameSite`**. Por tanto **se fija de forma
explícita en la configuración** en lugar de confiar en el valor implícito, y se comprueba con una
prueba automatizada (T6-3).

Se elige **`SameSite=Lax`**: el producto no tiene flujos entre sitios, ni incrustación en iframes de
terceros, ni retorno de proveedores de identidad externos. `Strict` rompería la navegación desde un
enlace externo a una actualización publicada, que es un caso de uso real del cliente. `None`
quedaría prohibido: no hay razón para él y amplía la superficie de CSRF.

**Protección CSRF.** La documentación consultada no la detalla. Por tanto **no se asume**: además de
`SameSite=Lax`, toda mutación se hace por `POST` desde el mismo origen, y en la iteración 2 se
verifica de forma explícita qué ofrece Better Auth y qué falta añadir. Se registra como criterio
verificable (T6-8), no como hecho.

### 3.4 Frontera entre Better Auth y el dominio

Esta es la parte que más importa a largo plazo.

**Better Auth responde una sola pregunta: ¿qué usuario es este?**

Todo lo demás lo decide el producto:

| Pregunta | Quién responde |
|---|---|
| ¿Qué usuario es? | Better Auth |
| ¿Es miembro de este workspace? | `workspaces`, con `workspace_members` |
| ¿Con qué rol? | `workspace_members` |
| ¿Puede ver este registro? | La capa de autorización del producto |

Concreción:

1. Las tablas de Better Auth (`user`, `session`, `account`, `verification`) son suyas y **viven en
   su propio ámbito**. Ningún módulo de dominio las consulta.
2. El dominio tiene su propia entidad `users` conceptual
   ([`DATA-MODEL.md`](../DATA-MODEL.md) §4.1), enlazada por identificador con la de Better Auth. Los
   campos de dominio —`preferred_timezone`, `is_demo`, `display_name`— **no se cuelgan** de la tabla
   de la biblioteca mediante campos adicionales.
3. **No se usan los plugins de organización, equipos ni permisos de Better Auth.** El modelo de
   workspaces, roles y membresías es del producto y está definido en `DATA-MODEL.md` §4.4. Adoptar
   el suyo introduciría un segundo modelo de autorización en paralelo al de `ADR-002`, con dos
   fuentes de verdad sobre quién puede ver qué. Es exactamente el fallo que `ADR-002` previene.
4. El acceso a Better Auth pasa por un **módulo `identity` con superficie pública propia**
   (`ADR-004` §3.3). Sustituir la biblioteca afectaría a un módulo, no a la aplicación.

Este punto 3 es la respuesta a la pregunta del encargo *"¿satisface Better Auth los requisitos sin
forzar campos o comportamientos incompatibles con el modelo conceptual?"*: **sí, siempre que se use
solo para autenticación.** Si se adoptara su modelo de organizaciones, entraría en conflicto directo
con `workspace_members` y con la regla de `ADR-002` §4 de que el rol es por workspace y nunca global.

### 3.5 El workspace activo, fuera de la sesión

`ADR-002` §5 y F2. Concreción:

- La tabla de sesiones **no tiene columna de workspace** y nunca la tendrá.
- El workspace viaja en la **ruta** (`/w/:ws`, `/c/:ws`) y se resuelve en cada petición
  comprobando `workspace_members` (`ADR-002` §2).
- La preferencia de "último workspace usado" es **comodidad de navegación**, se guarda como
  preferencia del usuario o en almacenamiento del navegador, y **jamás** se usa para autorizar.
  Resolver un workspace desde ella sin comprobar pertenencia sería la vulnerabilidad exacta que
  `ADR-002` describe.

### 3.6 `DEMO_MODE`

D-13 exige que los accesos rápidos de demostración solo existan con `DEMO_MODE=true`, comprobado en
servidor. Concreción:

| Regla | Detalle |
|---|---|
| Lectura | Variable de servidor, validada con Zod al arrancar. **Nunca** con prefijo público |
| Comportamiento con `DEMO_MODE=false` | Las rutas de demostración **existen en el árbol de archivos** —Next.js las registra por estructura, no dinámicamente—, pero cada handler comprueba `DEMO_MODE` **como primera línea, antes de cualquier lógica**, y responde **404** si está desactivado. No se afirma que la ruta "se desregistre": se afirma que **no ejecuta nada** y **no revela nada** salvo el 404 |
| Interfaz | Con `DEMO_MODE=false`, los accesos rápidos de demostración del inicio de sesión **no se renderizan**: el servidor nunca los envía al cliente |
| Marcado | Usuarios y sesiones de demostración llevan `is_demo = true` |
| Datos | En workspaces de demostración, jamás mezclados con datos reales |
| Producción | **`DEMO_MODE=true` con `NODE_ENV=production` impide el arranque del proceso** (§3.7) — la protección definitiva no es el 404 de cada ruta, es que producción no puede tener `DEMO_MODE` activo en absoluto |

### 3.7 Contraseñas y restablecimiento

- Hash mediante el algoritmo por defecto de Better Auth. No se implementa criptografía propia (F7).
- **Sin recuperación por autoservicio** (D-28, F6): sin correo, sin enlaces de un solo uso, sin
  preguntas de seguridad.
- **Restablecimiento administrativo** de un solo uso, entregado fuera de banda, con caducidad, que
  revoca todas las sesiones del usuario al aplicarse
  ([`ROLES-AND-PERMISSIONS.md`](../ROLES-AND-PERMISSIONS.md) §9.1).
- Cambiar contraseña revoca todas las sesiones salvo la actual.
- Eventos `user.password_reset_issued` y `user.password_reset_used` en la auditoría.

## 4. Alternativas consideradas

| Alternativa | Evaluación | Veredicto |
|---|---|---|
| **Better Auth `1.6.x`** | Sesiones en base por defecto, cookies `httpOnly`, revocación individual (`revokeSession`), del resto de dispositivos (`revokeOtherSessions`) y total (`revokeSessions`), adaptador de Drizzle para PostgreSQL, autohospedable, sin servicio externo | **Adoptada** |
| **Sesiones a mano** | Control total y ninguna dependencia. Pero es criptografía y gestión de sesiones escritas por una persona sin revisión externa (F7). El riesgo de un fallo sutil supera el de la dependencia | Descartada |
| **Auth.js / NextAuth** | Muy extendida y también autohospedable. Su modelo gira alrededor de proveedores externos y su sesión por defecto es **JWT**; usar sesiones en base es posible pero va a contracorriente. Contradice F1 salvo configuración cuidadosa | Descartada |
| **Lucia** | Encajaba muy bien con este diseño, pero el proyecto se reorientó a material de referencia en lugar de biblioteca mantenida | Descartada |
| **Clerk / Auth0 / WorkOS** | Excelente producto, cero mantenimiento. Contradice F4 de forma frontal: identidad alojada por un tercero, coste por usuario y **dependencia irreversible** — los usuarios viven fuera | Descartada |
| **Supabase Auth** | Arrastra a Supabase como plataforma y su modelo de RLS; el encargo excluye esa dependencia | Descartada |
| **Plugin de organización de Better Auth** | Resolvería membresías "gratis", pero introduce un segundo modelo de autorización en paralelo a `workspace_members` (§3.4 punto 3) | **Descartada expresamente** |
| **`cookieCache` activada** | Menos consultas. Rompe la revocación inmediata (§3.2) | Descartada |
| **JWT como sesión de navegador** | Excluida por el encargo y por F1: un token autocontenido no se puede revocar sin una lista de revocación, que es una sesión en base con más pasos | Descartada |

### 4.1 Riesgo de gobernanza, dicho con claridad

Según su propio blog, **Better Auth se ha incorporado a Vercel**. No invalida la decisión —el
proyecto es de código abierto, se autohospeda, y las sesiones viven en nuestra base— pero **cambia
el perfil de riesgo** y hay que anotarlo, no pasarlo por alto:

- El rumbo del proyecto lo marca ahora una empresa con producto propio de despliegue.
- Existe la posibilidad de que aparezcan funciones que rindan mejor, o solo funcionen bien, en su
  plataforma.

**Mitigación:** ya está en §3.4. Better Auth se usa **solo para autenticación**, tras la superficie
del módulo `identity`, sin sus plugins de organización, y con las sesiones en nuestro PostgreSQL. Si
el rumbo dejara de convenir, se sustituye un módulo. Los usuarios, las membresías y los roles son
nuestros y no se mueven.

Junto con Next.js (`ADR-004`), esto significa que **dos piezas del stack orbitan al mismo actor**.
Es una concentración real y queda registrada como riesgo en
[`CURRENT-STATE.md`](../CURRENT-STATE.md) §8.

## 5. Consecuencias

**Positivas**

- Revocación inmediata y comprobable: sin caché, la base es la verdad.
- El workspace no puede filtrarse por la sesión: no está ahí.
- La autorización del producto permanece intacta e independiente de la biblioteca.
- Sin proveedor de identidad externo: los usuarios son datos propios.
- No se escribe criptografía a mano.

**Negativas**

- Una consulta a la base por petición autenticada. Aceptado; es el precio de F1.
- Dependencia de una biblioteca joven, ahora bajo una empresa (§4.1).
- Al no usar sus plugins de organización, hay que escribir el código de membresías. Es deliberado:
  ese código **es** el producto.
- Sin recuperación de contraseña, un olvido exige intervención manual. Aceptado para el MVP.

## 6. Reglas derivadas

| # | Regla |
|---|---|
| T6-R1 | La sesión se valida contra la base en cada petición autenticada. Sin caché de sesión en cookie. |
| T6-R2 | La tabla de sesiones **no** contiene workspace, rol ni permiso alguno. |
| T6-R3 | Ningún módulo de dominio consulta las tablas de Better Auth; se pasa por `identity`. |
| T6-R4 | No se usan los plugins de organización, equipo ni permisos de Better Auth. |
| T6-R5 | Las cookies de sesión son `httpOnly`, `secure` fuera de desarrollo y `SameSite=Lax` explícito. |
| T6-R6 | El token de sesión es opaco: no transporta datos de usuario ni de autorización. |
| T6-R7 | La preferencia de "último workspace" nunca autoriza; solo sugiere destino. |
| T6-R8 | `DEMO_MODE` es variable de servidor; con `DEMO_MODE=false` sus rutas responden **404 antes de ejecutar lógica** y su interfaz no se renderiza — no se afirma que las rutas se desregistren dinámicamente (§3.6). |
| T6-R9 | Una imagen de producción con `DEMO_MODE=true` falla al arrancar. |
| T6-R10 | Cambiar contraseña o aplicar un restablecimiento revoca las demás sesiones. |
| T6-R11 | Sin JWT como sesión de navegador, en ninguna circunstancia. |

## 7. Criterios verificables

| # | Criterio | Cómo se comprueba |
|---|---|---|
| T6-1 | Revocar una sesión corta el acceso en la **petición siguiente** | Prueba de integración contra PostgreSQL real |
| T6-2 | La revocación global cierra todas las sesiones del usuario | Prueba de integración |
| T6-3 | La cookie de sesión tiene `HttpOnly`, `Secure` y `SameSite=Lax` | Prueba E2E que inspecciona la cabecera `Set-Cookie` |
| T6-4 | La tabla de sesiones no tiene columna de workspace ni de rol | Prueba sobre el catálogo de la base |
| T6-5 | Manipular la cookie invalida la sesión | Prueba de integración |
| T6-6 | Con `DEMO_MODE` desactivado, los endpoints de demostración devuelven **404** | Prueba de integración con ambas configuraciones |
| T6-7 | La aplicación no arranca en producción con `DEMO_MODE=true` | Prueba de arranque |
| T6-8 | Una mutación desde otro origen se rechaza | Prueba E2E — **y verificación explícita de qué aporta Better Auth frente a lo que hay que añadir** (§3.3) |
| T6-9 | Ningún archivo fuera de `modules/identity` importa Better Auth | Regla de linting |
| T6-10 | Un usuario autenticado sin membresía recibe **404** en todo el workspace | Prueba de aislamiento (`ADR-002` A3) |

## 8. Condiciones de revisión

- **El rumbo de Better Auth deja de convenir al autohospedaje** → sustituir dentro de `identity`.
- **Se necesita acceso federado o SSO para un cliente corporativo** → revisar §3.1, no ampliar roles.
- **`OD-09` se cierra con correo** → replantear la recuperación de contraseña con ADR propio.
- **Aparece un requisito real de rendimiento en validación de sesión** → revisar §3.2 con medidas,
  no por precaución.
- **Se necesita autenticación entre servicios** → es un caso distinto del de navegador; podría usar
  tokens sin contradecir T6-R11, pero exige ADR.

## 9. Fuentes oficiales consultadas

Consultadas el 2026-07-28:

- [Better Auth — Session Management (sesiones en base, revocación, `cookieCache`)](https://better-auth.com/docs/concepts/session-management)
- [Better Auth — Cookies (`httpOnly`, `secure`, configuración)](https://better-auth.com/docs/concepts/cookies)
- [Better Auth — Drizzle ORM Adapter](https://better-auth.com/docs/adapters/drizzle)
- [Better Auth — Database](https://better-auth.com/docs/concepts/database)
- [Better Auth — Installation](https://better-auth.com/docs/installation)
- [Better Auth — Changelog](https://better-auth.com/changelog)
- [Better Auth — Blog (anuncio de incorporación a Vercel; actualización de seguridad de junio de 2026)](https://better-auth.com/blog)
- [better-auth/better-auth — Releases](https://github.com/better-auth/better-auth/releases)
