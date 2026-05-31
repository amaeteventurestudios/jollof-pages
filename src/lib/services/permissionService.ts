// ============================================================
// PERMISSION SERVICE
// All role checks and governance assertions
// ============================================================
import { WorkspaceRole, APPROVAL_ROLES, WikiApprovalStatus, IMMUTABLE_STATUSES } from '@/lib/enums';

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

export class LockedObjectError extends Error {
  constructor(objectType: string) {
    super(`${objectType} is locked and cannot be modified without a revision flow`);
    this.name = 'LockedObjectError';
  }
}

// ---- Role checks ----

function inRoles(role: WorkspaceRole, allowed: WorkspaceRole[]): boolean {
  return allowed.includes(role);
}

export function requireWorkspaceRole(
  userRole: WorkspaceRole | null,
  requiredRoles: WorkspaceRole[],
  action = 'perform this action'
): void {
  if (!userRole || !requiredRoles.includes(userRole)) {
    throw new PermissionError(
      `Insufficient role to ${action}. Required: ${requiredRoles.join(' | ')}, Got: ${userRole ?? 'none'}`
    );
  }
}

export function requireWorkspaceAccess(userRole: WorkspaceRole | null): void {
  if (!userRole) {
    throw new PermissionError('You must be a workspace member to access this resource');
  }
}

export function canManageWorkspace(role: WorkspaceRole): boolean {
  return role === WorkspaceRole.OWNER || role === WorkspaceRole.ADMIN;
}

export function canManageMembers(role: WorkspaceRole): boolean {
  return role === WorkspaceRole.OWNER || role === WorkspaceRole.ADMIN;
}

export function canManageAssets(role: WorkspaceRole): boolean {
  return inRoles(role, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.ART_DIRECTOR]);
}

export function canApproveCanon(role: WorkspaceRole): boolean {
  return APPROVAL_ROLES.includes(role);
}

export function canApproveScene(role: WorkspaceRole): boolean {
  return APPROVAL_ROLES.includes(role);
}

export function canApprovePage(role: WorkspaceRole): boolean {
  return inRoles(role, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.SERIES_EDITOR, WorkspaceRole.ART_DIRECTOR]);
}

export function canApprovePanel(role: WorkspaceRole): boolean {
  return inRoles(role, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.SERIES_EDITOR, WorkspaceRole.ART_DIRECTOR]);
}

export function canResolveContinuity(role: WorkspaceRole): boolean {
  return inRoles(role, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.SERIES_EDITOR, WorkspaceRole.CONTINUITY_EDITOR]);
}

export function canExportBook(role: WorkspaceRole): boolean {
  return inRoles(role, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.SERIES_EDITOR]);
}

export function canImportMarkdown(role: WorkspaceRole): boolean {
  return inRoles(role, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.SERIES_EDITOR, WorkspaceRole.WRITER]);
}

export function canApproveImport(role: WorkspaceRole): boolean {
  return APPROVAL_ROLES.includes(role);
}

export function canManageBoard(role: WorkspaceRole): boolean {
  return inRoles(role, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.SERIES_EDITOR, WorkspaceRole.ART_DIRECTOR, WorkspaceRole.WRITER]);
}

// ---- Governance assertions ----

export function assertHumanApproval(source: string, action: string): void {
  if (source !== 'human') {
    throw new PermissionError(
      `${action} requires human approval. Source "${source}" is not permitted to approve or lock objects.`
    );
  }
}

export function assertNotAgentApproval(source: string): void {
  assertHumanApproval(source, 'Approval/lock action');
}

export function assertNotLocked(
  approvalStatus: string,
  objectType = 'Object'
): void {
  if (
    IMMUTABLE_STATUSES.includes(approvalStatus as WikiApprovalStatus) ||
    approvalStatus === 'locked'
  ) {
    throw new LockedObjectError(objectType);
  }
}

export function assertCanSelfApprove(
  authorId: string,
  approverId: string,
  allowSelfApproval: boolean,
  role: WorkspaceRole
): void {
  if (authorId === approverId && !allowSelfApproval) {
    if (!canApproveScene(role)) {
      throw new PermissionError(
        'Writers cannot approve their own content in team mode. Self-approval is disabled for this workspace.'
      );
    }
  }
}

// ---- Require helpers (throws on failure) ----

export function requireCanApproveCanon(role: WorkspaceRole | null): void {
  if (!role || !canApproveCanon(role)) {
    throw new PermissionError('You do not have permission to approve canon entries');
  }
}

export function requireCanApproveScene(role: WorkspaceRole | null): void {
  if (!role || !canApproveScene(role)) {
    throw new PermissionError('You do not have permission to approve scenes');
  }
}

export function requireCanImportMarkdown(role: WorkspaceRole | null): void {
  if (!role || !canImportMarkdown(role)) {
    throw new PermissionError('You do not have permission to import Markdown');
  }
}

export function requireCanExportBook(role: WorkspaceRole | null): void {
  if (!role || !canExportBook(role)) {
    throw new PermissionError('You do not have permission to export production packages');
  }
}
