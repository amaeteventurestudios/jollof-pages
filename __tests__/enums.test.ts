import { describe, it, expect } from 'vitest';
import {
  WorkspaceRole, WikiCanonStatus, WikiApprovalStatus,
  SceneStatus, PanelStatus, JobType, ExportType,
  APPROVAL_ROLES, EDIT_ROLES, IMMUTABLE_STATUSES,
} from '@/lib/enums';

describe('Enums', () => {
  it('APPROVAL_ROLES includes owner, admin, series_editor', () => {
    expect(APPROVAL_ROLES).toContain(WorkspaceRole.OWNER);
    expect(APPROVAL_ROLES).toContain(WorkspaceRole.ADMIN);
    expect(APPROVAL_ROLES).toContain(WorkspaceRole.SERIES_EDITOR);
    expect(APPROVAL_ROLES).not.toContain(WorkspaceRole.WRITER);
    expect(APPROVAL_ROLES).not.toContain(WorkspaceRole.VIEWER);
  });

  it('EDIT_ROLES includes writer and continuity_editor', () => {
    expect(EDIT_ROLES).toContain(WorkspaceRole.WRITER);
    expect(EDIT_ROLES).toContain(WorkspaceRole.CONTINUITY_EDITOR);
    expect(EDIT_ROLES).not.toContain(WorkspaceRole.VIEWER);
    expect(EDIT_ROLES).not.toContain(WorkspaceRole.REVIEWER);
  });

  it('IMMUTABLE_STATUSES blocks approved and locked', () => {
    expect(IMMUTABLE_STATUSES).toContain(WikiApprovalStatus.APPROVED);
    expect(IMMUTABLE_STATUSES).toContain(WikiApprovalStatus.LOCKED);
    expect(IMMUTABLE_STATUSES).not.toContain(WikiApprovalStatus.DRAFT);
    expect(IMMUTABLE_STATUSES).not.toContain(WikiApprovalStatus.IN_REVIEW);
  });

  it('SceneStatus has all required states', () => {
    expect(SceneStatus.OUTLINED).toBeDefined();
    expect(SceneStatus.APPROVED).toBeDefined();
    expect(SceneStatus.LOCKED).toBeDefined();
    expect(SceneStatus.REVISED).toBeDefined();
    expect(SceneStatus.CONTINUITY_FLAGGED).toBeDefined();
  });

  it('WikiCanonStatus has expected values', () => {
    expect(WikiCanonStatus.DRAFT).toBe('draft');
    expect(WikiCanonStatus.CONFIRMED).toBe('confirmed');
    expect(WikiCanonStatus.DISPUTED).toBe('disputed');
    expect(WikiCanonStatus.RETCONNED).toBe('retconned');
  });

  it('ExportType includes all expected types', () => {
    expect(ExportType.BOOK_PACKAGE).toBeDefined();
    expect(ExportType.ARTIST_HANDOFF).toBeDefined();
    expect(ExportType.WIKI_PACKAGE).toBeDefined();
    expect(ExportType.STORY_OS_PACKAGE).toBeDefined();
    expect(ExportType.MARKDOWN_PACKAGE).toBeDefined();
  });

  it('all roles have unique string values', () => {
    const values = Object.values(WorkspaceRole);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});
