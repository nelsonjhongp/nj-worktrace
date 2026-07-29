import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const domainUsers = pgTable('domain_users', {
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull(),
  preferredTimezone: text('preferred_timezone'),
  locale: text('locale'),
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

export type DomainUser = typeof domainUsers.$inferSelect;
export type NewDomainUser = typeof domainUsers.$inferInsert;
