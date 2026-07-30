import type { WorkspaceAuthorizationResult } from '@/application/authorization/authorize-workspace-action';

/**
 * Cabeceras de toda respuesta de autorización. Nada de diagnóstico, nada de correlación, nada
 * que varíe entre casos: una cabecera distinta entre dos denegaciones es un oráculo igual de
 * útil que un cuerpo distinto.
 */
const HEADERS = { 'content-type': 'application/json' } as const;

/**
 * Cuerpo vacío. Cualquier `message`, `code` o `error` legible sería exactamente la información
 * que `ADR-002` §3 se esfuerza en no revelar.
 */
const EMPTY_BODY = '{}';

/**
 * **Única** construcción del 404, compartida por los tres resultados que deben ser
 * indistinguibles: workspace inexistente, workspace ajeno y falta de capacidad
 * (`ADR-002` §3, D-17, A9).
 *
 * Es una función y no una constante `Response` porque un `Response` solo se puede consumir una
 * vez: reutilizar la misma instancia entre dos peticiones daría un cuerpo ya leído. La igualdad
 * byte a byte la garantiza que el status, el cuerpo y las cabeceras salen de aquí y de ningún
 * otro sitio, y la comprueba una prueba de integración.
 */
function notFoundResponse(): Response {
  return new Response(EMPTY_BODY, { status: 404, headers: HEADERS });
}

/**
 * Traduce un resultado de autorización a una respuesta HTTP.
 *
 * Usa `Response` estándar de la plataforma web —nunca `NextResponse`, `notFound()` ni
 * `redirect()`— para que sustituir el framework afecte a las rutas y no a esta traducción
 * (`ADR-004` §3.5, `ADR-007` §6). El motor de políticas no conoce este archivo; la dependencia
 * va en un solo sentido.
 *
 * | Resultado interno | HTTP | Por qué |
 * |---|---|---|
 * | `UNAUTHENTICATED` | 401 `{}` | El llamante ya sabe que no tiene sesión: no se le revela nada |
 * | `IDENTITY_ARCHIVED` | 401 `{}` | Mensaje neutro, sin detalles de la cuenta (`USER-FLOWS.md` F7) |
 * | `IDENTITY_NOT_PROVISIONED` | 500 `{}` | **No es una denegación**: es el invariante roto de `R-14` |
 * | `WORKSPACE_NOT_FOUND` | 404 `{}` | `ADR-002` §3 |
 * | `NO_ACTIVE_MEMBERSHIP` | 404 `{}` | Idéntica a la anterior, a propósito |
 * | `DENIED_ROLE` | 404 `{}` | Idéntica a las dos anteriores (`TESTING.md` §7) |
 * | `DENIED_ARCHIVED` | 409 `{"code":"WORKSPACE_ARCHIVED"}` | Estado del recurso, no permiso ausente |
 *
 * `DENIED_ARCHIVED` es el único caso que dice algo, y puede: quien lo recibe tiene membresía
 * activa y ya sabe que el workspace existe, y `USER-FLOWS.md` F1 A3 y F7 exigen avisarle («solo
 * lectura con aviso»). Es **409** y no 403 porque el impedimento es el estado del recurso y no
 * un permiso que falte, de modo que no reabre D-17 («sin permiso se responde 404, nunca 403»).
 * El cuerpo lleva el estado y nada más: ni identificador, ni rol, ni nombre.
 *
 * `AUTHORIZED` no se traduce: no es una respuesta, es permiso para continuar. Llamar aquí con un
 * resultado autorizado es un defecto del llamante y lanza en vez de devolver algo plausible.
 */
export function toWorkspaceAuthorizationResponse(
  result: WorkspaceAuthorizationResult,
): Response {
  switch (result.outcome) {
    case 'UNAUTHENTICATED':
    case 'IDENTITY_ARCHIVED':
      return new Response(EMPTY_BODY, { status: 401, headers: HEADERS });

    case 'IDENTITY_NOT_PROVISIONED':
      return new Response(EMPTY_BODY, { status: 500, headers: HEADERS });

    case 'WORKSPACE_NOT_FOUND':
    case 'NO_ACTIVE_MEMBERSHIP':
    case 'DENIED_ROLE':
      return notFoundResponse();

    case 'DENIED_ARCHIVED':
      return new Response(JSON.stringify({ code: 'WORKSPACE_ARCHIVED' }), {
        status: 409,
        headers: HEADERS,
      });

    case 'AUTHORIZED':
      throw new Error(
        'toWorkspaceAuthorizationResponse recibió un resultado AUTHORIZED: no hay nada que denegar.',
      );
  }
}
