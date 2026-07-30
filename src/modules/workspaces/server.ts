/**
 * Superficie server-only del módulo workspaces.
 *
 * No conoce Better Auth ni el módulo identity: recibe el `userId` ya resuelto como dato
 * (ADR-001, ADR-006 §3.4).
 */
export { resolveWorkspaceMembership } from './internal/access';
export type { WorkspaceMembershipResolution, WorkspaceStatus } from './internal/access';
