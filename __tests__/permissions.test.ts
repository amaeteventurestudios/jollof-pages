import { describe, it, expect } from 'vitest';
import {
  canManageWorkspace, canManageMembers, canApproveCanon, canApproveScene,
  canApprovePanel, canResolveContinuity, canExportBook, canImportMarkdown,
  canApproveImport, canManageBoard, canManageAssets,
  assertHumanApproval, assertNotLocked, assertCanSelfApprove,
  PermissionError, LockedObjectError,
  requireWorkspaceRole,
} from '@/lib/services/permissionService';
import { WorkspaceRole, WikiApprovalStatus } from '@/lib/enums';

describe('Permission Service', () => {
  describe('canManageWorkspace', () => {
    it('owner can manage workspace', () => expect(canManageWorkspace(WorkspaceRole.OWNER)).toBe(true));
    it('admin can manage workspace', () => expect(canManageWorkspace(WorkspaceRole.ADMIN)).toBe(true));
    it('writer cannot manage workspace', () => expect(canManageWorkspace(WorkspaceRole.WRITER)).toBe(false));
    it('viewer cannot manage workspace', () => expect(canManageWorkspace(WorkspaceRole.VIEWER)).toBe(false));
  });

  describe('canApproveCanon', () => {
    it('series_editor can approve canon', () => expect(canApproveCanon(WorkspaceRole.SERIES_EDITOR)).toBe(true));
    it('writer cannot approve canon', () => expect(canApproveCanon(WorkspaceRole.WRITER)).toBe(false));
    it('reviewer cannot approve canon', () => expect(canApproveCanon(WorkspaceRole.REVIEWER)).toBe(false));
  });

  describe('canApproveScene', () => {
    it('series_editor can approve scene', () => expect(canApproveScene(WorkspaceRole.SERIES_EDITOR)).toBe(true));
    it('writer cannot approve scene', () => expect(canApproveScene(WorkspaceRole.WRITER)).toBe(false));
  });

  describe('canResolveContinuity', () => {
    it('continuity_editor can resolve flags', () => expect(canResolveContinuity(WorkspaceRole.CONTINUITY_EDITOR)).toBe(true));
    it('writer cannot resolve flags', () => expect(canResolveContinuity(WorkspaceRole.WRITER)).toBe(false));
    it('viewer cannot resolve flags', () => expect(canResolveContinuity(WorkspaceRole.VIEWER)).toBe(false));
  });

  describe('assertHumanApproval', () => {
    it('human source passes', () => {
      expect(() => assertHumanApproval('human', 'Approval')).not.toThrow();
    });
    it('agent source throws', () => {
      expect(() => assertHumanApproval('agent', 'Approval')).toThrow(PermissionError);
    });
    it('import source throws', () => {
      expect(() => assertHumanApproval('import', 'Approval')).toThrow(PermissionError);
    });
    it('system source throws', () => {
      expect(() => assertHumanApproval('system', 'Approval')).toThrow(PermissionError);
    });
  });

  describe('assertNotLocked', () => {
    it('draft status does not throw', () => {
      expect(() => assertNotLocked('draft', 'Scene')).not.toThrow();
    });
    it('approved status throws', () => {
      expect(() => assertNotLocked(WikiApprovalStatus.APPROVED, 'Wiki entry')).toThrow(LockedObjectError);
    });
    it('locked status throws', () => {
      expect(() => assertNotLocked(WikiApprovalStatus.LOCKED, 'Wiki entry')).toThrow(LockedObjectError);
    });
    it('in_review status does not throw', () => {
      expect(() => assertNotLocked('in_review', 'Scene')).not.toThrow();
    });
  });

  describe('assertCanSelfApprove - team mode', () => {
    const authorId = 'user-a';
    const sameUser = 'user-a';
    const differentUser = 'user-b';

    it('writer cannot self-approve in team mode with self-approval disabled', () => {
      expect(() =>
        assertCanSelfApprove(authorId, sameUser, false, WorkspaceRole.WRITER)
      ).toThrow(PermissionError);
    });

    it('series_editor can approve their own work (has approval role)', () => {
      // series_editor holds an approval role so self-approval is permitted even if disabled
      expect(() =>
        assertCanSelfApprove(authorId, sameUser, false, WorkspaceRole.SERIES_EDITOR)
      ).not.toThrow();
    });

    it('writer can self-approve when solo mode allows it', () => {
      expect(() =>
        assertCanSelfApprove(authorId, sameUser, true, WorkspaceRole.WRITER)
      ).not.toThrow();
    });

    it('different users never trigger self-approval check', () => {
      expect(() =>
        assertCanSelfApprove(authorId, differentUser, false, WorkspaceRole.WRITER)
      ).not.toThrow();
    });
  });

  describe('requireWorkspaceRole', () => {
    it('throws when role not in required list', () => {
      expect(() =>
        requireWorkspaceRole(WorkspaceRole.VIEWER, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN])
      ).toThrow(PermissionError);
    });

    it('passes when role is in required list', () => {
      expect(() =>
        requireWorkspaceRole(WorkspaceRole.ADMIN, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN])
      ).not.toThrow();
    });

    it('throws when role is null', () => {
      expect(() =>
        requireWorkspaceRole(null, [WorkspaceRole.OWNER])
      ).toThrow(PermissionError);
    });
  });

  describe('canExportBook', () => {
    it('series_editor can export', () => expect(canExportBook(WorkspaceRole.SERIES_EDITOR)).toBe(true));
    it('writer cannot export', () => expect(canExportBook(WorkspaceRole.WRITER)).toBe(false));
    it('art_director cannot export', () => expect(canExportBook(WorkspaceRole.ART_DIRECTOR)).toBe(false));
  });

  describe('canImportMarkdown', () => {
    it('writer can import', () => expect(canImportMarkdown(WorkspaceRole.WRITER)).toBe(true));
    it('reviewer cannot import', () => expect(canImportMarkdown(WorkspaceRole.REVIEWER)).toBe(false));
    it('viewer cannot import', () => expect(canImportMarkdown(WorkspaceRole.VIEWER)).toBe(false));
  });
});
