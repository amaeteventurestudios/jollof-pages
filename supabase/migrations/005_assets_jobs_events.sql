-- ============================================================
-- MIGRATION 005: Assets, Jobs, Search, Events, Audit
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

create type job_status as enum (
  'queued', 'running', 'succeeded', 'failed', 'cancelled', 'retrying'
);

create type job_type as enum (
  'image_conversion', 'markdown_import_parse', 'markdown_import_diff',
  'wiki_export', 'story_os_export', 'continuity_validation',
  'dependency_rebuild', 'search_reindex', 'production_package_export',
  'asset_cleanup'
);

create type export_type as enum (
  'book_package', 'issue_package', 'artist_handoff', 'editor_handoff',
  'continuity_report', 'wiki_package', 'story_os_package',
  'markdown_package', 'json_package'
);

-- ============================================================
-- ASSETS
-- ============================================================

create table assets (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  series_id uuid references series(id) on delete set null,
  original_filename text not null,
  display_name text,
  mime_type text not null,
  size_bytes bigint not null,
  width integer,
  height integer,
  -- R2 storage
  r2_bucket text not null,
  r2_key text not null,
  r2_key_original text,
  r2_key_webp text,
  public_url text,
  checksum text,
  -- Metadata
  asset_type text not null default 'image', -- image | document | export | import
  role text default 'reference', -- cover | reference | portrait | panel | map | export | import
  tags jsonb default '[]',
  is_archived boolean not null default false,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  -- Usage
  usage_count integer not null default 0,
  -- Processing
  processed boolean not null default false,
  processing_error text,
  created_by uuid not null references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assets_workspace_idx on assets(workspace_id);
create index assets_series_idx on assets(series_id);
create index assets_type_idx on assets(asset_type);
create index assets_role_idx on assets(role);
create index assets_r2_key_idx on assets(r2_key);
create index assets_created_idx on assets(created_at desc);

create table asset_versions (
  id uuid primary key default uuid_generate_v4(),
  asset_id uuid not null references assets(id) on delete cascade,
  version_number integer not null,
  r2_key text not null,
  size_bytes bigint not null,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table asset_usages (
  id uuid primary key default uuid_generate_v4(),
  asset_id uuid not null references assets(id) on delete cascade,
  object_type text not null,
  object_id uuid not null,
  usage_role text default 'reference',
  created_at timestamptz not null default now(),
  unique(asset_id, object_type, object_id)
);

create index asset_usages_asset_idx on asset_usages(asset_id);
create index asset_usages_object_idx on asset_usages(object_type, object_id);

create table asset_upload_sessions (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  series_id uuid references series(id),
  r2_key text not null,
  r2_bucket text not null,
  upload_url text,
  upload_url_expires_at timestamptz,
  status text not null default 'pending', -- pending | uploaded | completed | failed
  original_filename text not null,
  expected_mime_type text,
  expected_size_bytes bigint,
  resulting_asset_id uuid references assets(id),
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '1 hour')
);

-- ============================================================
-- CHARACTER/VISUAL STATES
-- ============================================================

create table character_states (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  wiki_entry_id uuid not null references wiki_entries(id) on delete cascade,
  scene_id uuid references scenes(id) on delete set null,
  page_id uuid references pages(id) on delete set null,
  panel_id uuid references panels(id) on delete set null,
  -- Visual state
  outfit jsonb,
  hair text,
  injuries jsonb,
  weapons jsonb,
  equipment jsonb,
  emotional_state text,
  knowledge_state jsonb,
  location_context text,
  props jsonb,
  continuity_notes text,
  is_stale boolean not null default false,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index character_states_wiki_idx on character_states(wiki_entry_id);
create index character_states_scene_idx on character_states(scene_id);

-- ============================================================
-- DEPENDENCY GRAPH
-- ============================================================

create table dependency_nodes (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  object_type text not null,
  object_id uuid not null,
  is_stale boolean not null default false,
  last_validated_at timestamptz,
  created_at timestamptz not null default now(),
  unique(workspace_id, object_type, object_id)
);

create index dependency_nodes_workspace_idx on dependency_nodes(workspace_id);
create index dependency_nodes_object_idx on dependency_nodes(object_type, object_id);

create table dependency_edges (
  id uuid primary key default uuid_generate_v4(),
  source_node_id uuid not null references dependency_nodes(id) on delete cascade,
  target_node_id uuid not null references dependency_nodes(id) on delete cascade,
  relationship text not null,
  created_at timestamptz not null default now(),
  unique(source_node_id, target_node_id, relationship)
);

create index dependency_edges_source_idx on dependency_edges(source_node_id);
create index dependency_edges_target_idx on dependency_edges(target_node_id);

-- ============================================================
-- JOBS
-- ============================================================

create table jobs (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  job_type job_type not null,
  status job_status not null default 'queued',
  payload jsonb default '{}',
  result jsonb,
  error_message text,
  stage text,
  retry_count integer not null default 0,
  max_retries integer not null default 3,
  locked_by text,
  heartbeat_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index jobs_workspace_idx on jobs(workspace_id);
create index jobs_type_idx on jobs(job_type);
create index jobs_status_idx on jobs(status);
create index jobs_created_idx on jobs(created_at desc);

-- ============================================================
-- PRODUCTION EXPORTS
-- ============================================================

create table production_exports (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  series_id uuid not null references series(id) on delete cascade,
  book_id uuid references books(id),
  export_type export_type not null,
  title text not null,
  status text not null default 'pending',
  r2_bucket text,
  r2_key text,
  file_size_bytes bigint,
  manifest jsonb,
  validation_summary jsonb,
  critical_flag_count integer default 0,
  error_message text,
  approved_by uuid references profiles(id),
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index production_exports_workspace_idx on production_exports(workspace_id);
create index production_exports_series_idx on production_exports(series_id);
create index production_exports_status_idx on production_exports(status);

create table production_export_files (
  id uuid primary key default uuid_generate_v4(),
  export_id uuid not null references production_exports(id) on delete cascade,
  file_path text not null,
  file_type text,
  r2_key text,
  size_bytes bigint,
  status text default 'included',
  warning text,
  created_at timestamptz not null default now()
);

create index production_export_files_export_idx on production_export_files(export_id);

-- ============================================================
-- SEARCH INDEX
-- ============================================================

create table search_index (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  series_id uuid references series(id) on delete cascade,
  object_type text not null,
  object_id uuid not null,
  title text not null,
  body text,
  tags jsonb default '[]',
  status text,
  search_vector tsvector,
  indexed_at timestamptz not null default now(),
  unique(workspace_id, object_type, object_id)
);

create index search_index_workspace_idx on search_index(workspace_id);
create index search_index_type_idx on search_index(object_type);
create index search_index_search_idx on search_index using gin(search_vector);

create or replace function update_search_vector()
returns trigger as $$
begin
  new.search_vector := to_tsvector('english',
    coalesce(new.title, '') || ' ' ||
    coalesce(new.body, '')
  );
  return new;
end;
$$ language plpgsql;

create trigger search_index_search_update
  before insert or update on search_index
  for each row execute function update_search_vector();

-- ============================================================
-- AUDIT LOGS AND EVENTS
-- ============================================================

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete set null,
  actor_user_id uuid references profiles(id) on delete set null,
  actor_role text,
  target_type text not null,
  target_id text,
  action text not null,
  before_snapshot jsonb,
  after_snapshot jsonb,
  source text not null default 'human', -- human | import | system | external_ai | agent
  ip_address inet,
  user_agent text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index audit_logs_workspace_idx on audit_logs(workspace_id);
create index audit_logs_actor_idx on audit_logs(actor_user_id);
create index audit_logs_target_idx on audit_logs(target_type, target_id);
create index audit_logs_action_idx on audit_logs(action);
create index audit_logs_created_idx on audit_logs(created_at desc);

create table revision_events (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  object_type text not null,
  object_id uuid not null,
  changed_field text,
  before_value jsonb,
  after_value jsonb,
  triggered_by uuid references profiles(id),
  impact_summary jsonb,
  stale_objects jsonb default '[]',
  created_at timestamptz not null default now()
);

create index revision_events_workspace_idx on revision_events(workspace_id);
create index revision_events_object_idx on revision_events(object_type, object_id);
create index revision_events_created_idx on revision_events(created_at desc);

-- ============================================================
-- COMMENTS AND NOTIFICATIONS
-- ============================================================

create table comments (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  object_type text not null,
  object_id uuid not null,
  parent_comment_id uuid references comments(id),
  author_id uuid not null references profiles(id),
  body_markdown text not null,
  is_resolved boolean not null default false,
  resolved_by uuid references profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index comments_workspace_idx on comments(workspace_id);
create index comments_object_idx on comments(object_type, object_id);
create index comments_author_idx on comments(author_id);

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  notification_type text not null,
  object_type text,
  object_id uuid,
  title text not null,
  body text,
  is_read boolean not null default false,
  read_at timestamptz,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications(user_id, is_read, created_at desc);
create index notifications_workspace_idx on notifications(workspace_id);

-- ============================================================
-- ADMIN AUDIT EVENTS
-- ============================================================

create table admin_audit_events (
  id uuid primary key default uuid_generate_v4(),
  actor_user_id uuid references profiles(id),
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index admin_audit_events_created_idx on admin_audit_events(created_at desc);

-- ============================================================
-- TRIGGERS
-- ============================================================

create trigger handle_updated_at_assets before update on assets for each row execute function handle_updated_at();
create trigger handle_updated_at_character_states before update on character_states for each row execute function handle_updated_at();
create trigger handle_updated_at_jobs before update on jobs for each row execute function handle_updated_at();
create trigger handle_updated_at_production_exports before update on production_exports for each row execute function handle_updated_at();
create trigger handle_updated_at_comments before update on comments for each row execute function handle_updated_at();

-- ============================================================
-- RLS
-- ============================================================

alter table assets enable row level security;
alter table asset_versions enable row level security;
alter table asset_usages enable row level security;
alter table asset_upload_sessions enable row level security;
alter table character_states enable row level security;
alter table dependency_nodes enable row level security;
alter table dependency_edges enable row level security;
alter table jobs enable row level security;
alter table production_exports enable row level security;
alter table production_export_files enable row level security;
alter table search_index enable row level security;
alter table audit_logs enable row level security;
alter table revision_events enable row level security;
alter table comments enable row level security;
alter table notifications enable row level security;

-- Assets: members read, art_director + admin manage
create policy "assets_select" on assets for select using (is_workspace_member(workspace_id));
create policy "assets_insert" on assets for insert with check (
  workspace_member_role(workspace_id) in ('owner', 'admin', 'series_editor', 'art_director', 'writer')
);
create policy "assets_update" on assets for update using (
  workspace_member_role(workspace_id) in ('owner', 'admin', 'art_director')
);
create policy "assets_delete" on assets for delete using (
  workspace_member_role(workspace_id) in ('owner', 'admin')
);

-- Upload sessions: own only
create policy "upload_sessions_own" on asset_upload_sessions for all using (created_by = auth.uid());

-- Jobs: members read own workspace jobs
create policy "jobs_select" on jobs for select using (
  workspace_id is null or is_workspace_member(workspace_id)
);

-- Exports
create policy "production_exports_select" on production_exports for select using (is_workspace_member(workspace_id));
create policy "production_exports_manage" on production_exports for all using (
  workspace_member_role(workspace_id) in ('owner', 'admin', 'series_editor')
);

-- Search: members read
create policy "search_index_select" on search_index for select using (is_workspace_member(workspace_id));

-- Audit logs: admin+ read
create policy "audit_logs_select" on audit_logs for select using (
  workspace_id is null or workspace_member_role(workspace_id) in ('owner', 'admin')
);

-- Revision events: members read
create policy "revision_events_select" on revision_events for select using (is_workspace_member(workspace_id));

-- Comments: members read, authenticated insert
create policy "comments_select" on comments for select using (is_workspace_member(workspace_id));
create policy "comments_insert" on comments for insert with check (
  is_workspace_member(workspace_id) and workspace_member_role(workspace_id) != 'viewer'
);
create policy "comments_update_own" on comments for update using (author_id = auth.uid());

-- Notifications: own only
create policy "notifications_own" on notifications for select using (user_id = auth.uid());
create policy "notifications_update_own" on notifications for update using (user_id = auth.uid());

-- Character states
create policy "character_states_select" on character_states for select using (is_workspace_member(workspace_id));
create policy "character_states_manage" on character_states for all using (
  workspace_member_role(workspace_id) in ('owner', 'admin', 'series_editor', 'writer', 'continuity_editor', 'art_director')
);
