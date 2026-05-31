// ============================================================
// JOLLOF PAGES — PLATFORM ENUMS
// Type-safe constants matching database enums
// ============================================================

export const WorkspaceRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  SERIES_EDITOR: 'series_editor',
  WRITER: 'writer',
  CONTINUITY_EDITOR: 'continuity_editor',
  ART_DIRECTOR: 'art_director',
  REVIEWER: 'reviewer',
  VIEWER: 'viewer',
} as const;
export type WorkspaceRole = typeof WorkspaceRole[keyof typeof WorkspaceRole];

export const APPROVAL_ROLES: WorkspaceRole[] = [
  WorkspaceRole.OWNER,
  WorkspaceRole.ADMIN,
  WorkspaceRole.SERIES_EDITOR,
];

export const EDIT_ROLES: WorkspaceRole[] = [
  WorkspaceRole.OWNER,
  WorkspaceRole.ADMIN,
  WorkspaceRole.SERIES_EDITOR,
  WorkspaceRole.WRITER,
  WorkspaceRole.CONTINUITY_EDITOR,
];

export const WikiEntryType = {
  CHARACTER: 'character',
  LOCATION: 'location',
  FACTION: 'faction',
  ORGANIZATION: 'organization',
  ARTIFACT: 'artifact',
  OBJECT: 'object',
  TECHNOLOGY: 'technology',
  SPECIES: 'species',
  CREATURE: 'creature',
  EVENT: 'event',
  TIMELINE_EVENT: 'timeline_event',
  LORE: 'lore',
  RULE: 'rule',
  CULTURE: 'culture',
  LANGUAGE: 'language',
  RELIGION: 'religion',
  MAGIC_SYSTEM: 'magic_system',
  POWER_SYSTEM: 'power_system',
  VEHICLE: 'vehicle',
  WEAPON: 'weapon',
  THEME: 'theme',
  PLOT_THREAD: 'plot_thread',
  MYSTERY: 'mystery',
  PROPHECY: 'prophecy',
  CUSTOM: 'custom',
} as const;
export type WikiEntryType = typeof WikiEntryType[keyof typeof WikiEntryType];

export const WikiCanonStatus = {
  DRAFT: 'draft',
  SUGGESTED: 'suggested',
  CONFIRMED: 'confirmed',
  DISPUTED: 'disputed',
  DEPRECATED: 'deprecated',
  RETCONNED: 'retconned',
} as const;
export type WikiCanonStatus = typeof WikiCanonStatus[keyof typeof WikiCanonStatus];

export const WikiApprovalStatus = {
  DRAFT: 'draft',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  LOCKED: 'locked',
  NEEDS_REVISION: 'needs_revision',
} as const;
export type WikiApprovalStatus = typeof WikiApprovalStatus[keyof typeof WikiApprovalStatus];

export const IMMUTABLE_STATUSES: WikiApprovalStatus[] = [
  WikiApprovalStatus.APPROVED,
  WikiApprovalStatus.LOCKED,
];

export const SceneStatus = {
  OUTLINED: 'outlined',
  DRAFTED: 'drafted',
  CONTINUITY_FLAGGED: 'continuity_flagged',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  LOCKED: 'locked',
  REVISED: 'revised',
} as const;
export type SceneStatus = typeof SceneStatus[keyof typeof SceneStatus];

export const PageStatus = {
  NOT_STARTED: 'not_started',
  PLANNED: 'planned',
  DRAFTED: 'drafted',
  REVIEWED: 'reviewed',
  APPROVED: 'approved',
  REVISED: 'revised',
} as const;
export type PageStatus = typeof PageStatus[keyof typeof PageStatus];

export const PanelStatus = {
  PLANNED: 'planned',
  DESCRIBED: 'described',
  REFERENCE_ATTACHED: 'reference_attached',
  ART_READY: 'art_ready',
  APPROVED: 'approved',
  REVISED: 'revised',
} as const;
export type PanelStatus = typeof PanelStatus[keyof typeof PanelStatus];

export const ContinuityFlagSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
} as const;
export type ContinuityFlagSeverity = typeof ContinuityFlagSeverity[keyof typeof ContinuityFlagSeverity];

export const ContinuityFlagStatus = {
  OPEN: 'open',
  ACKNOWLEDGED: 'acknowledged',
  RESOLVED: 'resolved',
  OVERRIDDEN: 'overridden',
} as const;
export type ContinuityFlagStatus = typeof ContinuityFlagStatus[keyof typeof ContinuityFlagStatus];

export const JobType = {
  IMAGE_CONVERSION: 'image_conversion',
  MARKDOWN_IMPORT_PARSE: 'markdown_import_parse',
  MARKDOWN_IMPORT_DIFF: 'markdown_import_diff',
  WIKI_EXPORT: 'wiki_export',
  STORY_OS_EXPORT: 'story_os_export',
  CONTINUITY_VALIDATION: 'continuity_validation',
  DEPENDENCY_REBUILD: 'dependency_rebuild',
  SEARCH_REINDEX: 'search_reindex',
  PRODUCTION_PACKAGE_EXPORT: 'production_package_export',
  ASSET_CLEANUP: 'asset_cleanup',
} as const;
export type JobType = typeof JobType[keyof typeof JobType];

export const JobStatus = {
  QUEUED: 'queued',
  RUNNING: 'running',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  RETRYING: 'retrying',
} as const;
export type JobStatus = typeof JobStatus[keyof typeof JobStatus];

export const ExportType = {
  BOOK_PACKAGE: 'book_package',
  ISSUE_PACKAGE: 'issue_package',
  ARTIST_HANDOFF: 'artist_handoff',
  EDITOR_HANDOFF: 'editor_handoff',
  CONTINUITY_REPORT: 'continuity_report',
  WIKI_PACKAGE: 'wiki_package',
  STORY_OS_PACKAGE: 'story_os_package',
  MARKDOWN_PACKAGE: 'markdown_package',
  JSON_PACKAGE: 'json_package',
} as const;
export type ExportType = typeof ExportType[keyof typeof ExportType];

export const BoardType = {
  MOODBOARD: 'moodboard',
  CHARACTER_BOARD: 'character_board',
  LOCATION_BOARD: 'location_board',
  RESEARCH_BOARD: 'research_board',
  REFERENCE_BOARD: 'reference_board',
  PANEL_BOARD: 'panel_board',
  COVER_BOARD: 'cover_board',
  CUSTOM: 'custom',
} as const;
export type BoardType = typeof BoardType[keyof typeof BoardType];

export const AuditSource = {
  HUMAN: 'human',
  IMPORT: 'import',
  SYSTEM: 'system',
  EXTERNAL_AI: 'external_ai',
  AGENT: 'agent',
} as const;
export type AuditSource = typeof AuditSource[keyof typeof AuditSource];

export const ImportStatus = {
  PENDING: 'pending',
  PARSING: 'parsing',
  PARSED: 'parsed',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  APPLIED: 'applied',
  REJECTED: 'rejected',
  FAILED: 'failed',
} as const;
export type ImportStatus = typeof ImportStatus[keyof typeof ImportStatus];
