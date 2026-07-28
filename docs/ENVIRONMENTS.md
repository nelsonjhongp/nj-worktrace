# ENVIRONMENTS

Entornos, configuración y contrato de conexión.

> Referencia operativa. Las decisiones y su porqué están en
> [`ADR-005`](decisions/ADR-005-persistence-and-migrations.md),
> [`ADR-006`](decisions/ADR-006-authentication-and-sessions.md) y
> [`ADR-007`](decisions/ADR-007-runtime-and-deployment.md).

**Nada de esto existe todavía.** Es la especificación que seguirá la iteración 2.

---

## 1. Los tres entornos

| | Desarrollo | Pruebas | Producción |
|---|---|---|---|
| Aplicación | `pnpm dev`, nativa | Proceso de prueba | Imagen Docker, `node server.js` |
| PostgreSQL | Contenedor local (Compose) | Bases desechables por trabajador | Administrado o autohospedado |
| Migraciones | Manual, a demanda | Automáticas al preparar la base plantilla | Paso previo al despliegue |
| `NODE_ENV` | `development` | `test` | `production` |
| `DEMO_MODE` | Opcional | Solo en las pruebas que lo verifican | **Prohibido** — impide el arranque |
| Cookies `secure` | No | No | Sí |
| Datos | Sintéticos | Sintéticos, efímeros | Reales |

**Los tres usan la misma línea mayor de Node.js** (T7-R1) y **el mismo camino de migración**
(`drizzle-kit migrate`). Lo único que cambia entre ellos es la configuración.

## 2. Variables de entorno

Todas se validan con **Zod al arrancar**. Si falta una requerida o su valor es inválido, el proceso
**termina con error explicando cuál** (T7-R4). No hay valores por defecto silenciosos para nada que
afecte a seguridad o a datos.

| Variable | Requerida | Formato | Notas |
|---|---|---|---|
| `DATABASE_URL` | Sí | `postgres://usuario:clave@host:puerto/base` | **Único** contrato de base de datos (T5-R1) |
| `NODE_ENV` | Sí | `development` \| `test` \| `production` | |
| `APP_URL` | Sí | URL absoluta | Origen público; usado por Better Auth |
| `AUTH_SECRET` | Sí | ≥ 32 bytes aleatorios | Distinto en cada entorno. Nunca en el repositorio |
| `DEMO_MODE` | No | `true` \| `false` | Por defecto `false`. **`true` con `NODE_ENV=production` → el arranque falla** (T7-R9) |
| `PORT` | No | entero | Por defecto 3000 |
| `HOSTNAME` | No | host | `0.0.0.0` en contenedor |
| `LOG_LEVEL` | No | `debug` \| `info` \| `warn` \| `error` | Por defecto `info` |

Reglas:

- **Ningún secreto lleva prefijo público.** Una variable expuesta al navegador no puede contener
  nada que no sea público, por definición.
- `.env.example` documenta **las claves, nunca los valores**.
- `.env*` está fuera del control de versiones, salvo `.env.example`.
- Los secretos de producción viven en el gestor de secretos del host, no en la imagen (T7-R5).

## 3. `DATABASE_URL` como frontera

El motivo de que sea el único contrato es que pasar de local a administrado no cambie código
(punto 9 de la prueba de compatibilidad, [`TECHNICAL-FOUNDATION.md`](TECHNICAL-FOUNDATION.md) §4):

```
desarrollo   postgres://njwt:njwt@localhost:5432/njworktrace
pruebas      postgres://njwt:njwt@localhost:5432/njworktrace_test_w3   (por trabajador)
producción   postgres://usuario:clave@host-administrado:5432/njworktrace?sslmode=require
```

Requisitos que impone esta frontera:

1. Ningún componente lee credenciales por otra vía.
2. Ninguna extensión de PostgreSQL fuera de las habituales en servicios administrados (T5-R10).
3. Ninguna operación en tiempo de ejecución exige superusuario.
4. TLS se controla por parámetro de la cadena, no por código.

## 4. Desarrollo

**PostgreSQL en contenedor; aplicación nativa.** No al revés (ADR-007 §3.2).

Servicios que levanta Compose en el MVP: **solo PostgreSQL**. Con volumen con nombre para que los
datos sobrevivan a un reinicio, y comprobación de salud para que las migraciones no se lancen antes
de que la base acepte conexiones.

Secuencia de puesta en marcha, cuando exista el andamiaje:

```
1. levantar PostgreSQL          (Compose)
2. copiar .env.example a .env   y rellenar
3. pnpm install
4. aplicar migraciones
5. pnpm dev
```

Reinicio limpio: destruir el volumen y repetir desde el paso 1. La base de desarrollo es
**desechable por diseño**; nada que importe vive solo ahí.

`drizzle-kit push` está permitido **únicamente** contra esta base, mientras se explora un cambio de
esquema. Lo que se confirma en el repositorio es siempre una migración generada y revisada
(T5-R6, T5-R7).

## 5. Pruebas

Detalle completo en [`TESTING.md`](TESTING.md). Lo relevante aquí:

- Misma instancia de PostgreSQL que en desarrollo; **bases distintas**.
- Una base plantilla con todas las migraciones aplicadas; una base por trabajador creada a partir
  de ella.
- Las bases de los trabajadores se destruyen al terminar. Ninguna sobrevive entre ejecuciones.
- `DEMO_MODE` desactivado, salvo en las pruebas que verifican precisamente su ausencia (T8-R10).

## 6. Producción

- Imagen Docker con `output: 'standalone'`, usuario no root (ADR-007 §3.3).
- **Migrar → verificar → arrancar.** Nunca migrar dentro del arranque (T7-R6).
- Configuración por variables de entorno del host.
- Sin `DEMO_MODE`: si está a `true`, el proceso no arranca.
- Cookies `Secure` y `HttpOnly`, `SameSite=Lax` (T6-R5).
- Detrás de **Caddy** cuando se exponga públicamente. Hoy no hay nada expuesto.

### 6.1 Lo que todavía no está resuelto

No bloquea la iteración 2, pero debe resolverse antes de que haya datos reales:

| Asunto | Estado |
|---|---|
| Copias de seguridad y **prueba de restauración** | Sin decidir. Una copia que no se ha restaurado nunca no es una copia |
| Supervisión y alertas | Sin decidir |
| Registro estructurado y retención | Sin decidir; relacionado con `OD-12` |
| Rotación de `AUTH_SECRET` | Sin decidir; rotar invalida todas las sesiones |
| Host concreto | Sin decidir, deliberadamente (ADR-007 §4) |

## 7. Reglas

| # | Regla |
|---|---|
| E1 | `DATABASE_URL` es el único contrato de base de datos. |
| E2 | Toda la configuración se valida con Zod al arrancar; si es inválida, el proceso no arranca. |
| E3 | Ningún secreto en el repositorio ni en la imagen. |
| E4 | `DEMO_MODE=true` con `NODE_ENV=production` impide el arranque. |
| E5 | Los tres entornos usan el mismo camino de migración. |
| E6 | La base de desarrollo es desechable; nada importante vive solo ahí. |
| E7 | Ninguna variable de entorno específica de una plataforma es requerida. |
| E8 | `.env.example` documenta claves, nunca valores. |
