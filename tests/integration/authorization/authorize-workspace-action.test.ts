import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { authorizeWorkspaceAction } from '@/application/authorization/authorize-workspace-action';
import type { WorkspaceAuthorizationResult } from '@/application/authorization/authorize-workspace-action';
import { toWorkspaceAuthorizationResponse } from '@/platform/http/workspace-authorization-response';
import { createWorkspaceScope } from '@/application/access/workspace-scope';
import type { WorkspaceScope } from '@/application/access/workspace-scope';
import type { WorkspaceId } from '@/modules/workspaces';
import {
  archiveDomainUser,
  createAuthenticatedUser,
  deleteDomainUser,
  signOut,
} from '../../support/identity';
import {
  createWorkspaceWithMember,
  createWorkspaceWithOwner,
} from '../../support/workspaces';

/** Serializa una respuesta entera: status, cuerpo y cabeceras ordenadas. */
async function fingerprint(response: Response): Promise<string> {
  const headers = [...response.headers.entries()].sort(([a], [b]) => a.localeCompare(b));

  return JSON.stringify({
    status: response.status,
    body: await response.text(),
    headers,
  });
}

describe('authorizeWorkspaceAction', () => {
  describe('Rol autorizado y denegado por acción', () => {
    it('OWNER está autorizado para workspace.manage', async () => {
      const owner = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithOwner({ ownerUserId: owner.userId });

      const result = await authorizeWorkspaceAction({
        headers: owner.headers,
        workspacePublicId: workspace.workspacePublicId,
        capability: 'workspace.manage',
      });

      expect(result).toEqual({
        outcome: 'AUTHORIZED',
        context: {
          userId: owner.userId,
          workspaceId: workspace.workspaceId,
          role: 'OWNER',
          workspaceStatus: 'ACTIVE',
        },
        scope: {
          workspaceId: workspace.workspaceId,
          userId: owner.userId,
          role: 'OWNER',
        },
      });
    });

    it('MEMBER está autorizado para work.record', async () => {
      const owner = await createAuthenticatedUser();
      const member = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithMember({
        ownerUserId: owner.userId,
        memberUserId: member.userId,
        role: 'MEMBER',
      });

      const result = await authorizeWorkspaceAction({
        headers: member.headers,
        workspacePublicId: workspace.workspacePublicId,
        capability: 'work.record',
      });

      expect(result.outcome).toBe('AUTHORIZED');
    });

    it('MEMBER está denegado para publication.manage', async () => {
      const owner = await createAuthenticatedUser();
      const member = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithMember({
        ownerUserId: owner.userId,
        memberUserId: member.userId,
        role: 'MEMBER',
      });

      const result = await authorizeWorkspaceAction({
        headers: member.headers,
        workspacePublicId: workspace.workspacePublicId,
        capability: 'publication.manage',
      });

      expect(result).toEqual({ outcome: 'DENIED_ROLE' });
    });

    it('CLIENT está autorizado para review.submit', async () => {
      const owner = await createAuthenticatedUser();
      const client = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithMember({
        ownerUserId: owner.userId,
        memberUserId: client.userId,
        role: 'CLIENT',
      });

      const result = await authorizeWorkspaceAction({
        headers: client.headers,
        workspacePublicId: workspace.workspacePublicId,
        capability: 'review.submit',
      });

      expect(result.outcome).toBe('AUTHORIZED');
    });

    it('CLIENT está autorizado para request.create', async () => {
      const owner = await createAuthenticatedUser();
      const client = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithMember({
        ownerUserId: owner.userId,
        memberUserId: client.userId,
        role: 'CLIENT',
      });

      const result = await authorizeWorkspaceAction({
        headers: client.headers,
        workspacePublicId: workspace.workspacePublicId,
        capability: 'request.create',
      });

      expect(result.outcome).toBe('AUTHORIZED');
    });

    it('C1 · CLIENT está denegado para work.record: no escribe sobre el registro', async () => {
      const owner = await createAuthenticatedUser();
      const client = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithMember({
        ownerUserId: owner.userId,
        memberUserId: client.userId,
        role: 'CLIENT',
      });

      const result = await authorizeWorkspaceAction({
        headers: client.headers,
        workspacePublicId: workspace.workspacePublicId,
        capability: 'work.record',
      });

      expect(result).toEqual({ outcome: 'DENIED_ROLE' });
    });

    it('VIEWER está autorizado para workspace.read', async () => {
      const owner = await createAuthenticatedUser();
      const viewer = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithMember({
        ownerUserId: owner.userId,
        memberUserId: viewer.userId,
        role: 'VIEWER',
      });

      const result = await authorizeWorkspaceAction({
        headers: viewer.headers,
        workspacePublicId: workspace.workspacePublicId,
        capability: 'workspace.read',
      });

      expect(result.outcome).toBe('AUTHORIZED');
    });

    it('VIEWER está denegado para collaboration.participate: no comenta', async () => {
      const owner = await createAuthenticatedUser();
      const viewer = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithMember({
        ownerUserId: owner.userId,
        memberUserId: viewer.userId,
        role: 'VIEWER',
      });

      const result = await authorizeWorkspaceAction({
        headers: viewer.headers,
        workspacePublicId: workspace.workspacePublicId,
        capability: 'collaboration.participate',
      });

      expect(result).toEqual({ outcome: 'DENIED_ROLE' });
    });
  });

  describe('D-34 · workspace archivado en solo lectura', () => {
    it('una lectura sigue autorizada con el workspace archivado', async () => {
      const owner = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithOwner({
        ownerUserId: owner.userId,
        archived: true,
      });

      const result = await authorizeWorkspaceAction({
        headers: owner.headers,
        workspacePublicId: workspace.workspacePublicId,
        capability: 'workspace.read',
      });

      expect(result.outcome).toBe('AUTHORIZED');
    });

    it('una mutación permitida por el rol se deniega por archivado, no por rol', async () => {
      const owner = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithOwner({
        ownerUserId: owner.userId,
        archived: true,
      });

      const result = await authorizeWorkspaceAction({
        headers: owner.headers,
        workspacePublicId: workspace.workspacePublicId,
        capability: 'workspace.manage',
      });

      expect(result).toEqual({ outcome: 'DENIED_ARCHIVED' });
    });

    it('una mutación no permitida por el rol se deniega por rol, aunque esté archivado', async () => {
      const owner = await createAuthenticatedUser();
      const client = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithMember({
        ownerUserId: owner.userId,
        memberUserId: client.userId,
        role: 'CLIENT',
        archived: true,
      });

      const result = await authorizeWorkspaceAction({
        headers: client.headers,
        workspacePublicId: workspace.workspacePublicId,
        capability: 'publication.manage',
      });

      expect(result).toEqual({ outcome: 'DENIED_ROLE' });
    });
  });

  describe('Frontera de workspace y de membresía', () => {
    it('A6 · un workspace inexistente no autoriza', async () => {
      const user = await createAuthenticatedUser();

      const result = await authorizeWorkspaceAction({
        headers: user.headers,
        workspacePublicId: randomUUID(),
        capability: 'workspace.read',
      });

      expect(result).toEqual({ outcome: 'WORKSPACE_NOT_FOUND' });
    });

    it('A3 · un usuario autenticado sin membresía no autoriza', async () => {
      const owner = await createAuthenticatedUser();
      const outsider = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithOwner({ ownerUserId: owner.userId });

      const result = await authorizeWorkspaceAction({
        headers: outsider.headers,
        workspacePublicId: workspace.workspacePublicId,
        capability: 'workspace.read',
      });

      expect(result).toEqual({ outcome: 'NO_ACTIVE_MEMBERSHIP' });
    });

    it('A6 · ser OWNER de otro workspace no autoriza en el ajeno', async () => {
      const nelson = await createAuthenticatedUser();
      const other = await createAuthenticatedUser();

      await createWorkspaceWithOwner({ ownerUserId: nelson.userId });
      const foreign = await createWorkspaceWithOwner({ ownerUserId: other.userId });

      const result = await authorizeWorkspaceAction({
        headers: nelson.headers,
        workspacePublicId: foreign.workspacePublicId,
        capability: 'workspace.read',
      });

      expect(result).toEqual({ outcome: 'NO_ACTIVE_MEMBERSHIP' });
      expect(JSON.stringify(result)).not.toContain(foreign.workspaceId);
    });

    for (const status of ['INVITED', 'SUSPENDED', 'REMOVED'] as const) {
      it(`A3 · una membresía ${status} no autoriza ni una lectura`, async () => {
        const owner = await createAuthenticatedUser();
        const subject = await createAuthenticatedUser();
        const workspace = await createWorkspaceWithMember({
          ownerUserId: owner.userId,
          memberUserId: subject.userId,
          role: 'OWNER',
          status,
        });

        const result = await authorizeWorkspaceAction({
          headers: subject.headers,
          workspacePublicId: workspace.workspacePublicId,
          capability: 'workspace.read',
        });

        expect(result).toEqual({ outcome: 'NO_ACTIVE_MEMBERSHIP' });
      });
    }
  });

  describe('Actor', () => {
    it('T6-1 · una sesión revocada no autoriza en la petición siguiente', async () => {
      const owner = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithOwner({ ownerUserId: owner.userId });

      const granted = await authorizeWorkspaceAction({
        headers: owner.headers,
        workspacePublicId: workspace.workspacePublicId,
        capability: 'workspace.read',
      });
      expect(granted.outcome).toBe('AUTHORIZED');

      await signOut(owner);

      const result = await authorizeWorkspaceAction({
        headers: owner.headers,
        workspacePublicId: workspace.workspacePublicId,
        capability: 'workspace.read',
      });

      expect(result).toEqual({ outcome: 'UNAUTHENTICATED' });
    });

    it('sin sesión no se autoriza nada', async () => {
      const owner = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithOwner({ ownerUserId: owner.userId });

      const result = await authorizeWorkspaceAction({
        headers: new Headers(),
        workspacePublicId: workspace.workspacePublicId,
        capability: 'workspace.read',
      });

      expect(result).toEqual({ outcome: 'UNAUTHENTICATED' });
    });

    it('una identidad de dominio archivada no autoriza ni con membresía activa', async () => {
      const owner = await createAuthenticatedUser();
      const subject = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithMember({
        ownerUserId: owner.userId,
        memberUserId: subject.userId,
        role: 'MEMBER',
      });

      await archiveDomainUser(subject.userId);

      const result = await authorizeWorkspaceAction({
        headers: subject.headers,
        workspacePublicId: workspace.workspacePublicId,
        capability: 'workspace.read',
      });

      expect(result).toEqual({ outcome: 'IDENTITY_ARCHIVED' });
    });

    it('R-14 · una identidad sin fila en domain_users no autoriza', async () => {
      const owner = await createAuthenticatedUser();
      const subject = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithOwner({ ownerUserId: owner.userId });

      // El sujeto no tiene membresía a propósito: `workspace_members.user_id` referencia
      // `domain_users.id` con `ON DELETE RESTRICT`, así que una identidad con membresías no se
      // puede borrar. La precedencia es actor → recurso, de modo que el caso no la necesita.
      await deleteDomainUser(subject.userId);

      const result = await authorizeWorkspaceAction({
        headers: subject.headers,
        workspacePublicId: workspace.workspacePublicId,
        capability: 'workspace.read',
      });

      expect(result).toEqual({ outcome: 'IDENTITY_NOT_PROVISIONED' });
    });
  });

  describe('WorkspaceScope', () => {
    it('D-36 · el contexto real trae un WorkspaceId marcado y el scope se construye sin cast', async () => {
      const owner = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithOwner({ ownerUserId: owner.userId });

      const result = await authorizeWorkspaceAction({
        headers: owner.headers,
        workspacePublicId: workspace.workspacePublicId,
        capability: 'workspace.read',
      });

      expect(result.outcome).toBe('AUTHORIZED');
      if (result.outcome !== 'AUTHORIZED') return;

      // Comprobación de tipos sobre un valor real: esta asignación solo compila si el
      // `workspaceId` que llega de PostgreSQL atraviesa la frontera del módulo `workspaces` ya
      // marcado. No hay ninguna aserción de tipo en esta prueba ni en createWorkspaceScope.
      const branded: WorkspaceId = result.context.workspaceId;
      const scope: WorkspaceScope = createWorkspaceScope(result.context);

      expect(branded).toBe(workspace.workspaceId);
      expect(scope).toEqual(result.scope);
      expect(scope.workspaceId).toBe(workspace.workspaceId);
    });

    it('D-36 · el scope lleva el UUID interno y nunca el public ID', async () => {
      const owner = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithOwner({ ownerUserId: owner.userId });

      const result = await authorizeWorkspaceAction({
        headers: owner.headers,
        workspacePublicId: workspace.workspacePublicId,
        capability: 'workspace.read',
      });

      expect(result.outcome).toBe('AUTHORIZED');
      const scope = result.outcome === 'AUTHORIZED' ? result.scope : undefined;

      expect(Object.keys(scope!).sort()).toEqual(['role', 'userId', 'workspaceId']);
      expect(scope!.workspaceId).toBe(workspace.workspaceId);
      expect(scope!.workspaceId).not.toBe(workspace.workspacePublicId);
      expect(JSON.stringify(scope)).not.toContain(workspace.workspacePublicId);
      expect(JSON.stringify(scope)).not.toContain(owner.email);
      expect(JSON.stringify(scope)).not.toContain(owner.name);
    });

    it('OD-11 · dos workspaces del mismo usuario con roles distintos no contaminan sus scopes', async () => {
      const nelson = await createAuthenticatedUser();
      const other = await createAuthenticatedUser();

      const own = await createWorkspaceWithOwner({ ownerUserId: nelson.userId });
      const asClient = await createWorkspaceWithMember({
        ownerUserId: other.userId,
        memberUserId: nelson.userId,
        role: 'CLIENT',
      });

      const asOwner = await authorizeWorkspaceAction({
        headers: nelson.headers,
        workspacePublicId: own.workspacePublicId,
        capability: 'publication.manage',
      });
      const asClientResult = await authorizeWorkspaceAction({
        headers: nelson.headers,
        workspacePublicId: asClient.workspacePublicId,
        capability: 'publication.manage',
      });

      expect(asOwner.outcome).toBe('AUTHORIZED');
      expect(asOwner.outcome === 'AUTHORIZED' ? asOwner.scope : undefined).toEqual({
        workspaceId: own.workspaceId,
        userId: nelson.userId,
        role: 'OWNER',
      });

      // El mismo usuario, la misma capacidad, otro workspace: el rol no es global.
      expect(asClientResult).toEqual({ outcome: 'DENIED_ROLE' });

      const asClientRead = await authorizeWorkspaceAction({
        headers: nelson.headers,
        workspacePublicId: asClient.workspacePublicId,
        capability: 'review.submit',
      });

      expect(asClientRead.outcome === 'AUTHORIZED' ? asClientRead.scope : undefined).toEqual({
        workspaceId: asClient.workspaceId,
        userId: nelson.userId,
        role: 'CLIENT',
      });
    });
  });

  describe('Traducción HTTP', () => {
    it('A9 · WORKSPACE_NOT_FOUND, NO_ACTIVE_MEMBERSHIP y DENIED_ROLE son un 404 idéntico', async () => {
      const owner = await createAuthenticatedUser();
      const outsider = await createAuthenticatedUser();
      const member = await createAuthenticatedUser();

      const workspace = await createWorkspaceWithOwner({ ownerUserId: owner.userId });
      const withMember = await createWorkspaceWithMember({
        ownerUserId: owner.userId,
        memberUserId: member.userId,
        role: 'MEMBER',
      });

      const notFound = await authorizeWorkspaceAction({
        headers: outsider.headers,
        workspacePublicId: randomUUID(),
        capability: 'workspace.read',
      });
      const noMembership = await authorizeWorkspaceAction({
        headers: outsider.headers,
        workspacePublicId: workspace.workspacePublicId,
        capability: 'workspace.read',
      });
      const deniedRole = await authorizeWorkspaceAction({
        headers: member.headers,
        workspacePublicId: withMember.workspacePublicId,
        capability: 'publication.manage',
      });

      expect([notFound.outcome, noMembership.outcome, deniedRole.outcome]).toEqual([
        'WORKSPACE_NOT_FOUND',
        'NO_ACTIVE_MEMBERSHIP',
        'DENIED_ROLE',
      ]);

      const fingerprints = await Promise.all(
        [notFound, noMembership, deniedRole].map((result) =>
          fingerprint(toWorkspaceAuthorizationResponse(result)),
        ),
      );

      expect(fingerprints[0]).toBe(fingerprints[1]);
      expect(fingerprints[1]).toBe(fingerprints[2]);

      const serialized = JSON.parse(fingerprints[0]!) as {
        status: number;
        body: string;
        headers: readonly (readonly [string, string])[];
      };

      expect(serialized.status).toBe(404);
      expect(serialized.body).toBe('{}');

      // Indistinguibles no basta: también deben ser **mínimas**. Las tres seguirían siendo
      // idénticas entre sí si alguien añadiera una cabecera de diagnóstico dentro de la única
      // construcción del 404, y filtrarían igual. Esta aserción es la que lo impide.
      expect(serialized.headers).toEqual([['content-type', 'application/json']]);
    });

    it('D-17 · ninguna respuesta denegada revela identificadores, rol ni nombres', async () => {
      const owner = await createAuthenticatedUser();
      const member = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithMember({
        ownerUserId: owner.userId,
        memberUserId: member.userId,
        role: 'MEMBER',
      });

      const result = await authorizeWorkspaceAction({
        headers: member.headers,
        workspacePublicId: workspace.workspacePublicId,
        capability: 'membership.read',
      });

      expect(result).toEqual({ outcome: 'DENIED_ROLE' });

      const body = await toWorkspaceAuthorizationResponse(result).text();

      for (const secret of [
        workspace.workspaceId,
        workspace.workspacePublicId,
        member.userId,
        member.email,
        member.name,
        'MEMBER',
        'ACTIVE',
      ]) {
        expect(body).not.toContain(secret);
      }
    });

    it('D-34 · DENIED_ARCHIVED produce 409 con el estado y nada más', async () => {
      const owner = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithOwner({
        ownerUserId: owner.userId,
        archived: true,
      });

      const result = await authorizeWorkspaceAction({
        headers: owner.headers,
        workspacePublicId: workspace.workspacePublicId,
        capability: 'work.record',
      });

      expect(result).toEqual({ outcome: 'DENIED_ARCHIVED' });

      const response = toWorkspaceAuthorizationResponse(result);

      expect(response.status).toBe(409);
      expect(await response.text()).toBe('{"code":"WORKSPACE_ARCHIVED"}');
    });

    it('R-14 · IDENTITY_NOT_PROVISIONED produce 500, no una denegación', async () => {
      const owner = await createAuthenticatedUser();
      const subject = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithOwner({ ownerUserId: owner.userId });

      await deleteDomainUser(subject.userId);

      const result = await authorizeWorkspaceAction({
        headers: subject.headers,
        workspacePublicId: workspace.workspacePublicId,
        capability: 'workspace.read',
      });

      const response = toWorkspaceAuthorizationResponse(result);

      expect(response.status).toBe(500);
      expect(await response.text()).toBe('{}');
    });

    it('la ausencia de sesión y la identidad archivada producen 401 vacío', async () => {
      const owner = await createAuthenticatedUser();
      const subject = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithMember({
        ownerUserId: owner.userId,
        memberUserId: subject.userId,
        role: 'MEMBER',
      });

      const unauthenticated = await authorizeWorkspaceAction({
        headers: new Headers(),
        workspacePublicId: workspace.workspacePublicId,
        capability: 'workspace.read',
      });

      await archiveDomainUser(subject.userId);

      const archivedIdentity = await authorizeWorkspaceAction({
        headers: subject.headers,
        workspacePublicId: workspace.workspacePublicId,
        capability: 'workspace.read',
      });

      expect(unauthenticated).toEqual({ outcome: 'UNAUTHENTICATED' });
      expect(archivedIdentity).toEqual({ outcome: 'IDENTITY_ARCHIVED' });

      for (const result of [unauthenticated, archivedIdentity]) {
        const response = toWorkspaceAuthorizationResponse(result);

        expect(response.status).toBe(401);
        expect(await response.text()).toBe('{}');
      }
    });

    it('un resultado AUTHORIZED no se traduce: es un defecto del llamante', async () => {
      const owner = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithOwner({ ownerUserId: owner.userId });

      const result: WorkspaceAuthorizationResult = await authorizeWorkspaceAction({
        headers: owner.headers,
        workspacePublicId: workspace.workspacePublicId,
        capability: 'workspace.read',
      });

      expect(result.outcome).toBe('AUTHORIZED');
      expect(() => toWorkspaceAuthorizationResponse(result)).toThrow(/AUTHORIZED/);
    });
  });
});
