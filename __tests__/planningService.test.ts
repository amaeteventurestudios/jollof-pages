import { describe, it, expect } from 'vitest';
import { SceneStatus, PageStatus, PanelStatus } from '@/lib/enums';
import {
  requireWorkspaceRole, PermissionError,
} from '@/lib/services/permissionService';
import { WorkspaceRole, EDIT_ROLES, APPROVAL_ROLES } from '@/lib/enums';

// Planning service integrates with DB — test permission rules and enum validity
describe('Scene status enum', () => {
  it('has all required scene statuses', () => {
    expect(SceneStatus.OUTLINED).toBe('outlined');
    expect(SceneStatus.DRAFTED).toBe('drafted');
    expect(SceneStatus.IN_REVIEW).toBe('in_review');
    expect(SceneStatus.APPROVED).toBe('approved');
    expect(SceneStatus.LOCKED).toBe('locked');
    expect(SceneStatus.REVISED).toBe('revised');
    expect(SceneStatus.CONTINUITY_FLAGGED).toBe('continuity_flagged');
  });
});

describe('Page status enum', () => {
  it('has all required page statuses', () => {
    expect(PageStatus.NOT_STARTED).toBe('not_started');
    expect(PageStatus.PLANNED).toBe('planned');
    expect(PageStatus.DRAFTED).toBe('drafted');
    expect(PageStatus.REVIEWED).toBe('reviewed');
    expect(PageStatus.APPROVED).toBe('approved');
    expect(PageStatus.REVISED).toBe('revised');
  });
});

describe('Panel status enum', () => {
  it('has all required panel statuses', () => {
    expect(PanelStatus.PLANNED).toBe('planned');
    expect(PanelStatus.DESCRIBED).toBe('described');
    expect(PanelStatus.REFERENCE_ATTACHED).toBe('reference_attached');
    expect(PanelStatus.ART_READY).toBe('art_ready');
    expect(PanelStatus.APPROVED).toBe('approved');
    expect(PanelStatus.REVISED).toBe('revised');
  });
});

describe('Planning role permissions', () => {
  it('writer is in EDIT_ROLES', () => {
    expect(EDIT_ROLES).toContain(WorkspaceRole.WRITER);
  });

  it('viewer is not in EDIT_ROLES', () => {
    expect(EDIT_ROLES).not.toContain(WorkspaceRole.VIEWER);
  });

  it('reviewer is not in EDIT_ROLES', () => {
    expect(EDIT_ROLES).not.toContain(WorkspaceRole.REVIEWER);
  });

  it('owner can create story arcs (in EDIT_ROLES)', () => {
    expect(() =>
      requireWorkspaceRole(WorkspaceRole.OWNER, EDIT_ROLES, 'create story arcs')
    ).not.toThrow();
  });

  it('viewer cannot create story arcs', () => {
    expect(() =>
      requireWorkspaceRole(WorkspaceRole.VIEWER, EDIT_ROLES, 'create story arcs')
    ).toThrow(PermissionError);
  });

  it('reviewer cannot create scenes', () => {
    expect(() =>
      requireWorkspaceRole(WorkspaceRole.REVIEWER, EDIT_ROLES, 'create scenes')
    ).toThrow(PermissionError);
  });
});

describe('Planning approval permissions', () => {
  it('series_editor can approve (in APPROVAL_ROLES)', () => {
    expect(APPROVAL_ROLES).toContain(WorkspaceRole.SERIES_EDITOR);
  });

  it('writer cannot delete story arcs (requires APPROVAL_ROLES)', () => {
    expect(() =>
      requireWorkspaceRole(WorkspaceRole.WRITER, APPROVAL_ROLES, 'delete story arcs')
    ).toThrow(PermissionError);
  });
});

describe('Scene status transition guard', () => {
  it('assertNotLocked blocks LOCKED scene', async () => {
    const { assertNotLocked, LockedObjectError } = await import('@/lib/services/permissionService');
    expect(() =>
      assertNotLocked(SceneStatus.LOCKED, 'Scene')
    ).toThrow(LockedObjectError);
  });

  it('assertNotLocked blocks APPROVED scene', async () => {
    const { assertNotLocked, LockedObjectError } = await import('@/lib/services/permissionService');
    expect(() =>
      assertNotLocked(SceneStatus.APPROVED, 'Scene')
    ).toThrow(LockedObjectError);
  });

  it('assertNotLocked allows DRAFTED scene', async () => {
    const { assertNotLocked } = await import('@/lib/services/permissionService');
    expect(() =>
      assertNotLocked(SceneStatus.DRAFTED, 'Scene')
    ).not.toThrow();
  });

  it('assertNotLocked allows IN_REVIEW scene', async () => {
    const { assertNotLocked } = await import('@/lib/services/permissionService');
    expect(() =>
      assertNotLocked(SceneStatus.IN_REVIEW, 'Scene')
    ).not.toThrow();
  });
});
