declare const workspaceIdBrand: unique symbol;

/**
 * Identificador interno de un workspace: el `uuid` de `workspaces.id`, con marca nominal.
 *
 * En tiempo de ejecución es una cadena. En tiempo de compilación **no es una cadena
 * cualquiera**: un valor llegado de una ruta, de un cuerpo JSON o de un parámetro de búsqueda
 * no compila donde se espera un `WorkspaceId`.
 *
 * Vive en el módulo `workspaces` porque el módulo es el dueño de la tabla y, por tanto, de su
 * identificador. La marca solo se puede aplicar en la frontera de persistencia del módulo
 * —`internal/access.ts`, inmediatamente después del repositorio—, que es el único punto del
 * árbol donde el valor procede de PostgreSQL (`ADR-002` A7, D-36).
 *
 * Lo que la marca **sí** garantiza: una cadena ordinaria no llega por accidente a un
 * `WorkspaceScope` ni a un repositorio, y añadir un segundo punto de marcado rompe
 * `tests/module-boundary.test.ts`.
 *
 * Lo que **no** garantiza: nada frente a quien eluda deliberadamente el sistema de tipos con
 * `as`, `any` o código sin tipar. No es un control de ejecución.
 */
export type WorkspaceId = string & {
  readonly [workspaceIdBrand]: never;
};
