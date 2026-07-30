/**
 * Superficie server-only del módulo workspaces.
 *
 * No conoce Better Auth ni el módulo identity: recibe el `userId` ya resuelto como dato
 * (ADR-001, ADR-006 §3.4).
 *
 * `WorkspaceStatus` no está aquí: es un tipo de dominio y se exporta desde `index.ts`.
 */
export { resolveWorkspaceMembership } from './internal/access';
export type { WorkspaceMembershipResolution } from './internal/access';
