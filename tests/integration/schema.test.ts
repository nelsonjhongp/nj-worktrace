import { describe, it, expect, beforeAll } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import { domainUsers } from '@/modules/identity';
import { workspaces, workspaceMembers } from '@/modules/workspaces';

describe('Domain Users', () => {
  let testDb: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    const testDbUrl = process.env.TEST_DATABASE_URL;
    if (!testDbUrl) {
      throw new Error('TEST_DATABASE_URL is not set');
    }
    testDb = drizzle({ connection: { connectionString: testDbUrl } });
  });

  it('creates user without memberships', async () => {
    const user = await testDb.insert(domainUsers).values({
      id: 'test-user-1',
      displayName: 'Test User',
    }).returning();

    expect(user[0]).toBeDefined();
    expect(user[0]!.id).toBe('test-user-1');
    expect(user[0]!.displayName).toBe('Test User');
  });

  it('rejects empty display_name', async () => {
    await expect(
      testDb.insert(domainUsers).values({
        id: 'test-user-empty',
        displayName: '   ',
      })
    ).rejects.toThrow();
  });

  it('rejects empty preferred_timezone', async () => {
    await expect(
      testDb.insert(domainUsers).values({
        id: 'test-user-tz',
        displayName: 'Test User TZ',
        preferredTimezone: '   ',
      })
    ).rejects.toThrow();
  });
});

describe('Workspaces', () => {
  let testDb: ReturnType<typeof drizzle>;
  let userId: string;

  beforeAll(async () => {
    const testDbUrl = process.env.TEST_DATABASE_URL;
    if (!testDbUrl) {
      throw new Error('TEST_DATABASE_URL is not set');
    }
    testDb = drizzle({ connection: { connectionString: testDbUrl } });

    const user = await testDb.insert(domainUsers).values({
      id: 'workspace-test-user',
      displayName: 'Workspace Test User',
    }).returning();
    userId = user[0]!.id;
  });

  it('creates workspace with unique public_id', async () => {
    let workspaceId: string;
    await testDb.transaction(async (tx) => {
      const workspace = await tx.insert(workspaces).values({
        publicId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Workspace',
        type: 'PERSONAL',
        defaultVisibility: 'PRIVATE',
        timezone: 'America/Lima',
        createdBy: userId,
      }).returning();
      workspaceId = workspace[0]!.id;

      await tx.insert(workspaceMembers).values({
        workspaceId: workspace[0]!.id,
        userId,
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      });
    });

    const result = await testDb.select().from(workspaces).where(eq(workspaces.id, workspaceId!));
    expect(result[0]!.publicId).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('allows duplicate workspace names', async () => {
    let ws1Id: string;
    let ws2Id: string;

    await testDb.transaction(async (tx) => {
      const ws1 = await tx.insert(workspaces).values({
        publicId: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Duplicate Name',
        type: 'CLIENT',
        defaultVisibility: 'INTERNAL',
        timezone: 'Europe/Madrid',
        createdBy: userId,
      }).returning();
      ws1Id = ws1[0]!.id;

      await tx.insert(workspaceMembers).values({
        workspaceId: ws1[0]!.id,
        userId,
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      });
    });

    await testDb.transaction(async (tx) => {
      const ws2 = await tx.insert(workspaces).values({
        publicId: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Duplicate Name',
        type: 'CLIENT',
        defaultVisibility: 'INTERNAL',
        timezone: 'Europe/Madrid',
        createdBy: userId,
      }).returning();
      ws2Id = ws2[0]!.id;

      await tx.insert(workspaceMembers).values({
        workspaceId: ws2[0]!.id,
        userId,
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      });
    });

    expect(ws1Id!).not.toBe(ws2Id!);
    const result1 = await testDb.select().from(workspaces).where(eq(workspaces.id, ws1Id!));
    const result2 = await testDb.select().from(workspaces).where(eq(workspaces.id, ws2Id!));
    expect(result1[0]!.name).toBe(result2[0]!.name);
  });

  it('rejects duplicate public_id', async () => {
    await expect(
      testDb.insert(workspaces).values({
        publicId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Another Workspace',
        type: 'PERSONAL',
        defaultVisibility: 'PRIVATE',
        timezone: 'America/Lima',
        createdBy: userId,
      })
    ).rejects.toThrow();
  });

  it('rejects empty name', async () => {
    await expect(
      testDb.insert(workspaces).values({
        publicId: '550e8400-e29b-41d4-a716-446655440003',
        name: '   ',
        type: 'PERSONAL',
        defaultVisibility: 'PRIVATE',
        timezone: 'America/Lima',
        createdBy: userId,
      })
    ).rejects.toThrow();
  });

  it('rejects empty timezone', async () => {
    await expect(
      testDb.insert(workspaces).values({
        publicId: '550e8400-e29b-41d4-a716-446655440004',
        name: 'Test Workspace',
        type: 'PERSONAL',
        defaultVisibility: 'PRIVATE',
        timezone: '   ',
        createdBy: userId,
      })
    ).rejects.toThrow();
  });

  it('rejects cycle_length_days <= 0', async () => {
    await expect(
      testDb.insert(workspaces).values({
        publicId: '550e8400-e29b-41d4-a716-446655440005',
        name: 'Test Workspace',
        type: 'PERSONAL',
        defaultVisibility: 'PRIVATE',
        timezone: 'America/Lima',
        cycleLengthDays: 0,
        createdBy: userId,
      })
    ).rejects.toThrow();
  });

  it('rejects cycle_start_weekday outside 1-7', async () => {
    await expect(
      testDb.insert(workspaces).values({
        publicId: '550e8400-e29b-41d4-a716-446655440006',
        name: 'Test Workspace',
        type: 'PERSONAL',
        defaultVisibility: 'PRIVATE',
        timezone: 'America/Lima',
        cycleStartWeekday: 8,
        createdBy: userId,
      })
    ).rejects.toThrow();
  });
});

describe('Workspace Members', () => {
  let testDb: ReturnType<typeof drizzle>;
  let userId1: string;
  let userId2: string;
  let workspaceId: string;

  beforeAll(async () => {
    const testDbUrl = process.env.TEST_DATABASE_URL;
    if (!testDbUrl) {
      throw new Error('TEST_DATABASE_URL is not set');
    }
    testDb = drizzle({ connection: { connectionString: testDbUrl } });

    const user1 = await testDb.insert(domainUsers).values({
      id: 'member-test-user-1',
      displayName: 'Member Test User 1',
    }).returning();
    userId1 = user1[0]!.id;

    const user2 = await testDb.insert(domainUsers).values({
      id: 'member-test-user-2',
      displayName: 'Member Test User 2',
    }).returning();
    userId2 = user2[0]!.id;

    await testDb.transaction(async (tx) => {
      const workspace = await tx.insert(workspaces).values({
        publicId: '550e8400-e29b-41d4-a716-446655440010',
        name: 'Member Test Workspace',
        type: 'CLIENT',
        defaultVisibility: 'INTERNAL',
        timezone: 'America/Lima',
        createdBy: userId1,
      }).returning();
      workspaceId = workspace[0]!.id;

      await tx.insert(workspaceMembers).values({
        workspaceId: workspace[0]!.id,
        userId: userId1,
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      });
    });
  });

  it('creates membership with valid status combination', async () => {
    // userId1 is already an OWNER from beforeAll, so we test with userId2
    const member = await testDb.insert(workspaceMembers).values({
      workspaceId,
      userId: userId2,
      role: 'OWNER',
      status: 'ACTIVE',
      joinedAt: new Date(),
    }).returning();

    expect(member[0]).toBeDefined();
    expect(member[0]!.role).toBe('OWNER');
    expect(member[0]!.status).toBe('ACTIVE');
  });

  it('rejects duplicate (workspace_id, user_id)', async () => {
    await expect(
      testDb.insert(workspaceMembers).values({
        workspaceId,
        userId: userId1,
        role: 'MEMBER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      })
    ).rejects.toThrow();
  });

  it('allows same user in different workspaces', async () => {
    let workspace2Id: string;
    await testDb.transaction(async (tx) => {
      const workspace2 = await tx.insert(workspaces).values({
        publicId: '550e8400-e29b-41d4-a716-446655440011',
        name: 'Member Test Workspace 2',
        type: 'CLIENT',
        defaultVisibility: 'INTERNAL',
        timezone: 'America/Lima',
        createdBy: userId2,
      }).returning();
      workspace2Id = workspace2[0]!.id;

      await tx.insert(workspaceMembers).values({
        workspaceId: workspace2[0]!.id,
        userId: userId2,
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      });

      await tx.insert(workspaceMembers).values({
        workspaceId: workspace2[0]!.id,
        userId: userId1,
        role: 'CLIENT',
        status: 'ACTIVE',
        joinedAt: new Date(),
      });
    });

    const result = await testDb.select().from(workspaceMembers).where(
      and(
        eq(workspaceMembers.workspaceId, workspace2Id!),
        eq(workspaceMembers.userId, userId1)
      )
    );
    expect(result[0]!.role).toBe('CLIENT');
  });

  it('rejects ACTIVE status without joined_at', async () => {
    await expect(
      testDb.insert(workspaceMembers).values({
        workspaceId,
        userId: userId2,
        role: 'MEMBER',
        status: 'ACTIVE',
      })
    ).rejects.toThrow();
  });

  it('rejects INVITED status without invited_at', async () => {
    await expect(
      testDb.insert(workspaceMembers).values({
        workspaceId,
        userId: userId2,
        role: 'MEMBER',
        status: 'INVITED',
      })
    ).rejects.toThrow();
  });

  it('rejects REMOVED status without removed_at', async () => {
    await expect(
      testDb.insert(workspaceMembers).values({
        workspaceId,
        userId: userId2,
        role: 'MEMBER',
        status: 'REMOVED',
      })
    ).rejects.toThrow();
  });
});

describe('Owner Invariant', () => {
  let testDb: ReturnType<typeof drizzle>;
  let userId1: string;
  let userId2: string;

  beforeAll(async () => {
    const testDbUrl = process.env.TEST_DATABASE_URL;
    if (!testDbUrl) {
      throw new Error('TEST_DATABASE_URL is not set');
    }
    testDb = drizzle({ connection: { connectionString: testDbUrl } });

    const user1 = await testDb.insert(domainUsers).values({
      id: 'owner-test-user-1',
      displayName: 'Owner Test User 1',
    }).returning();
    userId1 = user1[0]!.id;

    const user2 = await testDb.insert(domainUsers).values({
      id: 'owner-test-user-2',
      displayName: 'Owner Test User 2',
    }).returning();
    userId2 = user2[0]!.id;
  });

  it('allows creating workspace and owner in same transaction', async () => {
    let workspaceId: string;
    await testDb.transaction(async (tx) => {
      const workspace = await tx.insert(workspaces).values({
        publicId: '550e8400-e29b-41d4-a716-446655440020',
        name: 'Owner Test Workspace',
        type: 'PERSONAL',
        defaultVisibility: 'PRIVATE',
        timezone: 'America/Lima',
        createdBy: userId1,
      }).returning();
      workspaceId = workspace[0]!.id;

      await tx.insert(workspaceMembers).values({
        workspaceId: workspace[0]!.id,
        userId: userId1,
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      });
    });

    const members = await testDb.select().from(workspaceMembers).where(
      eq(workspaceMembers.workspaceId, workspaceId!)
    );
    expect(members).toHaveLength(1);
    expect(members[0]!.userId).toBe(userId1);
    expect(members[0]!.role).toBe('OWNER');
    expect(members[0]!.status).toBe('ACTIVE');
  });

  it('rejects removing last active owner', async () => {
    let workspaceId: string;
    await testDb.transaction(async (tx) => {
      const workspace = await tx.insert(workspaces).values({
        publicId: '550e8400-e29b-41d4-a716-446655440021',
        name: 'Owner Test Workspace 2',
        type: 'PERSONAL',
        defaultVisibility: 'PRIVATE',
        timezone: 'America/Lima',
        createdBy: userId1,
      }).returning();
      workspaceId = workspace[0]!.id;

      await tx.insert(workspaceMembers).values({
        workspaceId: workspace[0]!.id,
        userId: userId1,
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      });
    });

    await expect(
      testDb.delete(workspaceMembers).where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId!),
          eq(workspaceMembers.userId, userId1)
        )
      )
    ).rejects.toThrow();
  });

  it('allows removing owner when another active owner exists', async () => {
    let workspaceId: string;
    await testDb.transaction(async (tx) => {
      const workspace = await tx.insert(workspaces).values({
        publicId: '550e8400-e29b-41d4-a716-446655440022',
        name: 'Owner Test Workspace 3',
        type: 'PERSONAL',
        defaultVisibility: 'PRIVATE',
        timezone: 'America/Lima',
        createdBy: userId1,
      }).returning();
      workspaceId = workspace[0]!.id;

      await tx.insert(workspaceMembers).values({
        workspaceId: workspace[0]!.id,
        userId: userId1,
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      });

      await tx.insert(workspaceMembers).values({
        workspaceId: workspace[0]!.id,
        userId: userId2,
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      });
    });

    await testDb.delete(workspaceMembers).where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId!),
        eq(workspaceMembers.userId, userId1)
      )
    );

    const remainingOwners = await testDb.select().from(workspaceMembers).where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId!),
        eq(workspaceMembers.role, 'OWNER'),
        eq(workspaceMembers.status, 'ACTIVE')
      )
    );
    expect(remainingOwners).toHaveLength(1);
    expect(remainingOwners[0]!.userId).toBe(userId2);
    expect(remainingOwners[0]!.userId).not.toBe(userId1);
  });

  it('rejects creating workspace without any membership', async () => {
    await expect(
      testDb.transaction(async (tx) => {
        await tx.insert(workspaces).values({
          publicId: '550e8400-e29b-41d4-a716-446655440023',
          name: 'Orphan Workspace',
          type: 'PERSONAL',
          defaultVisibility: 'PRIVATE',
          timezone: 'America/Lima',
          createdBy: userId1,
        });
      })
    ).rejects.toThrow();
  });

  it('rejects unarchiving workspace without owner', async () => {
    let workspaceId: string;
    await testDb.transaction(async (tx) => {
      const workspace = await tx.insert(workspaces).values({
        publicId: '550e8400-e29b-41d4-a716-446655440024',
        name: 'Archived Workspace',
        type: 'PERSONAL',
        defaultVisibility: 'PRIVATE',
        timezone: 'America/Lima',
        createdBy: userId1,
        archivedAt: new Date(),
      }).returning();
      workspaceId = workspace[0]!.id;
    });

    await expect(
      testDb.update(workspaces)
        .set({ archivedAt: null })
        .where(eq(workspaces.id, workspaceId!))
    ).rejects.toThrow();
  });

  it('rejects moving last owner to another workspace', async () => {
    let workspaceAId: string;
    let workspaceBId: string;

    await testDb.transaction(async (tx) => {
      const workspaceA = await tx.insert(workspaces).values({
        publicId: '550e8400-e29b-41d4-a716-446655440025',
        name: 'Workspace A',
        type: 'PERSONAL',
        defaultVisibility: 'PRIVATE',
        timezone: 'America/Lima',
        createdBy: userId1,
      }).returning();
      workspaceAId = workspaceA[0]!.id;

      await tx.insert(workspaceMembers).values({
        workspaceId: workspaceA[0]!.id,
        userId: userId1,
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      });

      const workspaceB = await tx.insert(workspaces).values({
        publicId: '550e8400-e29b-41d4-a716-446655440026',
        name: 'Workspace B',
        type: 'PERSONAL',
        defaultVisibility: 'PRIVATE',
        timezone: 'America/Lima',
        createdBy: userId2,
      }).returning();
      workspaceBId = workspaceB[0]!.id;

      await tx.insert(workspaceMembers).values({
        workspaceId: workspaceB[0]!.id,
        userId: userId2,
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      });
    });

    await expect(
      testDb.update(workspaceMembers)
        .set({ workspaceId: workspaceBId! })
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceAId!),
            eq(workspaceMembers.userId, userId1)
          )
        )
    ).rejects.toThrow();
  });

  it('rejects inserting non-owner member in workspace without owner', async () => {
    await expect(
      testDb.transaction(async (tx) => {
        const workspace = await tx.insert(workspaces).values({
          publicId: '550e8400-e29b-41d4-a716-446655440027',
          name: 'No Owner Workspace',
          type: 'PERSONAL',
          defaultVisibility: 'PRIVATE',
          timezone: 'America/Lima',
          createdBy: userId1,
        }).returning();

        await tx.insert(workspaceMembers).values({
          workspaceId: workspace[0]!.id,
          userId: userId1,
          role: 'MEMBER',
          status: 'ACTIVE',
          joinedAt: new Date(),
        });
      })
    ).rejects.toThrow();
  });
});
