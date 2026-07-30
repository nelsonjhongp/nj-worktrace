import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getDb } from '@/platform/database/client';
import { auth } from '@/modules/identity/server';
import { domainUsers } from '@/modules/identity';
import { workspaces, workspaceMembers } from '@/modules/workspaces';
import type { WorkspaceMemberStatus, WorkspaceRole } from '@/modules/workspaces';
import { resolveWorkspaceAccess } from '@/application/access/resolve-workspace-access';

const db = getDb();
const PASSWORD = 'password123';

type TestUser = {
  readonly userId: string;
  readonly email: string;
  readonly name: string;
  readonly headers: Headers;
};

/**
 * Crea una identidad real con Better Auth y devuelve sus cabeceras con la cookie de sesión
 * emitida por la propia biblioteca. Nunca se insertan filas en `user`, `account`, `session`
 * ni contraseñas a mano (ADR-008 T8-R1): `domain_users` aparece por el trigger de
 * provisión, igual que en producción.
 */
async function createAuthenticatedUser(): Promise<TestUser> {
  const email = `access-${randomUUID()}@example.com`;
  const name = `Access ${randomUUID().slice(0, 8)}`;

  const response = await auth.api.signUpEmail({
    body: { email, password: PASSWORD, name },
    asResponse: true,
  });

  expect(response.status).toBe(200);

  const setCookie = response.headers.get('set-cookie');
  expect(setCookie).toBeTruthy();

  const headers = new Headers();
  headers.set('cookie', setCookie!.split(';', 1)[0]!);

  const body = (await response.json()) as { user: { id: string } };
  const userId = body.user.id;

  const [domainUser] = await db
    .select({ id: domainUsers.id })
    .from(domainUsers)
    .where(eq(domainUsers.id, userId));

  expect(domainUser).toBeDefined();

  return { userId, email, name, headers };
}

type TestWorkspace = {
  readonly workspaceId: string;
  readonly workspacePublicId: string;
};

/**
 * Crea un workspace con su OWNER activo en la misma transacción: el invariante de OWNER es
 * un trigger de restricción diferido y rechaza un workspace sin propietario activo.
 */
async function createWorkspaceWithOwner(params: {
  readonly ownerUserId: string;
  readonly archived?: boolean;
}): Promise<TestWorkspace> {
  const publicId = randomUUID();
  let workspaceId = '';

  await db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(workspaces)
      .values({
        publicId,
        name: `Access Workspace ${publicId.slice(0, 8)}`,
        type: 'CLIENT',
        defaultVisibility: 'INTERNAL',
        timezone: 'America/Lima',
        createdBy: params.ownerUserId,
        archivedAt: params.archived === true ? new Date() : null,
      })
      .returning();

    workspaceId = workspace!.id;

    await tx.insert(workspaceMembers).values({
      workspaceId,
      userId: params.ownerUserId,
      role: 'OWNER',
      status: 'ACTIVE',
      joinedAt: new Date(),
    });
  });

  return { workspaceId, workspacePublicId: publicId };
}

/** Añade una membresía con las marcas de tiempo que exige cada estado del esquema. */
async function addMember(params: {
  readonly workspaceId: string;
  readonly userId: string;
  readonly role: WorkspaceRole;
  readonly status: WorkspaceMemberStatus;
}): Promise<void> {
  const now = new Date();

  await db.insert(workspaceMembers).values({
    workspaceId: params.workspaceId,
    userId: params.userId,
    role: params.role,
    status: params.status,
    invitedAt: params.status === 'INVITED' ? now : null,
    joinedAt: params.status === 'INVITED' ? null : now,
    removedAt: params.status === 'REMOVED' ? now : null,
  });
}

describe('resolveWorkspaceAccess', () => {
  describe('Membresía activa', () => {
    it('T6-10 · una membresía OWNER activa concede acceso', async () => {
      const owner = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithOwner({ ownerUserId: owner.userId });

      const resolution = await resolveWorkspaceAccess({
        headers: owner.headers,
        workspacePublicId: workspace.workspacePublicId,
      });

      expect(resolution).toEqual({
        outcome: 'GRANTED',
        context: {
          userId: owner.userId,
          workspaceId: workspace.workspaceId,
          role: 'OWNER',
          workspaceStatus: 'ACTIVE',
        },
      });
    });

    for (const role of ['MEMBER', 'CLIENT', 'VIEWER'] as const) {
      it(`T6-10 · una membresía ${role} activa concede acceso con su rol`, async () => {
        const owner = await createAuthenticatedUser();
        const subject = await createAuthenticatedUser();
        const workspace = await createWorkspaceWithOwner({ ownerUserId: owner.userId });

        await addMember({
          workspaceId: workspace.workspaceId,
          userId: subject.userId,
          role,
          status: 'ACTIVE',
        });

        const resolution = await resolveWorkspaceAccess({
          headers: subject.headers,
          workspacePublicId: workspace.workspacePublicId,
        });

        expect(resolution).toEqual({
          outcome: 'GRANTED',
          context: {
            userId: subject.userId,
            workspaceId: workspace.workspaceId,
            role,
            workspaceStatus: 'ACTIVE',
          },
        });
      });
    }

    it('un workspace archivado con membresía activa concede acceso y se marca ARCHIVED', async () => {
      const owner = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithOwner({
        ownerUserId: owner.userId,
        archived: true,
      });

      const resolution = await resolveWorkspaceAccess({
        headers: owner.headers,
        workspacePublicId: workspace.workspacePublicId,
      });

      expect(resolution).toEqual({
        outcome: 'GRANTED',
        context: {
          userId: owner.userId,
          workspaceId: workspace.workspaceId,
          role: 'OWNER',
          workspaceStatus: 'ARCHIVED',
        },
      });
    });
  });

  describe('Sesión', () => {
    it('sin sesión no se resuelve acceso a un workspace existente', async () => {
      const owner = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithOwner({ ownerUserId: owner.userId });

      const resolution = await resolveWorkspaceAccess({
        headers: new Headers(),
        workspacePublicId: workspace.workspacePublicId,
      });

      expect(resolution).toEqual({ outcome: 'UNAUTHENTICATED' });
    });

    it('T6-5 · una cookie manipulada no resuelve acceso', async () => {
      const owner = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithOwner({ ownerUserId: owner.userId });

      const original = owner.headers.get('cookie')!;
      const tampered = `${original.slice(0, -4)}beef`;
      expect(tampered).not.toBe(original);

      const headers = new Headers();
      headers.set('cookie', tampered);

      const resolution = await resolveWorkspaceAccess({
        headers,
        workspacePublicId: workspace.workspacePublicId,
      });

      expect(resolution).toEqual({ outcome: 'UNAUTHENTICATED' });
    });

    it('T6-1 · una sesión revocada no resuelve acceso en la petición siguiente', async () => {
      const owner = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithOwner({ ownerUserId: owner.userId });

      const granted = await resolveWorkspaceAccess({
        headers: owner.headers,
        workspacePublicId: workspace.workspacePublicId,
      });
      expect(granted.outcome).toBe('GRANTED');

      await auth.api.signOut({ headers: owner.headers });

      const resolution = await resolveWorkspaceAccess({
        headers: owner.headers,
        workspacePublicId: workspace.workspacePublicId,
      });

      expect(resolution).toEqual({ outcome: 'UNAUTHENTICATED' });
    });
  });

  describe('Identidad de dominio', () => {
    it('una identidad sin fila en domain_users no resuelve acceso', async () => {
      const owner = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithOwner({ ownerUserId: owner.userId });
      const subject = await createAuthenticatedUser();

      await db.delete(domainUsers).where(eq(domainUsers.id, subject.userId));

      const resolution = await resolveWorkspaceAccess({
        headers: subject.headers,
        workspacePublicId: workspace.workspacePublicId,
      });

      expect(resolution).toEqual({ outcome: 'IDENTITY_NOT_PROVISIONED' });
    });

    it('una identidad de dominio archivada no resuelve acceso ni con membresía activa', async () => {
      const owner = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithOwner({ ownerUserId: owner.userId });
      const subject = await createAuthenticatedUser();

      await addMember({
        workspaceId: workspace.workspaceId,
        userId: subject.userId,
        role: 'MEMBER',
        status: 'ACTIVE',
      });

      await db
        .update(domainUsers)
        .set({ archivedAt: new Date() })
        .where(eq(domainUsers.id, subject.userId));

      const resolution = await resolveWorkspaceAccess({
        headers: subject.headers,
        workspacePublicId: workspace.workspacePublicId,
      });

      expect(resolution).toEqual({ outcome: 'IDENTITY_ARCHIVED' });
    });
  });

  describe('Workspace y membresía', () => {
    it('acepta las representaciones no canónicas de UUID que PostgreSQL acepta', async () => {
      const owner = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithOwner({ ownerUserId: owner.userId });
      const compact = workspace.workspacePublicId.replaceAll('-', '');
      const partiallyHyphenated = compact.replace(/(.{4})/g, '$1-').slice(0, -1);

      for (const workspacePublicId of [
        `{${workspace.workspacePublicId.toUpperCase()}}`,
        compact,
        partiallyHyphenated,
      ]) {
        await expect(resolveWorkspaceAccess({
          headers: owner.headers,
          workspacePublicId,
        })).resolves.toEqual({
          outcome: 'GRANTED',
          context: {
            userId: owner.userId,
            workspaceId: workspace.workspaceId,
            role: 'OWNER',
            workspaceStatus: 'ACTIVE',
          },
        });
      }
    });

    it('A6 · un workspacePublicId inexistente no resuelve acceso', async () => {
      const user = await createAuthenticatedUser();

      const resolution = await resolveWorkspaceAccess({
        headers: user.headers,
        workspacePublicId: randomUUID(),
      });

      expect(resolution).toEqual({ outcome: 'WORKSPACE_NOT_FOUND' });
    });

    it('A3 · un usuario autenticado sin membresía no resuelve acceso', async () => {
      const owner = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithOwner({ ownerUserId: owner.userId });
      const outsider = await createAuthenticatedUser();

      const resolution = await resolveWorkspaceAccess({
        headers: outsider.headers,
        workspacePublicId: workspace.workspacePublicId,
      });

      expect(resolution).toEqual({ outcome: 'NO_ACTIVE_MEMBERSHIP' });
    });

    it('A6 · una membresía en otro workspace no resuelve el ajeno', async () => {
      const nelson = await createAuthenticatedUser();
      const other = await createAuthenticatedUser();

      const own = await createWorkspaceWithOwner({ ownerUserId: nelson.userId });
      const foreign = await createWorkspaceWithOwner({ ownerUserId: other.userId });

      const resolution = await resolveWorkspaceAccess({
        headers: nelson.headers,
        workspacePublicId: foreign.workspacePublicId,
      });

      expect(resolution).toEqual({ outcome: 'NO_ACTIVE_MEMBERSHIP' });
      expect(JSON.stringify(resolution)).not.toContain(own.workspaceId);
      expect(JSON.stringify(resolution)).not.toContain(foreign.workspaceId);
    });

    for (const status of ['INVITED', 'SUSPENDED', 'REMOVED'] as const) {
      it(`A3 · una membresía ${status} no resuelve acceso`, async () => {
        const owner = await createAuthenticatedUser();
        const subject = await createAuthenticatedUser();
        const workspace = await createWorkspaceWithOwner({ ownerUserId: owner.userId });

        await addMember({
          workspaceId: workspace.workspaceId,
          userId: subject.userId,
          role: 'CLIENT',
          status,
        });

        const resolution = await resolveWorkspaceAccess({
          headers: subject.headers,
          workspacePublicId: workspace.workspacePublicId,
        });

        expect(resolution).toEqual({ outcome: 'NO_ACTIVE_MEMBERSHIP' });
      });
    }
  });

  describe('Forma del contexto', () => {
    it('el contexto concedido tiene exactamente cuatro campos', async () => {
      const owner = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithOwner({ ownerUserId: owner.userId });

      const resolution = await resolveWorkspaceAccess({
        headers: owner.headers,
        workspacePublicId: workspace.workspacePublicId,
      });

      expect(resolution.outcome).toBe('GRANTED');
      const context = resolution.outcome === 'GRANTED' ? resolution.context : undefined;

      expect(Object.keys(context!).sort()).toEqual([
        'role',
        'userId',
        'workspaceId',
        'workspaceStatus',
      ]);
    });

    it('el resultado no contiene correo, nombre, cookie ni token de sesión', async () => {
      const owner = await createAuthenticatedUser();
      const workspace = await createWorkspaceWithOwner({ ownerUserId: owner.userId });

      const resolution = await resolveWorkspaceAccess({
        headers: owner.headers,
        workspacePublicId: workspace.workspacePublicId,
      });

      const serialized = JSON.stringify(resolution);
      const sessionCookie = owner.headers.get('cookie')!;
      const sessionToken = sessionCookie.slice(sessionCookie.indexOf('=') + 1);

      expect(serialized).not.toContain(owner.email);
      expect(serialized).not.toContain(owner.name);
      expect(serialized).not.toContain(sessionToken);
      expect(serialized).not.toContain('@');
      expect(serialized).not.toContain(workspace.workspacePublicId);
    });
  });
});
