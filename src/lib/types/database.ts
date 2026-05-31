// ============================================================
// JOLLOF PAGES — Database Types
// Hand-maintained until supabase gen types is run
// Run: npx supabase gen types typescript --linked > src/lib/types/database.generated.ts
// ============================================================

import type {
  WorkspaceRole, WikiEntryType, WikiCanonStatus, WikiApprovalStatus,
  SceneStatus, PageStatus, PanelStatus,
  ContinuityFlagSeverity, ContinuityFlagStatus,
  JobType, JobStatus, ExportType, BoardType, AuditSource, ImportStatus
} from '@/lib/enums';

// ---- Profiles ----
export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_r2_key: string | null;
  avatar_url: string | null;
  bio: string | null;
  timezone: string;
  locale: string;
  created_at: string;
  updated_at: string;
}

// ---- Workspaces ----
export interface Workspace {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  owner_id: string;
  plan: string;
  is_active: boolean;
  solo_mode: boolean;
  settings: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  invited_by: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  profile?: Profile;
}

export interface WorkspaceInvite {
  id: string;
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';
  invited_by: string;
  accepted_by: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceSettings {
  id: string;
  workspace_id: string;
  allow_self_approval: boolean;
  require_reviewer_for_canon: boolean;
  require_reviewer_for_scenes: boolean;
  auto_run_continuity_on_draft: boolean;
  block_approval_on_critical_flags: boolean;
  story_os_path: string | null;
  markdown_import_requires_approval: boolean;
  max_asset_size_bytes: number;
  notification_on_review_request: boolean;
  notification_on_approval: boolean;
  notification_on_flag: boolean;
  created_at: string;
  updated_at: string;
}

export interface StorageQuota {
  id: string;
  workspace_id: string;
  max_storage_bytes: number;
  used_storage_bytes: number;
  max_assets: number;
  asset_count: number;
  created_at: string;
  updated_at: string;
}

// ---- Story Containers ----
export interface Series {
  id: string;
  workspace_id: string;
  slug: string;
  title: string;
  tagline: string | null;
  description: string | null;
  genre: string | null;
  target_books: number;
  status: string;
  story_os_path: string | null;
  cover_asset_id: string | null;
  metadata: Record<string, unknown>;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: string;
  workspace_id: string;
  series_id: string;
  slug: string;
  title: string;
  issue_number: number | null;
  summary: string | null;
  status: string;
  pages_planned: number;
  pages_approved: number;
  scenes_total: number;
  scenes_approved: number;
  story_progress: number;
  production_status: string;
  due_date: string | null;
  metadata: Record<string, unknown>;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoryFile {
  id: string;
  workspace_id: string;
  series_id: string;
  book_id: string | null;
  file_path: string;
  file_type: string;
  content_json: Record<string, unknown> | null;
  content_hash: string | null;
  current_version_id: string | null;
  locked: boolean;
  locked_by: string | null;
  locked_at: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoryFileVersion {
  id: string;
  story_file_id: string;
  version_number: number;
  content_json: Record<string, unknown>;
  content_hash: string;
  diff_summary: string | null;
  created_by: string;
  source: AuditSource;
  created_at: string;
}

// ---- Wiki ----
export interface WikiEntry {
  id: string;
  workspace_id: string;
  series_id: string;
  slug: string;
  title: string;
  entry_type: WikiEntryType;
  category_id: string | null;
  template_id: string | null;
  canon_status: WikiCanonStatus;
  approval_status: WikiApprovalStatus;
  body_markdown: string | null;
  body_html: string | null;
  frontmatter: Record<string, unknown>;
  excerpt: string | null;
  cover_asset_id: string | null;
  sort_order: number;
  is_pinned: boolean;
  is_archived: boolean;
  approved_by: string | null;
  approved_at: string | null;
  locked_by: string | null;
  locked_at: string | null;
  version_count: number;
  current_version_id: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WikiEntryVersion {
  id: string;
  wiki_entry_id: string;
  version_number: number;
  title: string;
  body_markdown: string | null;
  frontmatter: Record<string, unknown>;
  canon_status: WikiCanonStatus | null;
  approval_status: WikiApprovalStatus | null;
  diff_summary: string | null;
  change_summary: string | null;
  source: AuditSource;
  created_by: string;
  created_at: string;
}

export interface WikiRelationship {
  id: string;
  workspace_id: string;
  series_id: string;
  source_entry_id: string;
  target_entry_id: string;
  relationship_type: string;
  custom_label: string | null;
  description: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
}

export interface UnresolvedWikiLink {
  id: string;
  workspace_id: string;
  series_id: string;
  source_entry_id: string | null;
  source_import_id: string | null;
  link_text: string;
  resolved: boolean;
  resolved_to_entry_id: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface WikiImport {
  id: string;
  workspace_id: string;
  series_id: string;
  status: ImportStatus;
  import_name: string | null;
  r2_bucket: string;
  r2_key: string;
  original_filename: string;
  file_size_bytes: number | null;
  items_count: number;
  items_parsed: number;
  items_approved: number;
  items_rejected: number;
  error_message: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WikiImportItem {
  id: string;
  import_id: string;
  target_entry_id: string | null;
  match_type: string | null;
  proposed_title: string | null;
  proposed_slug: string | null;
  proposed_entry_type: WikiEntryType | null;
  proposed_body_markdown: string | null;
  proposed_frontmatter: Record<string, unknown> | null;
  proposed_tags: string[] | null;
  proposed_canon_status: WikiCanonStatus | null;
  extracted_links: string[];
  diff_summary: string | null;
  status: string;
  rejection_reason: string | null;
  applied_at: string | null;
  created_at: string;
}

// ---- Workflow ----
export interface Scene {
  id: string;
  workspace_id: string;
  book_id: string;
  story_file_id: string | null;
  story_os_scene_id: string | null;
  title: string;
  act_structure_id: string | null;
  status: SceneStatus;
  page_start: number | null;
  page_end: number | null;
  word_count: number;
  beat: string | null;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  locked_by: string | null;
  locked_at: string | null;
  sort_order: number;
  continuity_flag_count: number;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Page {
  id: string;
  workspace_id: string;
  book_id: string;
  scene_id: string | null;
  page_number: number;
  status: PageStatus;
  panel_count: number;
  target_panel_count: number;
  approved_by: string | null;
  approved_at: string | null;
  locked_by: string | null;
  locked_at: string | null;
  notes: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Panel {
  id: string;
  workspace_id: string;
  page_id: string;
  scene_id: string | null;
  panel_number: number;
  status: PanelStatus;
  shot_type: string | null;
  environment: string | null;
  lighting: string | null;
  dialogue: string | null;
  caption: string | null;
  continuity_note: string | null;
  director_notes: string | null;
  characters: string[];
  props: string[];
  approved_by: string | null;
  approved_at: string | null;
  locked_by: string | null;
  locked_at: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContinuityFlag {
  id: string;
  workspace_id: string;
  book_id: string;
  scene_id: string | null;
  page_id: string | null;
  panel_id: string | null;
  severity: ContinuityFlagSeverity;
  status: ContinuityFlagStatus;
  description: string;
  source: string;
  overridden_by: string | null;
  override_justification: string | null;
  overridden_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovalEvent {
  id: string;
  workspace_id: string;
  target_type: string;
  target_id: string;
  actor_id: string;
  actor_role: WorkspaceRole;
  action: string;
  from_status: string | null;
  to_status: string | null;
  justification: string | null;
  source: AuditSource;
  created_at: string;
}

// ---- Assets ----
export interface Asset {
  id: string;
  workspace_id: string;
  series_id: string | null;
  original_filename: string;
  display_name: string | null;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  r2_bucket: string;
  r2_key: string;
  r2_key_original: string | null;
  r2_key_webp: string | null;
  public_url: string | null;
  checksum: string | null;
  asset_type: string;
  role: string;
  tags: string[];
  is_archived: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  usage_count: number;
  processed: boolean;
  processing_error: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Jobs ----
export interface Job {
  id: string;
  workspace_id: string | null;
  job_type: JobType;
  status: JobStatus;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error_message: string | null;
  stage: string | null;
  retry_count: number;
  max_retries: number;
  locked_by: string | null;
  heartbeat_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Exports ----
export interface ProductionExport {
  id: string;
  workspace_id: string;
  series_id: string;
  book_id: string | null;
  export_type: ExportType;
  title: string;
  status: string;
  r2_bucket: string | null;
  r2_key: string | null;
  file_size_bytes: number | null;
  manifest: Record<string, unknown> | null;
  validation_summary: Record<string, unknown> | null;
  critical_flag_count: number;
  error_message: string | null;
  approved_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ---- Audit ----
export interface AuditLog {
  id: string;
  workspace_id: string | null;
  actor_user_id: string | null;
  actor_role: string | null;
  target_type: string;
  target_id: string | null;
  action: string;
  before_snapshot: Record<string, unknown> | null;
  after_snapshot: Record<string, unknown> | null;
  source: AuditSource;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RevisionEvent {
  id: string;
  workspace_id: string;
  object_type: string;
  object_id: string;
  changed_field: string | null;
  before_value: unknown;
  after_value: unknown;
  triggered_by: string | null;
  impact_summary: Record<string, unknown> | null;
  stale_objects: unknown[];
  created_at: string;
}

// ---- Boards ----
export interface Board {
  id: string;
  workspace_id: string;
  series_id: string;
  book_id: string | null;
  board_type: BoardType;
  title: string;
  description: string | null;
  cover_asset_id: string | null;
  is_archived: boolean;
  version: number;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoardItem {
  id: string;
  board_id: string;
  item_type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
  rotation: number;
  title: string | null;
  body_markdown: string | null;
  url: string | null;
  color: string | null;
  asset_id: string | null;
  wiki_entry_id: string | null;
  group_id: string | null;
  is_locked: boolean;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}
