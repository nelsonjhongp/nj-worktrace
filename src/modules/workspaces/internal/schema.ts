import { pgTable, text, uuid, integer, timestamp, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

export const workspaceTypeEnum = pgEnum('workspace_type', ['PERSONAL', 'CLIENT', 'BUSINESS']);
export const memberRoleEnum = pgEnum('member_role', ['OWNER', 'MEMBER', 'CLIENT', 'VIEWER']);
export const memberStatusEnum = pgEnum('member_status', ['INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED']);
export const visibilityEnum = pgEnum('visibility', ['PRIVATE', 'INTERNAL', 'CLIENT_VISIBLE']);

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  publicId: uuid('public_id').notNull().unique(),
  name: text('name').notNull(),
  type: workspaceTypeEnum('type').notNull(),
  defaultVisibility: visibilityEnum('default_visibility').notNull(),
  timezone: text('timezone').notNull(),
  cycleLengthDays: integer('cycle_length_days').notNull().default(7),
  cycleStartWeekday: integer('cycle_start_weekday').notNull().default(1),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

export const workspaceMembers = pgTable('workspace_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'restrict' }),
  userId: text('user_id').notNull(),
  role: memberRoleEnum('role').notNull(),
  status: memberStatusEnum('status').notNull(),
  invitedBy: text('invited_by'),
  invitedAt: timestamp('invited_at', { withTimezone: true }),
  joinedAt: timestamp('joined_at', { withTimezone: true }),
  removedAt: timestamp('removed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  workspaceUserUnique: uniqueIndex('workspace_members_workspace_user_idx').on(table.workspaceId, table.userId),
  activeMembersByUser: index('workspace_members_active_user_idx').on(table.userId).where(sql`${table.status} = 'ACTIVE'`),
  activeMembersByWorkspace: index('workspace_members_active_workspace_idx').on(table.workspaceId).where(sql`${table.status} = 'ACTIVE'`),
  activeOwnersByWorkspace: index('workspace_members_active_owners_idx').on(table.workspaceId).where(sql`${table.status} = 'ACTIVE' AND ${table.role} = 'OWNER'`),
}));

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
}));

export type WorkspaceRole = (typeof memberRoleEnum.enumValues)[number];
export type WorkspaceMemberStatus = (typeof memberStatusEnum.enumValues)[number];

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;
