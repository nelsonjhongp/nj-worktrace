import { randomUUID } from 'node:crypto';
import { getDb } from '@/platform/database/client';
import { workspaces, workspaceMembers } from '@/modules/workspaces';
import type { WorkspaceMemberStatus, WorkspaceRole } from '@/modules/workspaces';

export type TestWorkspace = {
  readonly workspaceId: string;
  readonly workspacePublicId: string;
};

/**
 * Crea un workspace con su OWNER activo en la misma transacción: el invariante de OWNER es
 * un trigger de restricción diferido y rechaza un workspace sin propietario activo.
 */
export async function createWorkspaceWithOwner(params: {
  readonly ownerUserId: string;
  readonly archived?: boolean;
}): Promise<TestWorkspace> {
  const publicId = randomUUID();
  let workspaceId = '';

  await getDb().transaction(async (tx) => {
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
export async function addMember(params: {
  readonly workspaceId: string;
  readonly userId: string;
  readonly role: WorkspaceRole;
  readonly status: WorkspaceMemberStatus;
}): Promise<void> {
  const now = new Date();

  await getDb().insert(workspaceMembers).values({
    workspaceId: params.workspaceId,
    userId: params.userId,
    role: params.role,
    status: params.status,
    invitedAt: params.status === 'INVITED' ? now : null,
    joinedAt: params.status === 'INVITED' ? null : now,
    removedAt: params.status === 'REMOVED' ? now : null,
  });
}

/**
 * Crea un workspace ajeno y añade al usuario con el rol y estado indicados.
 * Devuelve el workspace para poder pedirlo por su `public_id`.
 */
export async function createWorkspaceWithMember(params: {
  readonly ownerUserId: string;
  readonly memberUserId: string;
  readonly role: WorkspaceRole;
  readonly status?: WorkspaceMemberStatus;
  readonly archived?: boolean;
}): Promise<TestWorkspace> {
  const workspace = await createWorkspaceWithOwner({
    ownerUserId: params.ownerUserId,
    ...(params.archived === undefined ? {} : { archived: params.archived }),
  });

  await addMember({
    workspaceId: workspace.workspaceId,
    userId: params.memberUserId,
    role: params.role,
    status: params.status ?? 'ACTIVE',
  });

  return workspace;
}
