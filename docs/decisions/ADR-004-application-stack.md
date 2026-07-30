# ADR-004 · Stack de aplicación

- **Estado:** Aceptada
- **Fecha:** 2026-07-28
- **Contexto de la decisión:** Iteración 1 (decisiones técnicas)
- **Relacionada con:** [`ADR-001`](ADR-001-modular-monolith.md) (forma del sistema),
  [`ADR-007`](ADR-007-runtime-and-deployment.md) (runtime)

---

## 1. Contexto

[`ADR-001`](ADR-001-modular-monolith.md) fijó la forma: **un artefacto desplegable, módulos con
superficie pública, autorización transversal, unidad de trabajo compartida**. Falta elegir con qué
se construye.

El producto es una aplicación web con dos interfaces sobre los mismos datos
([`UI-WIREFRAMES.md`](../UI-WIREFRAMES.md)), objetivo **laptop 1366 × 768 y móvil 390 × 844**, un
usuario que escribe y unos pocos que leen. Lo desarrolla y mantiene una sola persona.

## 2. Fuerzas y restricciones

| # | Fuerza | Implicación |
|---|---|---|
| F1 | Un solo mantenedor | Menos piezas, ecosistema con respuestas fáciles de encontrar |
| F2 | Autorización crítica en servidor ([`ADR-002`](ADR-002-workspace-boundary.md)) | El framework debe permitir que **ningún dato salga sin pasar por la capa de acceso**; nada de consultas desde el navegador |
| F3 | Dos aplicaciones, mismo dominio (`/w` y `/c`) | Enrutado por segmentos con layouts independientes |
| F4 | Sin dependencia obligatoria de una plataforma de despliegue | Debe poder ejecutarse en un contenedor propio |
| F5 | Cronómetro persistente, autoridad del servidor (D-16) | El estado del temporizador vive en el servidor; el cliente lo refleja |
| F6 | El modelo tiene invariantes finas | Tipado estricto de extremo a extremo, sin `any` en las fronteras |

## 3. Decisión

**Next.js con App Router, en TypeScript estricto, como monolito modular servido por Node.js, con
pnpm como gestor de paquetes.**

### 3.1 Componentes

| Pieza | Elección | Línea |
|---|---|---|
| Framework | **Next.js**, App Router | `16.2.x` (estable actual; `16.3` próxima) |
| Biblioteca de UI | **React** | `19.x` — el App Router usa canary de React con las funciones estables de 19 |
| Lenguaje | **TypeScript** estricto | `5.5+` (mínimo de Next.js: `5.1`; mínimo de Zod: `5.5`) |
| Gestor de paquetes | **pnpm** | Oficialmente soportado por `create-next-app` |
| Estilos | **Tailwind CSS** | `4.x` |
| Componentes | **shadcn/ui**, copiados al repositorio | Sin versión de runtime: es código propio |
| Validación | **Zod** | `4.x` — ver [`ADR-005`](ADR-005-persistence-and-migrations.md) §7 y §3.5 |

### 3.2 TypeScript: qué significa "estricto"

`strict: true` es el mínimo, no el objetivo. Además:

```
"strict": true,
"noUncheckedIndexedAccess": true,
"exactOptionalPropertyTypes": true,
"noImplicitOverride": true,
"noFallthroughCasesInSwitch": true
```

Motivo de `noUncheckedIndexedAccess`: el modelo está lleno de accesos por clave a resultados de
consulta. Sin esa opción, un `rows[0]` inexistente se tipa como presente y el fallo aparece en
producción.

`any` está prohibido en las fronteras de módulo. Dentro de un módulo, `unknown` + validación.

### 3.3 Disposición modular

Los módulos de `ADR-001` (`identity`, `workspaces`, `work`, `publishing`, `collaboration`, `audit`)
son **directorios con superficie pública explícita**, no paquetes separados:

```
src/
├── app/                      # solo enrutado y composición de UI
│   ├── (owner)/w/[workspaceId]/...
│   └── (client)/c/[workspaceId]/...
├── modules/
│   ├── identity/
│   │   ├── index.ts          # ← única superficie pública del módulo
│   │   └── internal/         # nadie importa de aquí desde fuera
│   ├── workspaces/
│   ├── work/
│   ├── publishing/
│   ├── collaboration/
│   └── audit/
├── application/              # servicios de aplicación (orquestadores, ADR-001 §b)
│   ├── access/               # resolución de acceso y WorkspaceScope
│   └── authorization/        # capacidades, matriz, motor puro (ADR-009)
├── platform/                 # acceso a datos, transacciones, configuración
│   ├── database/
│   └── http/                 # traducción de resultados a Response (ADR-009 §6)
└── ui/                       # componentes shadcn/ui y compartidos
```

`platform/http/` se añadió en la iteración 2D. `platform/` era «acceso a datos, transacciones,
configuración»; ahora incluye también la traducción a HTTP, que es infraestructura sin dominio y por
eso no cabe en `application/`. La dependencia va en **un solo sentido**: `platform/http` conoce el
vocabulario de resultados de la aplicación; la capa de aplicación no conoce HTTP, y una regla de
linting lo impide. Usa `Response` estándar, nunca `NextResponse`.

**Regla que se hace cumplir con linting:** solo se importa `modules/<x>` (que resuelve a su
`index.ts`). Importar `modules/<x>/internal/...` desde fuera del módulo es un error de compilación
del linter, no una convención.

`app/` **no contiene lógica de dominio**. Es enrutado y composición. Toda lectura pasa por un
servicio de aplicación.

### 3.4 Reglas de frontera servidor/cliente

- Todo acceso a datos ocurre en **componentes de servidor** o en *Route Handlers*. Ningún módulo de
  dominio se importa jamás en un componente cliente.
- Los componentes cliente reciben **DTO ya filtrados** por la capa de autorización. Nunca reciben
  una fila de base de datos.
- Las mutaciones pasan por *Server Actions* o *Route Handlers*, y **siempre** revalidan la
  autorización en servidor. Que la interfaz oculte un botón no es un punto de aplicación
  ([`ROLES-AND-PERMISSIONS.md`](../ROLES-AND-PERMISSIONS.md) §10).

### 3.5 Sobre las funciones específicas de la plataforma

Se usa Next.js como framework, **no como puerta a una plataforma**. Quedan excluidas del MVP las
funciones cuyo comportamiento cambia según dónde se despliegue: almacenamiento propietario de blobs,
colas gestionadas, ISR dependiente de red de borde y *Edge Runtime*. Todo el código de servidor
corre en **runtime de Node.js**. Ver [`ADR-007`](ADR-007-runtime-and-deployment.md) §6.

## 4. Alternativas consideradas

| Alternativa | Evaluación | Veredicto |
|---|---|---|
| **Next.js + App Router** | Servidor y cliente en un artefacto; componentes de servidor mantienen los datos del lado seguro (F2); enrutado por segmentos encaja con `/w` y `/c` (F3); `output: 'standalone'` permite contenedor propio (F4); Turbopack estable por defecto desde v16 | **Adoptada** |
| **Remix / React Router framework** | Modelo de carga y mutación excelente y menos acoplado a un proveedor. Ecosistema y volumen de documentación menores; ventaja no **material** para este producto (F1) | Descartada |
| **SvelteKit** | Más ligero y con menos ceremonia. Obligaría a descartar shadcn/ui y a que el mantenedor cambie de ecosistema. Sin ventaja material | Descartada |
| **API separada (NestJS/Fastify) + SPA** | Dos artefactos, dos despliegues, CORS y contratos duplicados. **Contradice `ADR-001`**: la unidad de trabajo compartida entre módulos deja de ser trivial | Descartada |
| **Next.js con Pages Router** | Estable pero en modo mantenimiento; los componentes de servidor son justo el mecanismo que refuerza F2 | Descartada |
| **TypeScript no estricto o JavaScript** | Contradice F6. El coste de tipar es menor que el de un fallo de visibilidad | Descartada |
| **npm / yarn / bun** | pnpm: enlazado por contenido, almacén compartido, `--frozen-lockfile` estricto por defecto en CI. Bun como runtime añadiría una variable no necesaria (ver `ADR-007`) | pnpm adoptado |
| **CSS Modules / vanilla-extract** en vez de Tailwind | Válidos, pero shadcn/ui asume Tailwind y el diseño aún no tiene sistema visual propio; Tailwind evita inventarlo ahora | Descartada |
| **MUI / Chakra / Mantine** en vez de shadcn/ui | Son dependencias con su propio ciclo de vida y su propia opinión visual. shadcn/ui **copia el código al repositorio**: sin servicio externo, sin cuenta, sin versión que actualizar en contra | Descartada |

### 4.1 Nota sobre shadcn/ui

No es una biblioteca de componentes: es un mecanismo de distribución de código. Los componentes se
copian al repositorio y pasan a ser **código propio, revisable y modificable**. No hay servicio de
runtime ni cuenta. Esto es exactamente lo que pedía el encargo y elimina una clase entera de riesgo
de proveedor: una vez copiado, el proyecto no depende de que shadcn/ui siga existiendo.

Consecuencia asumida: **las correcciones aguas arriba no llegan solas**. Los componentes copiados se
mantienen como código propio.

## 5. Consecuencias

**Positivas**

- Un solo artefacto, coherente con `ADR-001`.
- Los componentes de servidor hacen que la vía por defecto sea la segura: los datos se filtran antes
  de existir en el cliente.
- El enrutado por segmentos hace visible en el árbol de archivos la separación `/w` ↔ `/c`.
- TypeScript estricto convierte varias invariantes del modelo en errores de compilación.
- shadcn/ui evita una dependencia de UI con opinión propia.

**Negativas**

- Next.js lo gobierna Vercel. Se mitiga en `ADR-007` §6 con la restricción de no usar funciones
  específicas de plataforma y con `output: 'standalone'`. **No se elimina el riesgo: se acota.**
- El App Router tiene un modelo mental exigente (servidor/cliente, caché, revalidación). Es coste de
  aprendizaje real para un solo mantenedor.
- Tailwind v4 y Next.js 16 tienen **líneas base de navegador distintas**; ver §6 R-T4.
- Los componentes copiados de shadcn/ui son mantenimiento propio.

## 6. Reglas derivadas

| # | Regla |
|---|---|
| T4-R1 | `app/` no contiene lógica de dominio. Solo enrutado y composición. |
| T4-R2 | Un módulo se importa únicamente por su `index.ts`. `internal/` es inaccesible desde fuera. |
| T4-R3 | Ningún módulo de dominio se importa en un componente cliente. |
| T4-R4 | Un componente cliente recibe DTO, nunca filas de base de datos. |
| T4-R5 | Toda mutación revalida la autorización en servidor, con independencia de lo que muestre la UI. |
| T4-R6 | Prohibido `any` en fronteras de módulo; `unknown` + validación. |
| T4-R7 | Sin *Edge Runtime* ni funciones dependientes de plataforma en el MVP. |
| T4-R8 | Línea base de navegador efectiva: **la más estricta** de Next.js y Tailwind (ver R-T4). |

**R-T4 — línea base de navegador.** Next.js 16 declara Chrome 111+, Edge 111+, Firefox 111+ y
Safari 16.4+. Tailwind v4 exige Chrome 111+, Firefox **128+** y Safari 16.4+ porque depende de
`@property` y `color-mix()`. La línea base efectiva del producto es por tanto
**Chrome/Edge 111+, Firefox 128+, Safari 16.4+**, y así debe documentarse de cara al cliente.

## 7. Criterios verificables

| # | Criterio | Cómo se comprueba |
|---|---|---|
| T4-1 | Ninguna importación cruza a `internal/` de otro módulo | Regla de linting que falla la compilación |
| T4-2 | Ningún componente cliente importa un módulo de dominio | Regla de linting sobre archivos con `'use client'` |
| T4-3 | `tsc --noEmit` pasa con las cinco opciones de §3.2 | CI |
| T4-4 | Cero apariciones de `any` en `modules/*/index.ts` y `application/**` | Linting |
| T4-5 | La aplicación arranca y opera sin variables de entorno específicas de ninguna plataforma | Ejecución en contenedor local |
| T4-6 | Las pantallas cumplen en 1366 × 768 y 390 × 844 | Pruebas de Playwright con esos viewports ([`ADR-008`](ADR-008-testing-strategy.md)) |

## 8. Condiciones de revisión

Reconsiderar si: Next.js introduce una función necesaria que solo funciona en Vercel; el App Router
cambia de forma que rompa el modelo de componentes de servidor; aparece un segundo desarrollador con
un ecosistema distinto; o el producto deja de ser una aplicación web.

**No** se reconsidera por la aparición de un framework nuevo más rápido: la velocidad no es una
fuerza en §2.

## 9. Fuentes oficiales consultadas

Consultadas el 2026-07-28:

- [Next.js — Installation (requisitos de sistema, TypeScript mínimo, gestores de paquetes)](https://nextjs.org/docs/app/getting-started/installation) — v16.2.12, actualizada 2026-07-22
- [Next.js 16 — notas de versión](https://nextjs.org/blog/next-16)
- [Next.js — Docs: App Router](https://nextjs.org/docs/app)
- [Next.js — Upgrading: Version 16](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Tailwind CSS — Compatibility (línea base de navegador)](https://tailwindcss.com/docs/compatibility)
- [Tailwind CSS v4.0 — anuncio](https://tailwindcss.com/blog/tailwindcss-v4)
- [shadcn/ui — Docs (modelo de distribución de código)](https://ui.shadcn.com/docs)
- [Zod — Intro (requisitos de TypeScript)](https://zod.dev/)
