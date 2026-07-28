# ADR-007 · Runtime y despliegue

- **Estado:** Aceptada
- **Fecha:** 2026-07-28
- **Contexto de la decisión:** Iteración 1 (decisiones técnicas)
- **Relacionada con:** [`ADR-001`](ADR-001-modular-monolith.md) (un artefacto),
  [`ADR-004`](ADR-004-application-stack.md), [`ADR-005`](ADR-005-persistence-and-migrations.md)

---

## 1. Contexto

[`ADR-001`](ADR-001-modular-monolith.md) exige **un artefacto desplegable** y, en su aclaración *a*,
que el proceso **no guarde estado con autoridad en memoria**, para que la réplica horizontal siga
siendo posible aunque el MVP corra en una sola instancia.

El encargo impone además una restricción que conviene tomar en serio: **sin dependencia obligatoria
de Vercel, Supabase ni DigitalOcean**. No prohíbe usarlos; prohíbe *necesitarlos*.

## 2. Fuerzas y restricciones

| # | Fuerza | Implicación |
|---|---|---|
| F1 | Producto personal, un mantenedor | El despliegue debe caber en la cabeza de una persona |
| F2 | Sin plataforma obligatoria | Artefacto ejecutable en cualquier sitio que corra contenedores |
| F3 | Desarrollo cómodo | Recarga en caliente inmediata; nada de reconstruir imágenes para ver un cambio |
| F4 | Pruebas contra PostgreSQL real (`ADR-008`) | Base local reproducible y desechable |
| F5 | La base debe poder pasar a administrada | Solo cambia `DATABASE_URL` (`ADR-005` T5-R1) |
| F6 | Réplica horizontal posible | Sin estado en el proceso |
| F7 | El cronómetro es autoridad del servidor (D-16) | Su estado vive en la base, no en memoria |

## 3. Decisión

**Node.js LTS como runtime, Next.js en modo `standalone` dentro de una imagen Docker propia,
PostgreSQL local mediante Docker Compose, y desarrollo con `pnpm dev` fuera del contenedor.**

### 3.1 Runtime

| Aspecto | Decisión |
|---|---|
| Runtime | **Node.js**, línea **24.x (Active LTS, "Krypton")** |
| Mínimo | **Node.js 20.9**, por ser el mínimo de Next.js — pero no es el objetivo |
| Producción y CI | La **misma** línea mayor que en desarrollo. Se fija en `.nvmrc` y en la imagen |
| Runtime de la aplicación | **Node.js**. Sin *Edge Runtime* (`ADR-004` T4-R7) |

**Por qué 24 y no 26.** Node.js 26 salió en abril de 2026 y es **Current**: no entra en LTS hasta
octubre de 2026. Node.js 24 está en **Active LTS** con fin de vida en abril de 2028. Para una base
que va a sostener la iteración 2 —la del aislamiento— se elige la línea con soporte largo ya
declarado, no la que todavía puede cambiar.

**Plan de actualización:** revisar el paso a Node.js 26 cuando entre en LTS (octubre de 2026). A
partir de ese momento el calendario de Node.js pasa a **una versión mayor al año, en abril, con
promoción a LTS en octubre y sin distinción par/impar**, lo que hace previsible la cadencia.

### 3.2 Desarrollo

```
PostgreSQL   →  contenedor, vía Docker Compose
Aplicación   →  pnpm dev, en la máquina, fuera del contenedor
```

La aplicación **no** se ejecuta en contenedor durante el desarrollo. Meterla dentro cuesta recarga en
caliente, velocidad y comodidad de depuración (F3) sin aportar nada: lo que de verdad debe ser
reproducible es la **base de datos**, no el runtime de Node.

Docker Compose levanta **solo PostgreSQL** en el MVP. Detalle operativo en
[`ENVIRONMENTS.md`](../ENVIRONMENTS.md).

### 3.3 Artefacto de producción

**Imagen Docker propia, multi-etapa, con `output: 'standalone'`.**

`standalone` hace que Next.js copie a `.next/standalone` solo los archivos necesarios —incluida la
parte de `node_modules` que se usa de verdad— y emita un `server.js` mínimo. La imagen final no
instala dependencias.

**Advertencia documentada, y es fácil de olvidar:** `standalone` **no copia** `public/` ni
`.next/static`. Hay que copiarlos explícitamente a `standalone/public` y `standalone/.next/static`
tras la construcción, o la aplicación se sirve sin estáticos. Queda como criterio verificable T7-4.

Forma de la imagen:

| Etapa | Contenido |
|---|---|
| `deps` | Instalación con `pnpm install --frozen-lockfile` |
| `build` | `pnpm build` con `output: 'standalone'` |
| `runner` | Base slim de Node 24, usuario **no root**, `.next/standalone` + `public` + `.next/static` |

Arranque: `node server.js`, con `PORT` y `HOSTNAME` por entorno.

### 3.4 Migraciones en el despliegue

Las migraciones (`ADR-005` §3.3) se ejecutan como **paso previo y separado**, nunca al arrancar la
aplicación.

Motivo: si migrar formara parte del arranque, con varias réplicas dos procesos competirían por
aplicar la misma migración, y un fallo de migración se confundiría con un fallo de arranque. Además,
`ADR-001` aclaración *a* deja la puerta abierta a la réplica: hay que comportarse desde ya como si
hubiera más de una instancia (F6).

Orden de despliegue: **migrar → verificar → arrancar la versión nueva.**

### 3.5 Configuración

- Toda la configuración entra por **variables de entorno**, validadas con Zod **al arrancar**. Si
  falta o es inválida una variable requerida, el proceso **no arranca**; no se degrada en silencio.
- `DATABASE_URL` es el único contrato de base de datos (`ADR-005` T5-R1).
- Ningún secreto en la imagen ni en el repositorio. `.env.example` documenta las claves, nunca los
  valores.
- Variables mínimas y sus reglas: [`ENVIRONMENTS.md`](../ENVIRONMENTS.md).

### 3.6 Estado fuera del proceso

Consecuencia directa de F6, F7 y `ADR-001` aclaración *a*:

| Prohibido en el proceso | Dónde vive |
|---|---|
| Sesiones en memoria | PostgreSQL (`ADR-006`) |
| Estado del cronómetro | `work_sessions` + `work_session_segments` |
| Temporizadores o trabajos programados en memoria | Fuera de alcance en el MVP; exigiría ADR |
| Caché con autoridad | No existe. Cualquier caché es descartable y reconstruible |
| Ficheros subidos en disco local | Sin adjuntos en el MVP (`OD-05`) |

### 3.7 Ruta futura, sin comprometerse hoy

| Pieza | Hoy | Mañana |
|---|---|---|
| Proxy inverso y TLS | No hace falta en local | **Caddy** delante del contenedor: TLS automático, configuración corta |
| Base de datos | Contenedor local | **PostgreSQL administrado**, cambiando `DATABASE_URL` |
| Alojamiento | Máquina de desarrollo | Cualquier host con contenedores |

Ninguna de las tres exige cambiar código. Es el criterio con el que se han tomado estas decisiones.

**Caddy** se prefiere a Nginx por F1: menos configuración y TLS automático. No se instala todavía
porque no hay nada que exponer.

## 4. Neutralidad de plataforma

El encargo exige no depender de un proveedor. Concreción de qué significa aquí:

| Regla | Consecuencia |
|---|---|
| Sin *Edge Runtime* ni funciones dependientes de plataforma | `ADR-004` T4-R7 |
| Sin almacenamiento de blobs propietario | Sin adjuntos en el MVP (`OD-05`); si llegan, S3-compatible o disco |
| Sin colas ni cron gestionados | Fuera de alcance |
| Sin ISR dependiente de red de borde | El contenido del cliente es dinámico y autorizado; no se cachea en borde |
| Sin SDK de plataforma en el código | Ninguno |
| `DATABASE_URL` estándar | Cualquier PostgreSQL sirve |

**Criterio de comprobación, formulado de forma que se pueda fallar:** la aplicación debe construirse
y funcionar por completo —incluidas migraciones, autenticación e interfaz de cliente— **en una
máquina sin conexión a ningún servicio de terceros, salvo su propio PostgreSQL**. Si algún día deja
de cumplirse, hay dependencia de plataforma aunque nadie la haya declarado.

Desplegar en Vercel, DigitalOcean o donde sea sigue siendo **posible**. Lo que no puede es ser
**necesario**.

## 5. Alternativas consideradas

| Alternativa | Evaluación | Veredicto |
|---|---|---|
| **Node.js 24 LTS** | Soporte hasta abril de 2028, ya en Active LTS, cubre de sobra el mínimo de Next.js | **Adoptada** |
| **Node.js 26 (Current)** | Más reciente, pero no es LTS hasta octubre de 2026. Innecesario para el MVP | Descartada por ahora |
| **Node.js 22** | En mantenimiento; elegir hoy una línea que ya sale del ciclo activo no tiene sentido | Descartada |
| **Bun como runtime de producción** | Arranque y ejecución rápidos. Pero añade una variable en la pieza más difícil de depurar, y Next.js está soportado de forma primaria sobre Node. Sin ventaja **material** (F1) | Descartada |
| **Deno** | Mismo razonamiento, con más fricción de ecosistema | Descartada |
| **`output: 'standalone'` + Docker** | Imagen pequeña, sin instalar dependencias, ejecutable en cualquier sitio (F2) | **Adoptada** |
| **`next start` con `node_modules` completo** | Más simple, imagen mucho mayor y con superficie innecesaria | Descartada |
| **Exportación estática** | Imposible: todo el producto es dinámico y autorizado en servidor | Descartada |
| **Aplicación en contenedor también en desarrollo** | Mayor paridad con producción, a costa de recarga en caliente y velocidad (F3). La reproducibilidad que importa es la de la base | Descartada |
| **PostgreSQL instalado en la máquina** | Sin Docker, pero versión y datos divergen entre máquinas y ensucia el sistema. Compose da una base desechable (F4) | Descartada |
| **Despliegue en Vercel como destino primario** | Cómodo, pero convierte una opción en dependencia y empuja hacia funciones de plataforma | Descartada como *destino primario*; sigue siendo posible |
| **Supabase como base** | Da PostgreSQL, pero arrastra su autenticación y su modelo de RLS, en conflicto con `ADR-006` §3.4 | Descartada |
| **Kubernetes** | Desproporcionado para una instancia y un mantenedor | Descartada |
| **Nginx como proxy** | Válido; Caddy pide menos configuración y gestiona TLS solo (F1) | Descartada frente a Caddy |

## 6. Consecuencias

**Positivas**

- Un artefacto, ejecutable en cualquier host con contenedores.
- Desarrollo rápido: la base en contenedor, la aplicación nativa.
- Cambiar a PostgreSQL administrado es una variable de entorno.
- Sin estado en el proceso: la réplica horizontal sigue siendo posible sin rediseñar.
- Migrar como paso separado evita la carrera entre réplicas.

**Negativas**

- La imagen hay que mantenerla: base, parches, usuario no root. En una plataforma gestionada eso no
  existiría.
- `standalone` exige copiar `public` y `.next/static` a mano; olvidarlo rompe los estáticos de forma
  silenciosa (T7-4).
- Ligera divergencia entre desarrollo (nativo) y producción (contenedor). Se acota comprobando la
  imagen en CI.
- Sin plataforma gestionada, TLS, copias y supervisión son responsabilidad propia. Aceptado: hoy no
  hay nada expuesto.

## 7. Reglas derivadas

| # | Regla |
|---|---|
| T7-R1 | Desarrollo, CI y producción usan la **misma línea mayor** de Node.js, fijada en `.nvmrc`. |
| T7-R2 | La aplicación corre en runtime de Node.js. Sin *Edge Runtime*. |
| T7-R3 | Toda la configuración entra por variables de entorno validadas con Zod al arrancar. |
| T7-R4 | Sin configuración válida, el proceso **no arranca**. Nunca se degrada en silencio. |
| T7-R5 | Ningún secreto en la imagen ni en el repositorio. |
| T7-R6 | Las migraciones son un paso separado y previo al arranque. |
| T7-R7 | El proceso no guarda estado con autoridad en memoria. |
| T7-R8 | La imagen corre como usuario **no root**. |
| T7-R9 | Ningún SDK específico de proveedor en el código de la aplicación. |
| T7-R10 | Docker Compose levanta servicios de apoyo, no la aplicación en desarrollo. |

## 8. Criterios verificables

| # | Criterio | Cómo se comprueba |
|---|---|---|
| T7-1 | La imagen se construye y arranca sin acceso a servicios de terceros | Construcción y arranque en CI, solo con PostgreSQL local |
| T7-2 | La aplicación funciona apuntando a dos PostgreSQL distintos cambiando solo `DATABASE_URL` | Prueba de integración con dos instancias |
| T7-3 | Falta una variable requerida → el proceso termina con error claro | Prueba de arranque |
| T7-4 | Los estáticos y `public/` se sirven desde la imagen | Prueba E2E contra el contenedor que pide un recurso estático |
| T7-5 | La imagen no corre como root | Inspección de la imagen en CI |
| T7-6 | Ninguna variable de entorno específica de plataforma es requerida | Revisión del esquema Zod de configuración |
| T7-7 | Migrar y arrancar son pasos separados y ordenables | Guion de despliegue en CI |
| T7-8 | Dos procesos de la aplicación contra la misma base se comportan igual | Prueba de integración con dos instancias, valida T7-R7 |

## 9. Condiciones de revisión

- **Node.js 26 entra en LTS (octubre de 2026)** → evaluar el salto de línea.
- **Aparecen adjuntos (`OD-05`)** → decidir almacenamiento; primera vía de dependencia real.
- **Se necesita trabajo programado** (recordatorios, informes) → ADR nuevo; hoy nada lo justifica.
- **El producto se expone en internet** → materializar Caddy, TLS, copias y supervisión.
- **Se necesita más de una instancia** → verificar T7-8 antes de replicar, no después.

## 10. Fuentes oficiales consultadas

Consultadas el 2026-07-28:

- [Node.js — Releases (estado de las líneas 26, 24 y 22)](https://nodejs.org/en/about/previous-releases)
- [Node.js — Evolving the Node.js Release Schedule](https://nodejs.org/en/blog/announcements/evolving-the-nodejs-release-schedule)
- [Node.js 26.0.0 (Current) — anuncio](https://nodejs.org/en/blog/release/v26.0.0)
- [nodejs/Release — calendario de soporte](https://github.com/nodejs/Release/blob/main/schedule.json)
- [Next.js — `output` (modo `standalone`, advertencia sobre `public` y `.next/static`)](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Next.js — Installation (Node.js mínimo 20.9)](https://nextjs.org/docs/app/getting-started/installation)
- [PostgreSQL — Versioning Policy](https://www.postgresql.org/support/versioning/)
