import { describe, it, expect } from 'vitest';
import { createWorkspaceScope } from '@/application/access/workspace-scope';
import type { WorkspaceScope } from '@/application/access/workspace-scope';
import type { WorkspaceAccessContext } from '@/application/access/workspace-access-context';
import { testAccessContext } from '../../support/workspace-access';

const WORKSPACE_UUID = '11111111-2222-3333-4444-555555555555';

const CONTEXT: WorkspaceAccessContext = testAccessContext({
  role: 'OWNER',
  workspaceStatus: 'ARCHIVED',
  userId: 'user-1234',
  workspaceId: WORKSPACE_UUID,
});

describe('createWorkspaceScope', () => {
  it('T5-R5 · produce exactamente workspaceId, userId y role', () => {
    const scope = createWorkspaceScope(CONTEXT);

    expect(Object.keys(scope).sort()).toEqual(['role', 'userId', 'workspaceId']);
    expect(scope.workspaceId).toBe(CONTEXT.workspaceId);
    expect(scope.userId).toBe(CONTEXT.userId);
    expect(scope.role).toBe(CONTEXT.role);
  });

  it('acepta el contexto sin ninguna aserción de tipo por parte del llamante', () => {
    // La marca llega ya puesta desde el módulo `workspaces`; aquí no se convierte nada. Que esta
    // línea compile sin `as` es la mitad de la garantía; la otra mitad es que la línea del bloque
    // `typeOnly` de más abajo **no** compile.
    const scope: WorkspaceScope = createWorkspaceScope(CONTEXT);

    expect(scope.workspaceId).toBe(WORKSPACE_UUID);
  });

  it('no arrastra el estado del workspace: el archivado se impuso antes de llegar aquí', () => {
    // El contexto de partida está ARCHIVED y el scope no lo refleja a propósito: llevarlo
    // invitaría a un segundo punto de imposición del archivado (ADR-005 T5-R12).
    const scope = createWorkspaceScope(CONTEXT);

    expect('workspaceStatus' in scope).toBe(false);
  });

  it('no lleva capacidades ni transacción', () => {
    const scope = createWorkspaceScope(CONTEXT);

    for (const absent of ['capabilities', 'capability', 'tx', 'transaction', 'db']) {
      expect(absent in scope).toBe(false);
    }
  });

  it('es serializable sin pérdida; la marca es solo de tipo y no sobrevive', () => {
    const scope = createWorkspaceScope(CONTEXT);

    expect(JSON.parse(JSON.stringify(scope))).toEqual({
      workspaceId: WORKSPACE_UUID,
      userId: 'user-1234',
      role: 'OWNER',
    });
  });

  it('no contiene public ID, correo, nombre ni token', () => {
    const scope = createWorkspaceScope(
      testAccessContext({ role: 'CLIENT', workspaceStatus: 'ACTIVE', userId: 'user-1234' }),
    );

    const serialized = JSON.stringify(scope);

    for (const secret of ['@', 'publicId', 'public_id', 'token', 'session', 'name', 'email']) {
      expect(serialized).not.toContain(secret);
    }
  });

  it('D-36 · el identificador es el interno y no se reinterpreta', () => {
    const scope = createWorkspaceScope(CONTEXT);

    expect(scope.workspaceId).toBe(WORKSPACE_UUID);
  });
});

describe('La marca nominal de WorkspaceId', () => {
  it('rechaza una cadena ordinaria donde se espera un WorkspaceId', () => {
    const accept = (scope: WorkspaceScope): string => scope.workspaceId;

    expect(accept(createWorkspaceScope(CONTEXT))).toBe(WORKSPACE_UUID);

    // Comprobación exclusivamente de tipos: el cuerpo nunca se ejecuta. La verifica
    // `pnpm typecheck`, que falla si un `@ts-expect-error` deja de suprimir un error real.
    const typeOnly = (): void => {
      // @ts-expect-error una cadena sin marca no es un WorkspaceId: es lo que impide que un
      // identificador llegado de una ruta alcance un repositorio.
      accept({ workspaceId: 'llegado-de-una-ruta', userId: 'user-1234', role: 'OWNER' });
    };

    expect(typeof typeOnly).toBe('function');
  });

  it('rechaza un WorkspaceAccessContext fabricado a mano con un identificador arbitrario', () => {
    // Éste es el camino lateral que la versión anterior dejaba abierto: se podía construir un
    // contexto literal con cualquier cadena y blanquearla a través de createWorkspaceScope.
    // Ahora el campo del contexto también está marcado, así que el camino no compila.
    const typeOnly = (): void => {
      const forged: WorkspaceAccessContext = {
        userId: 'atacante',
        // @ts-expect-error una cadena arbitraria no satisface WorkspaceAccessContext.workspaceId
        workspaceId: 'workspace-ajeno',
        role: 'OWNER',
        workspaceStatus: 'ACTIVE',
      };

      createWorkspaceScope(forged);
    };

    expect(typeof typeOnly).toBe('function');
  });

  it('no protege frente a quien elude el sistema de tipos a propósito', () => {
    // Documentado como límite explícito, no como defecto: la marca es una comprobación de
    // compilación. Un `as` deliberado la anula, y por eso la frontera estructural de
    // `tests/module-boundary.test.ts` limita dónde puede escribirse un `as WorkspaceId` en src/.
    // La verificación de que cada consulta filtra de verdad por workspace_id (ADR-002 A2)
    // dependerá de los repositorios de negocio, que no existen todavía.
    expect(true).toBe(true);
  });
});
