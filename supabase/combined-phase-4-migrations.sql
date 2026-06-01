-- ============================================================
-- JOLLOF PAGES — PHASE 4: COMBINED SUPABASE MIGRATIONS
-- ============================================================
-- Generated from supabase/migrations/ on 2026-06-01
--
-- Apply this file in its entirety via the Supabase SQL Editor
-- (supabase.com → your project → SQL Editor → paste → Run).
--
-- Or apply via CLI once linked:
--   npx supabase db push --db-url "postgresql://postgres:[password]@db.gsxuezwxmgbrgaaplyza.supabase.co:5432/postgres"
--
-- Migrations included IN ORDER:
--   001_identity_workspaces.sql
--   002_story_containers.sql
--   003_wiki_system.sql
--   004_planning_boards_workflow.sql
--   005_assets_jobs_events.sql
--   006_helper_functions.sql
--
-- NOTE (006): Fixed column name mismatch in increment_storage_usage:
--   workspace_usage.assets_uploaded → assets_count  (column name from 001)
--   workspace_usage.exports_created → removed       (no matching column in 001)
-- ============================================================


-- ============================================================
-- 001_identity_workspaces.sql
-- ============================================================

-- ============================================================
-- MIGRATION 001: Identity, Workspaces, Roles, Permissions
-- Jollof Pages Platform Foundation
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";
create extension if not exists "unaccent";

-- ============================================================
-- ENUMS
-- ============================================================

create type workspace_role as enum (
  'owner',
  'admin',
  'series_editor',
  'writer',
  'continuity_editor',
  'art_director',
  'reviewer',
  'viewer'
);

create type invite_status as enum (
  'pending',
  'accepted',
  'declined',
  'expired',
  'revoked'
);

create type feature_flag_status as enum (
  'enabled',
  'disabled',
  'rollout'
);

-- ============================================================
-- PROFILES
-- ============================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_r2_key text,
  avatar_url text,
  bio text,
  timezone text default 'UTC',
  locale text default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_idx on profiles(email);

-- ============================================================
-- WORKSPACES
-- ============================================================

create table workspaces (
  id uuid primary key default uuid_generate_v4(),
  slug text not null,
  name text not null,
  description text,
  owner_id uuid not null references profiles(id) on delete restrict,
  plan text not null default 'free',
  is_active boolean not null default true,
  solo_mode boolean not null default true,
  settings jsonb not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index workspaces_slug_idx on workspaces(slug);
create index workspaces_owner_idx on workspaces(owner_id);

-- ============================================================
-- WORKSPACE MEMBERS
-- ============================================================

create table workspace_members (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role workspace_role not null default 'viewer',
  invited_by uuid references profiles(id),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, user_id)
);

create index workspace_members_workspace_idx on workspace_members(workspace_id);
create index workspace_members_user_idx on workspace_members(user_id);
create index workspace_members_role_idx on workspace_members(role);

-- ============================================================
-- WORKSPACE INVITES
-- ============================================================

create table workspace_invites (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null,
  role workspace_role not null default 'viewer',
  token text not null unique,
  status invite_status not null default 'pending',
  invited_by uuid not null references profiles(id),
  accepted_by uuid references profiles(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workspace_invites_workspace_idx on workspace_invites(workspace_id);
create index workspace_invites_email_idx on workspace_invites(email);
create index workspace_invites_token_idx on workspace_invites(token);
create index workspace_invites_status_idx on workspace_invites(status);

-- ============================================================
-- WORKSPACE SETTINGS
-- ============================================================

create table workspace_settings (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null unique references workspaces(id) on delete cascade,
  -- Approval governance
  allow_self_approval boolean not null default false,
  require_reviewer_for_canon boolean not null default true,
  require_reviewer_for_scenes boolean not null default true,
  -- Continuity
  auto_run_continuity_on_draft boolean not null default false,
  block_approval_on_critical_flags boolean not null default true,
  -- Story OS
  story_os_path text default './story-os',
  -- Markdown
  markdown_import_requires_approval boolean not null default true,
  -- Storage
  max_asset_size_bytes bigint default 52428800, -- 50MB
  -- Notifications
  notification_on_review_request boolean not null default true,
  notification_on_approval boolean not null default true,
  notification_on_flag boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- STORAGE QUOTAS
-- ============================================================

create table storage_quotas (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null unique references workspaces(id) on delete cascade,
  max_storage_bytes bigint not null default 5368709120, -- 5GB
  used_storage_bytes bigint not null default 0,
  max_assets integer not null default 10000,
  asset_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- FEATURE FLAGS
-- ============================================================

create table feature_flags (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade, -- null = global
  flag_key text not null,
  status feature_flag_status not null default 'disabled',
  rollout_percentage integer default 0,
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, flag_key)
);

create index feature_flags_key_idx on feature_flags(flag_key);
create index feature_flags_workspace_idx on feature_flags(workspace_id);

-- ============================================================
-- WORKSPACE USAGE
-- ============================================================

create table workspace_usage (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  wiki_entries_count integer default 0,
  scenes_count integer default 0,
  assets_count integer default 0,
  exports_count integer default 0,
  imports_count integer default 0,
  storage_bytes_used bigint default 0,
  created_at timestamptz not null default now()
);

create index workspace_usage_workspace_period_idx on workspace_usage(workspace_id, period_start);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply to all tables with updated_at
create trigger handle_updated_at_profiles before update on profiles for each row execute function handle_updated_at();
create trigger handle_updated_at_workspaces before update on workspaces for each row execute function handle_updated_at();
create trigger handle_updated_at_workspace_members before update on workspace_members for each row execute function handle_updated_at();
create trigger handle_updated_at_workspace_invites before update on workspace_invites for each row execute function handle_updated_at();
create trigger handle_updated_at_workspace_settings before update on workspace_settings for each row execute function handle_updated_at();
create trigger handle_updated_at_storage_quotas before update on storage_quotas for each row execute function handle_updated_at();
create trigger handle_updated_at_feature_flags before update on feature_flags for each row execute function handle_updated_at();

-- ============================================================
-- RLS: Identity and Workspaces
-- ============================================================

alter table profiles enable row level security;
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table workspace_invites enable row level security;
alter table workspace_settings enable row level security;
alter table storage_quotas enable row level security;
alter table feature_flags enable row level security;
alter table workspace_usage enable row level security;

-- Profiles: users can read all profiles, edit own
create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);

-- Workspaces: members can read, owner can update
create policy "workspaces_select_member" on workspaces for select using (
  id in (select workspace_id from workspace_members where user_id = auth.uid())
);
create policy "workspaces_update_owner" on workspaces for update using (owner_id = auth.uid());
create policy "workspaces_insert_authenticated" on workspaces for insert with check (auth.uid() = owner_id);

-- Workspace members: members can see other members in same workspace
create policy "workspace_members_select" on workspace_members for select using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);
create policy "workspace_members_insert_admin" on workspace_members for insert with check (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin')
  )
);
create policy "workspace_members_update_admin" on workspace_members for update using (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin')
  )
);
create policy "workspace_members_delete_admin" on workspace_members for delete using (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin')
  )
);

-- Workspace invites
create policy "workspace_invites_select" on workspace_invites for select using (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin')
  ) or email = (select email from profiles where id = auth.uid())
);
create policy "workspace_invites_insert_admin" on workspace_invites for insert with check (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin')
  )
);

-- Settings and quotas: admin+
create policy "workspace_settings_select" on workspace_settings for select using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);
create policy "workspace_settings_update_admin" on workspace_settings for update using (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin')
  )
);

create policy "storage_quotas_select" on storage_quotas for select using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);

-- Feature flags
create policy "feature_flags_select" on feature_flags for select using (
  workspace_id is null
  or workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);
create policy "feature_flags_manage_admin" on feature_flags for all using (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role in ('owner', 'admin')
  )
);


-- ============================================================
-- 002_story_containers.sql
-- ============================================================

-- ============================================================
-- MIGRATION 002: Story Containers and Story OS
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

create type scene_status as enum (
  'outlined',
  'drafted',
  'continuity_flagged',
  'in_review',
  'approved',
  'locked',
  'revised'
);

create type page_status as enum (
  'not_started',
  'planned',
  'drafted',
  'reviewed',
  'approved',
  'revised'
);

create type panel_status as enum (
  'planned',
  'described',
  'reference_attached',
  'art_ready',
  'approved',
  'revised'
);

create type story_file_type as enum (
  'series_index',
  'book_index',
  'scene_index',
  'scene_file',
  'canon_characters',
  'canon_world',
  'canon_threads',
  'tracker_pages',
  'tracker_continuity',
  'tracker_revisions',
  'tracker_canon_suggestions',
  'tracker_plot',
  'custom'
);

-- ============================================================
-- SERIES
-- ============================================================

create table series (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  slug text not null,
  title text not null,
  tagline text,
  description text,
  genre text,
  target_books integer default 1,
  status text not null default 'active',
  story_os_path text,
  cover_asset_id uuid,
  metadata jsonb not null default '{}',
  created_by uuid not null references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, slug)
);

create index series_workspace_idx on series(workspace_id);
create index series_status_idx on series(status);
create index series_slug_idx on series(slug);

-- ============================================================
-- BOOKS
-- ============================================================

create table books (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  series_id uuid not null references series(id) on delete cascade,
  slug text not null,
  title text not null,
  issue_number integer,
  summary text,
  status text not null default 'drafting',
  pages_planned integer default 0,
  pages_approved integer default 0,
  scenes_total integer default 0,
  scenes_approved integer default 0,
  story_progress integer default 0,
  production_status text default 'outline',
  due_date date,
  metadata jsonb not null default '{}',
  created_by uuid not null references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(series_id, slug)
);

create index books_workspace_idx on books(workspace_id);
create index books_series_idx on books(series_id);
create index books_status_idx on books(status);

-- ============================================================
-- STORY FILES (Story OS JSON managed files)
-- ============================================================

create table story_files (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  series_id uuid not null references series(id) on delete cascade,
  book_id uuid references books(id) on delete set null,
  file_path text not null,
  file_type story_file_type not null,
  content_json jsonb,
  content_hash text,
  current_version_id uuid,
  locked boolean not null default false,
  locked_by uuid references profiles(id),
  locked_at timestamptz,
  created_by uuid not null references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(series_id, file_path)
);

create index story_files_workspace_idx on story_files(workspace_id);
create index story_files_series_idx on story_files(series_id);
create index story_files_book_idx on story_files(book_id);
create index story_files_type_idx on story_files(file_type);

-- ============================================================
-- STORY FILE VERSIONS
-- ============================================================

create table story_file_versions (
  id uuid primary key default uuid_generate_v4(),
  story_file_id uuid not null references story_files(id) on delete cascade,
  version_number integer not null,
  content_json jsonb not null,
  content_hash text not null,
  diff_summary text,
  created_by uuid not null references profiles(id),
  source text not null default 'human', -- human | import | system | agent
  created_at timestamptz not null default now()
);

create index story_file_versions_file_idx on story_file_versions(story_file_id);
create index story_file_versions_version_idx on story_file_versions(story_file_id, version_number);

-- Add FK back to story_files
alter table story_files add constraint story_files_current_version_fk
  foreign key (current_version_id) references story_file_versions(id) on delete set null;

-- ============================================================
-- STORY FILE LOCKS
-- ============================================================

create table story_file_locks (
  id uuid primary key default uuid_generate_v4(),
  story_file_id uuid not null unique references story_files(id) on delete cascade,
  locked_by uuid not null references profiles(id),
  locked_at timestamptz not null default now(),
  reason text,
  expires_at timestamptz
);

-- ============================================================
-- STORY FILE SNAPSHOTS
-- ============================================================

create table story_file_snapshots (
  id uuid primary key default uuid_generate_v4(),
  series_id uuid not null references series(id) on delete cascade,
  book_id uuid references books(id),
  snapshot_name text not null,
  snapshot_data jsonb not null,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create index story_file_snapshots_series_idx on story_file_snapshots(series_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

create trigger handle_updated_at_series before update on series for each row execute function handle_updated_at();
create trigger handle_updated_at_books before update on books for each row execute function handle_updated_at();
create trigger handle_updated_at_story_files before update on story_files for each row execute function handle_updated_at();

-- ============================================================
-- RLS
-- ============================================================

alter table series enable row level security;
alter table books enable row level security;
alter table story_files enable row level security;
alter table story_file_versions enable row level security;
alter table story_file_locks enable row level security;
alter table story_file_snapshots enable row level security;

-- Helper function for workspace membership check
create or replace function is_workspace_member(ws_id uuid)
returns boolean as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$ language sql security definer stable;

create or replace function workspace_member_role(ws_id uuid)
returns workspace_role as $$
  select role from workspace_members
  where workspace_id = ws_id and user_id = auth.uid()
  limit 1;
$$ language sql security definer stable;

-- Series RLS
create policy "series_select_member" on series for select using (is_workspace_member(workspace_id));
create policy "series_insert_admin" on series for insert with check (
  workspace_member_role(workspace_id) in ('owner', 'admin', 'series_editor')
);
create policy "series_update_admin" on series for update using (
  workspace_member_role(workspace_id) in ('owner', 'admin', 'series_editor')
);
create policy "series_delete_owner" on series for delete using (
  workspace_member_role(workspace_id) in ('owner', 'admin')
);

-- Books RLS
create policy "books_select_member" on books for select using (is_workspace_member(workspace_id));
create policy "books_insert_editor" on books for insert with check (
  workspace_member_role(workspace_id) in ('owner', 'admin', 'series_editor')
);
create policy "books_update_editor" on books for update using (
  workspace_member_role(workspace_id) in ('owner', 'admin', 'series_editor')
);
create policy "books_delete_admin" on books for delete using (
  workspace_member_role(workspace_id) in ('owner', 'admin')
);

-- Story files RLS (members read, writers write)
create policy "story_files_select_member" on story_files for select using (is_workspace_member(workspace_id));
create policy "story_files_insert_writer" on story_files for insert with check (
  workspace_member_role(workspace_id) in ('owner', 'admin', 'series_editor', 'writer', 'continuity_editor')
);
create policy "story_files_update_writer" on story_files for update using (
  workspace_member_role(workspace_id) in ('owner', 'admin', 'series_editor', 'writer', 'continuity_editor')
);

-- Story file versions: members read
create policy "story_file_versions_select" on story_file_versions for select using (
  exists (select 1 from story_files sf where sf.id = story_file_id and is_workspace_member(sf.workspace_id))
);

-- Snapshots
create policy "story_file_snapshots_select" on story_file_snapshots for select using (
  exists (select 1 from series s where s.id = series_id and is_workspace_member(s.workspace_id))
);


-- ============================================================
-- 003_wiki_system.sql
-- ============================================================

-- ============================================================
-- MIGRATION 003: Wiki and Canon System
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

create type wiki_entry_type as enum (
  'character', 'location', 'faction', 'organization',
  'artifact', 'object', 'technology', 'species', 'creature',
  'event', 'timeline_event', 'lore', 'rule', 'culture',
  'language', 'religion', 'magic_system', 'power_system',
  'vehicle', 'weapon', 'theme', 'plot_thread', 'mystery',
  'prophecy', 'custom'
);

create type wiki_canon_status as enum (
  'draft', 'suggested', 'confirmed', 'disputed', 'deprecated', 'retconned'
);

create type wiki_approval_status as enum (
  'draft', 'in_review', 'approved', 'locked', 'needs_revision'
);

create type wiki_relationship_type as enum (
  'appears_in', 'belongs_to', 'located_in', 'causes', 'controls',
  'used_by', 'references', 'affects', 'opposes', 'allies_with',
  'created_by', 'destroyed_by', 'related_to', 'parent_of', 'child_of', 'custom'
);

-- ============================================================
-- WIKI CATEGORIES AND TAGS
-- ============================================================

create table wiki_categories (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  series_id uuid references series(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  color text,
  icon text,
  parent_id uuid references wiki_categories(id),
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, series_id, slug)
);

create index wiki_categories_workspace_idx on wiki_categories(workspace_id);
create index wiki_categories_series_idx on wiki_categories(series_id);

create table wiki_tags (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  series_id uuid references series(id) on delete cascade,
  name text not null,
  slug text not null,
  color text,
  created_at timestamptz not null default now(),
  unique(workspace_id, series_id, slug)
);

-- ============================================================
-- WIKI TEMPLATES
-- ============================================================

create table wiki_templates (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade, -- null = global
  entry_type wiki_entry_type not null,
  name text not null,
  description text,
  default_sections jsonb default '[]',
  default_fields jsonb default '[]',
  is_system boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index wiki_templates_type_idx on wiki_templates(entry_type);
create index wiki_templates_workspace_idx on wiki_templates(workspace_id);

-- ============================================================
-- WIKI ENTRIES (core canon records)
-- ============================================================

create table wiki_entries (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  series_id uuid not null references series(id) on delete cascade,
  slug text not null,
  title text not null,
  entry_type wiki_entry_type not null,
  category_id uuid references wiki_categories(id),
  template_id uuid references wiki_templates(id),
  canon_status wiki_canon_status not null default 'draft',
  approval_status wiki_approval_status not null default 'draft',
  body_markdown text,
  body_html text,
  frontmatter jsonb default '{}',
  excerpt text,
  cover_asset_id uuid,
  sort_order integer default 0,
  is_pinned boolean not null default false,
  is_archived boolean not null default false,
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  locked_by uuid references profiles(id),
  locked_at timestamptz,
  version_count integer not null default 1,
  current_version_id uuid,
  search_vector tsvector,
  created_by uuid not null references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(series_id, slug)
);

create index wiki_entries_workspace_idx on wiki_entries(workspace_id);
create index wiki_entries_series_idx on wiki_entries(series_id);
create index wiki_entries_type_idx on wiki_entries(entry_type);
create index wiki_entries_canon_idx on wiki_entries(canon_status);
create index wiki_entries_approval_idx on wiki_entries(approval_status);
create index wiki_entries_slug_idx on wiki_entries(slug);
create index wiki_entries_category_idx on wiki_entries(category_id);
create index wiki_entries_search_idx on wiki_entries using gin(search_vector);
create index wiki_entries_updated_idx on wiki_entries(updated_at desc);

-- Full-text search update trigger
create or replace function update_wiki_entry_search()
returns trigger as $$
begin
  new.search_vector := to_tsvector('english',
    coalesce(new.title, '') || ' ' ||
    coalesce(new.excerpt, '') || ' ' ||
    coalesce(new.body_markdown, '')
  );
  return new;
end;
$$ language plpgsql;

create trigger wiki_entry_search_update
  before insert or update on wiki_entries
  for each row execute function update_wiki_entry_search();

-- ============================================================
-- WIKI ENTRY VERSIONS
-- ============================================================

create table wiki_entry_versions (
  id uuid primary key default uuid_generate_v4(),
  wiki_entry_id uuid not null references wiki_entries(id) on delete cascade,
  version_number integer not null,
  title text not null,
  body_markdown text,
  frontmatter jsonb default '{}',
  canon_status wiki_canon_status,
  approval_status wiki_approval_status,
  diff_summary text,
  change_summary text,
  source text not null default 'human', -- human | import | system | agent
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create index wiki_entry_versions_entry_idx on wiki_entry_versions(wiki_entry_id);
create index wiki_entry_versions_version_idx on wiki_entry_versions(wiki_entry_id, version_number);

alter table wiki_entries add constraint wiki_entries_current_version_fk
  foreign key (current_version_id) references wiki_entry_versions(id) on delete set null;

-- ============================================================
-- WIKI ENTRY SECTIONS
-- ============================================================

create table wiki_entry_sections (
  id uuid primary key default uuid_generate_v4(),
  wiki_entry_id uuid not null references wiki_entries(id) on delete cascade,
  title text not null,
  body_markdown text,
  sort_order integer not null default 0,
  is_collapsed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index wiki_entry_sections_entry_idx on wiki_entry_sections(wiki_entry_id);

-- ============================================================
-- WIKI ENTRY TAGS
-- ============================================================

create table wiki_entry_tags (
  wiki_entry_id uuid not null references wiki_entries(id) on delete cascade,
  tag_id uuid not null references wiki_tags(id) on delete cascade,
  primary key (wiki_entry_id, tag_id)
);

create index wiki_entry_tags_entry_idx on wiki_entry_tags(wiki_entry_id);
create index wiki_entry_tags_tag_idx on wiki_entry_tags(tag_id);

-- ============================================================
-- WIKI RELATIONSHIPS
-- ============================================================

create table wiki_relationships (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  series_id uuid not null references series(id) on delete cascade,
  source_entry_id uuid not null references wiki_entries(id) on delete cascade,
  target_entry_id uuid not null references wiki_entries(id) on delete cascade,
  relationship_type wiki_relationship_type not null,
  custom_label text,
  description text,
  sort_order integer default 0,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create index wiki_relationships_source_idx on wiki_relationships(source_entry_id);
create index wiki_relationships_target_idx on wiki_relationships(target_entry_id);
create index wiki_relationships_type_idx on wiki_relationships(relationship_type);

-- ============================================================
-- WIKI LINKS, BACKLINKS, UNRESOLVED LINKS
-- ============================================================

create table wiki_entry_links (
  id uuid primary key default uuid_generate_v4(),
  source_entry_id uuid not null references wiki_entries(id) on delete cascade,
  target_entry_id uuid not null references wiki_entries(id) on delete cascade,
  link_text text,
  created_at timestamptz not null default now(),
  unique(source_entry_id, target_entry_id)
);

create index wiki_entry_links_source_idx on wiki_entry_links(source_entry_id);
create index wiki_entry_links_target_idx on wiki_entry_links(target_entry_id);

create table wiki_backlinks (
  id uuid primary key default uuid_generate_v4(),
  entry_id uuid not null references wiki_entries(id) on delete cascade,
  referencing_entry_id uuid not null references wiki_entries(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(entry_id, referencing_entry_id)
);

create table unresolved_wiki_links (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  series_id uuid not null references series(id) on delete cascade,
  source_entry_id uuid references wiki_entries(id) on delete cascade,
  source_import_id uuid,
  link_text text not null,
  resolved boolean not null default false,
  resolved_to_entry_id uuid references wiki_entries(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index unresolved_wiki_links_series_idx on unresolved_wiki_links(series_id);
create index unresolved_wiki_links_resolved_idx on unresolved_wiki_links(resolved);

-- ============================================================
-- WIKI CUSTOM FIELDS
-- ============================================================

create table custom_fields (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  series_id uuid references series(id) on delete cascade,
  entry_type wiki_entry_type,
  field_key text not null,
  field_label text not null,
  field_type text not null default 'text', -- text, number, boolean, date, select, multiselect, url
  field_options jsonb default '[]',
  is_required boolean not null default false,
  sort_order integer default 0,
  created_at timestamptz not null default now()
);

create table custom_field_values (
  id uuid primary key default uuid_generate_v4(),
  wiki_entry_id uuid not null references wiki_entries(id) on delete cascade,
  custom_field_id uuid not null references custom_fields(id) on delete cascade,
  value_text text,
  value_number numeric,
  value_boolean boolean,
  value_date date,
  value_json jsonb,
  updated_at timestamptz not null default now(),
  unique(wiki_entry_id, custom_field_id)
);

-- ============================================================
-- WIKI MENTIONS
-- ============================================================

create table wiki_mentions (
  id uuid primary key default uuid_generate_v4(),
  mentioned_entry_id uuid not null references wiki_entries(id) on delete cascade,
  source_type text not null, -- wiki_entry | scene | comment | board
  source_id uuid not null,
  context_text text,
  created_at timestamptz not null default now()
);

create index wiki_mentions_entry_idx on wiki_mentions(mentioned_entry_id);
create index wiki_mentions_source_idx on wiki_mentions(source_type, source_id);

-- ============================================================
-- WIKI APPROVAL EVENTS
-- ============================================================

create table wiki_approval_events (
  id uuid primary key default uuid_generate_v4(),
  wiki_entry_id uuid not null references wiki_entries(id) on delete cascade,
  actor_id uuid not null references profiles(id),
  action text not null, -- submitted | approved | rejected | locked | unlocked | needs_revision
  from_status wiki_approval_status,
  to_status wiki_approval_status,
  justification text,
  created_at timestamptz not null default now()
);

create index wiki_approval_events_entry_idx on wiki_approval_events(wiki_entry_id);
create index wiki_approval_events_actor_idx on wiki_approval_events(actor_id);

-- ============================================================
-- WIKI ATTACHMENTS
-- ============================================================

create table wiki_attachments (
  id uuid primary key default uuid_generate_v4(),
  wiki_entry_id uuid not null references wiki_entries(id) on delete cascade,
  asset_id uuid not null,
  attachment_role text default 'reference', -- cover | reference | portrait | map | custom
  sort_order integer default 0,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create index wiki_attachments_entry_idx on wiki_attachments(wiki_entry_id);

-- ============================================================
-- WIKI COMMENTS
-- ============================================================

create table wiki_comments (
  id uuid primary key default uuid_generate_v4(),
  wiki_entry_id uuid not null references wiki_entries(id) on delete cascade,
  parent_comment_id uuid references wiki_comments(id),
  author_id uuid not null references profiles(id),
  body_markdown text not null,
  is_resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index wiki_comments_entry_idx on wiki_comments(wiki_entry_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

create trigger handle_updated_at_wiki_categories before update on wiki_categories for each row execute function handle_updated_at();
create trigger handle_updated_at_wiki_templates before update on wiki_templates for each row execute function handle_updated_at();
create trigger handle_updated_at_wiki_entries before update on wiki_entries for each row execute function handle_updated_at();
create trigger handle_updated_at_wiki_entry_sections before update on wiki_entry_sections for each row execute function handle_updated_at();
create trigger handle_updated_at_wiki_comments before update on wiki_comments for each row execute function handle_updated_at();

-- ============================================================
-- RLS
-- ============================================================

alter table wiki_entries enable row level security;
alter table wiki_entry_versions enable row level security;
alter table wiki_entry_sections enable row level security;
alter table wiki_categories enable row level security;
alter table wiki_tags enable row level security;
alter table wiki_entry_tags enable row level security;
alter table wiki_relationships enable row level security;
alter table wiki_entry_links enable row level security;
alter table wiki_backlinks enable row level security;
alter table unresolved_wiki_links enable row level security;
alter table custom_fields enable row level security;
alter table custom_field_values enable row level security;
alter table wiki_mentions enable row level security;
alter table wiki_approval_events enable row level security;
alter table wiki_attachments enable row level security;
alter table wiki_comments enable row level security;
alter table wiki_templates enable row level security;

-- Wiki entries
create policy "wiki_entries_select_member" on wiki_entries for select using (is_workspace_member(workspace_id));
create policy "wiki_entries_insert_writer" on wiki_entries for insert with check (
  workspace_member_role(workspace_id) in ('owner', 'admin', 'series_editor', 'writer', 'continuity_editor')
);
create policy "wiki_entries_update_writer" on wiki_entries for update using (
  workspace_member_role(workspace_id) in ('owner', 'admin', 'series_editor', 'writer', 'continuity_editor')
);
create policy "wiki_entries_delete_admin" on wiki_entries for delete using (
  workspace_member_role(workspace_id) in ('owner', 'admin')
);

-- Wiki entry versions: members read, writers insert
create policy "wiki_entry_versions_select" on wiki_entry_versions for select using (
  exists (select 1 from wiki_entries we where we.id = wiki_entry_id and is_workspace_member(we.workspace_id))
);

-- Wiki categories and tags
create policy "wiki_categories_select" on wiki_categories for select using (is_workspace_member(workspace_id));
create policy "wiki_categories_manage" on wiki_categories for all using (
  workspace_member_role(workspace_id) in ('owner', 'admin', 'series_editor')
);
create policy "wiki_tags_select" on wiki_tags for select using (is_workspace_member(workspace_id));

-- Wiki relationships: members read, writers manage
create policy "wiki_relationships_select" on wiki_relationships for select using (is_workspace_member(workspace_id));
create policy "wiki_relationships_manage" on wiki_relationships for all using (
  workspace_member_role(workspace_id) in ('owner', 'admin', 'series_editor', 'writer', 'continuity_editor')
);

-- Comments: members read, authenticated comment
create policy "wiki_comments_select" on wiki_comments for select using (
  exists (select 1 from wiki_entries we where we.id = wiki_entry_id and is_workspace_member(we.workspace_id))
);
create policy "wiki_comments_insert" on wiki_comments for insert with check (
  exists (select 1 from wiki_entries we where we.id = wiki_entry_id and is_workspace_member(we.workspace_id))
);
create policy "wiki_comments_update_own" on wiki_comments for update using (author_id = auth.uid());

-- Approval events: members read
create policy "wiki_approval_events_select" on wiki_approval_events for select using (
  exists (select 1 from wiki_entries we where we.id = wiki_entry_id and is_workspace_member(we.workspace_id))
);

-- Unresolved links
create policy "unresolved_wiki_links_select" on unresolved_wiki_links for select using (is_workspace_member(workspace_id));

-- Custom fields
create policy "custom_fields_select" on custom_fields for select using (is_workspace_member(workspace_id));
create policy "custom_fields_manage" on custom_fields for all using (
  workspace_member_role(workspace_id) in ('owner', 'admin', 'series_editor')
);
create policy "custom_field_values_select" on custom_field_values for select using (
  exists (select 1 from wiki_entries we where we.id = wiki_entry_id and is_workspace_member(we.workspace_id))
);

-- Wiki templates: global readable
create policy "wiki_templates_select" on wiki_templates for select using (
  workspace_id is null or is_workspace_member(workspace_id)
);
create policy "wiki_templates_manage_admin" on wiki_templates for all using (
  not is_system and workspace_member_role(workspace_id) in ('owner', 'admin')
);


-- ============================================================
-- 004_planning_boards_workflow.sql
-- ============================================================

-- ============================================================
-- MIGRATION 004: Planning, Boards, Workflow, Continuity
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

create type board_type as enum (
  'moodboard', 'character_board', 'location_board',
  'research_board', 'reference_board', 'panel_board',
  'cover_board', 'custom'
);

create type board_item_type as enum (
  'note', 'image', 'asset', 'wiki_entry', 'scene', 'page',
  'panel', 'location', 'character', 'link', 'checklist',
  'color_swatch', 'file'
);

create type continuity_flag_severity as enum ('info', 'warning', 'critical');
create type continuity_flag_status as enum ('open', 'acknowledged', 'resolved', 'overridden');

create type import_status as enum ('pending', 'parsing', 'parsed', 'in_review', 'approved', 'applied', 'rejected', 'failed');

-- ============================================================
-- PLANNING: Story Arcs, Plot Threads, Timeline Events, Beats
-- ============================================================

create table story_arcs (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  series_id uuid not null references series(id) on delete cascade,
  book_id uuid references books(id) on delete set null,
  title text not null,
  description text,
  arc_type text default 'main', -- main | subplot | character | thematic
  sort_order integer default 0,
  status text default 'active',
  color text,
  wiki_entry_id uuid references wiki_entries(id),
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index story_arcs_workspace_idx on story_arcs(workspace_id);
create index story_arcs_series_idx on story_arcs(series_id);

create table plot_threads (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  series_id uuid not null references series(id) on delete cascade,
  story_arc_id uuid references story_arcs(id) on delete set null,
  title text not null,
  description text,
  thread_type text default 'primary',
  status text default 'active',
  color text,
  sort_order integer default 0,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table timeline_events (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  series_id uuid not null references series(id) on delete cascade,
  wiki_entry_id uuid references wiki_entries(id),
  title text not null,
  description text,
  event_date text,
  event_order integer default 0,
  event_type text default 'story', -- story | world | character | flashback | future
  is_public boolean default true,
  color text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table story_beats (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  series_id uuid not null references series(id) on delete cascade,
  book_id uuid references books(id),
  story_arc_id uuid references story_arcs(id),
  title text not null,
  description text,
  beat_type text default 'scene', -- scene | chapter | act | turning_point | climax | resolution
  sort_order integer default 0,
  color text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table act_structures (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  title text not null,
  description text,
  act_number integer not null,
  page_start integer,
  page_end integer,
  progress integer default 0,
  status text default 'outline',
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table character_arcs (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  series_id uuid not null references series(id) on delete cascade,
  character_entry_id uuid not null references wiki_entries(id),
  story_arc_id uuid references story_arcs(id),
  title text not null,
  description text,
  arc_start_state text,
  arc_end_state text,
  sort_order integer default 0,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- Linking tables
create table thread_scene_links (
  plot_thread_id uuid not null references plot_threads(id) on delete cascade,
  scene_file_id uuid not null references story_files(id) on delete cascade,
  role text,
  primary key (plot_thread_id, scene_file_id)
);

create table timeline_scene_links (
  timeline_event_id uuid not null references timeline_events(id) on delete cascade,
  scene_file_id uuid not null references story_files(id) on delete cascade,
  primary key (timeline_event_id, scene_file_id)
);

-- ============================================================
-- VISUAL REFERENCE BOARDS
-- ============================================================

create table boards (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  series_id uuid not null references series(id) on delete cascade,
  book_id uuid references books(id),
  board_type board_type not null default 'reference_board',
  title text not null,
  description text,
  cover_asset_id uuid,
  is_archived boolean not null default false,
  version integer not null default 1,
  created_by uuid not null references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index boards_workspace_idx on boards(workspace_id);
create index boards_series_idx on boards(series_id);

create table board_items (
  id uuid primary key default uuid_generate_v4(),
  board_id uuid not null references boards(id) on delete cascade,
  item_type board_item_type not null,
  -- Position and layout
  x numeric not null default 0,
  y numeric not null default 0,
  width numeric not null default 200,
  height numeric not null default 150,
  z_index integer not null default 0,
  rotation numeric default 0,
  -- Content
  title text,
  body_markdown text,
  url text,
  color text,
  -- Linked objects
  asset_id uuid,
  wiki_entry_id uuid references wiki_entries(id) on delete set null,
  -- Grouping
  group_id uuid,
  is_locked boolean not null default false,
  metadata jsonb default '{}',
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index board_items_board_idx on board_items(board_id);
create index board_items_type_idx on board_items(item_type);

create table board_item_links (
  id uuid primary key default uuid_generate_v4(),
  source_item_id uuid not null references board_items(id) on delete cascade,
  target_item_id uuid not null references board_items(id) on delete cascade,
  label text,
  created_at timestamptz not null default now()
);

create table board_comments (
  id uuid primary key default uuid_generate_v4(),
  board_id uuid not null references boards(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body_markdown text not null,
  parent_comment_id uuid references board_comments(id),
  is_resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index board_comments_board_idx on board_comments(board_id);

-- ============================================================
-- WORKFLOW: Scenes, Pages, Panels
-- ============================================================

create table scenes (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  story_file_id uuid references story_files(id),
  story_os_scene_id text,
  title text not null,
  act_structure_id uuid references act_structures(id),
  status scene_status not null default 'outlined',
  page_start integer,
  page_end integer,
  word_count integer default 0,
  beat text,
  notes text,
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  locked_by uuid references profiles(id),
  locked_at timestamptz,
  sort_order integer default 0,
  continuity_flag_count integer default 0,
  created_by uuid not null references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index scenes_workspace_idx on scenes(workspace_id);
create index scenes_book_idx on scenes(book_id);
create index scenes_status_idx on scenes(status);
create index scenes_story_file_idx on scenes(story_file_id);

create table pages (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  scene_id uuid references scenes(id) on delete set null,
  page_number integer not null,
  status page_status not null default 'not_started',
  panel_count integer default 0,
  target_panel_count integer default 4,
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  locked_by uuid references profiles(id),
  locked_at timestamptz,
  notes text,
  created_by uuid not null references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(book_id, page_number)
);

create index pages_workspace_idx on pages(workspace_id);
create index pages_book_idx on pages(book_id);
create index pages_scene_idx on pages(scene_id);

create table panels (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  page_id uuid not null references pages(id) on delete cascade,
  scene_id uuid references scenes(id) on delete set null,
  panel_number integer not null,
  status panel_status not null default 'planned',
  shot_type text,
  environment text,
  lighting text,
  dialogue text,
  caption text,
  continuity_note text,
  director_notes text,
  characters jsonb default '[]',
  props jsonb default '[]',
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  locked_by uuid references profiles(id),
  locked_at timestamptz,
  created_by uuid not null references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(page_id, panel_number)
);

create index panels_workspace_idx on panels(workspace_id);
create index panels_page_idx on panels(page_id);
create index panels_status_idx on panels(status);

-- ============================================================
-- CONTINUITY FLAGS
-- ============================================================

create table continuity_flags (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  scene_id uuid references scenes(id) on delete cascade,
  page_id uuid references pages(id) on delete cascade,
  panel_id uuid references panels(id) on delete cascade,
  severity continuity_flag_severity not null default 'warning',
  status continuity_flag_status not null default 'open',
  description text not null,
  source text default 'system',
  overridden_by uuid references profiles(id),
  override_justification text,
  overridden_at timestamptz,
  resolved_by uuid references profiles(id),
  resolved_at timestamptz,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index continuity_flags_workspace_idx on continuity_flags(workspace_id);
create index continuity_flags_book_idx on continuity_flags(book_id);
create index continuity_flags_scene_idx on continuity_flags(scene_id);
create index continuity_flags_status_idx on continuity_flags(status);
create index continuity_flags_severity_idx on continuity_flags(severity);

-- ============================================================
-- APPROVAL EVENTS
-- ============================================================

create table approval_events (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  target_type text not null, -- wiki_entry | scene | page | panel | import | export
  target_id uuid not null,
  actor_id uuid not null references profiles(id),
  actor_role workspace_role not null,
  action text not null, -- submitted | approved | rejected | locked | needs_revision | overridden
  from_status text,
  to_status text,
  justification text,
  source text not null default 'human', -- human | system
  created_at timestamptz not null default now()
);

create index approval_events_workspace_idx on approval_events(workspace_id);
create index approval_events_target_idx on approval_events(target_type, target_id);
create index approval_events_actor_idx on approval_events(actor_id);
create index approval_events_created_idx on approval_events(created_at desc);

-- ============================================================
-- MARKDOWN IMPORTS
-- ============================================================

create table wiki_imports (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  series_id uuid not null references series(id) on delete cascade,
  status import_status not null default 'pending',
  import_name text,
  r2_bucket text not null,
  r2_key text not null,
  original_filename text not null,
  file_size_bytes bigint,
  items_count integer default 0,
  items_parsed integer default 0,
  items_approved integer default 0,
  items_rejected integer default 0,
  error_message text,
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index wiki_imports_workspace_idx on wiki_imports(workspace_id);
create index wiki_imports_status_idx on wiki_imports(status);

create table wiki_import_items (
  id uuid primary key default uuid_generate_v4(),
  import_id uuid not null references wiki_imports(id) on delete cascade,
  target_entry_id uuid references wiki_entries(id) on delete set null,
  match_type text, -- new | matched_by_id | matched_by_slug | matched_by_title
  proposed_title text,
  proposed_slug text,
  proposed_entry_type wiki_entry_type,
  proposed_body_markdown text,
  proposed_frontmatter jsonb,
  proposed_tags jsonb,
  proposed_canon_status wiki_canon_status,
  extracted_links jsonb default '[]',
  diff_summary text,
  status text not null default 'pending', -- pending | approved | rejected | applied
  rejection_reason text,
  applied_at timestamptz,
  created_at timestamptz not null default now()
);

create index wiki_import_items_import_idx on wiki_import_items(import_id);
create index wiki_import_items_status_idx on wiki_import_items(status);

-- ============================================================
-- TRIGGERS
-- ============================================================

create trigger handle_updated_at_story_arcs before update on story_arcs for each row execute function handle_updated_at();
create trigger handle_updated_at_plot_threads before update on plot_threads for each row execute function handle_updated_at();
create trigger handle_updated_at_timeline_events before update on timeline_events for each row execute function handle_updated_at();
create trigger handle_updated_at_act_structures before update on act_structures for each row execute function handle_updated_at();
create trigger handle_updated_at_boards before update on boards for each row execute function handle_updated_at();
create trigger handle_updated_at_board_items before update on board_items for each row execute function handle_updated_at();
create trigger handle_updated_at_board_comments before update on board_comments for each row execute function handle_updated_at();
create trigger handle_updated_at_scenes before update on scenes for each row execute function handle_updated_at();
create trigger handle_updated_at_pages before update on pages for each row execute function handle_updated_at();
create trigger handle_updated_at_panels before update on panels for each row execute function handle_updated_at();
create trigger handle_updated_at_continuity_flags before update on continuity_flags for each row execute function handle_updated_at();
create trigger handle_updated_at_wiki_imports before update on wiki_imports for each row execute function handle_updated_at();

-- ============================================================
-- RLS (simplified - all workspace-scoped)
-- ============================================================

alter table story_arcs enable row level security;
alter table plot_threads enable row level security;
alter table timeline_events enable row level security;
alter table story_beats enable row level security;
alter table act_structures enable row level security;
alter table character_arcs enable row level security;
alter table boards enable row level security;
alter table board_items enable row level security;
alter table board_comments enable row level security;
alter table scenes enable row level security;
alter table pages enable row level security;
alter table panels enable row level security;
alter table continuity_flags enable row level security;
alter table approval_events enable row level security;
alter table wiki_imports enable row level security;
alter table wiki_import_items enable row level security;

-- Planning: members read, writers manage
create policy "story_arcs_select" on story_arcs for select using (is_workspace_member(workspace_id));
create policy "story_arcs_manage" on story_arcs for all using (
  workspace_member_role(workspace_id) in ('owner', 'admin', 'series_editor', 'writer')
);
create policy "plot_threads_select" on plot_threads for select using (is_workspace_member(workspace_id));
create policy "plot_threads_manage" on plot_threads for all using (
  workspace_member_role(workspace_id) in ('owner', 'admin', 'series_editor', 'writer')
);
create policy "timeline_events_select" on timeline_events for select using (is_workspace_member(workspace_id));
create policy "timeline_events_manage" on timeline_events for all using (
  workspace_member_role(workspace_id) in ('owner', 'admin', 'series_editor', 'writer')
);
create policy "act_structures_select" on act_structures for select using (is_workspace_member(workspace_id));
create policy "act_structures_manage" on act_structures for all using (
  workspace_member_role(workspace_id) in ('owner', 'admin', 'series_editor', 'writer')
);

-- Boards: members read, art_director + writers manage
create policy "boards_select" on boards for select using (is_workspace_member(workspace_id));
create policy "boards_manage" on boards for all using (
  workspace_member_role(workspace_id) in ('owner', 'admin', 'series_editor', 'art_director', 'writer')
);
create policy "board_items_select" on board_items for select using (
  exists (select 1 from boards b where b.id = board_id and is_workspace_member(b.workspace_id))
);
create policy "board_items_manage" on board_items for all using (
  exists (select 1 from boards b where b.id = board_id and
    workspace_member_role(b.workspace_id) in ('owner', 'admin', 'series_editor', 'art_director', 'writer'))
);
create policy "board_comments_select" on board_comments for select using (
  exists (select 1 from boards b where b.id = board_id and is_workspace_member(b.workspace_id))
);
create policy "board_comments_insert" on board_comments for insert with check (
  exists (select 1 from boards b where b.id = board_id and is_workspace_member(b.workspace_id))
);

-- Scenes, pages, panels: members read, writers manage
create policy "scenes_select" on scenes for select using (is_workspace_member(workspace_id));
create policy "scenes_manage" on scenes for all using (
  workspace_member_role(workspace_id) in ('owner', 'admin', 'series_editor', 'writer', 'continuity_editor')
);
create policy "pages_select" on pages for select using (is_workspace_member(workspace_id));
create policy "pages_manage" on pages for all using (
  workspace_member_role(workspace_id) in ('owner', 'admin', 'series_editor', 'writer', 'art_director')
);
create policy "panels_select" on panels for select using (is_workspace_member(workspace_id));
create policy "panels_manage" on panels for all using (
  workspace_member_role(workspace_id) in ('owner', 'admin', 'series_editor', 'writer', 'art_director')
);

-- Continuity flags: members read
create policy "continuity_flags_select" on continuity_flags for select using (is_workspace_member(workspace_id));
create policy "continuity_flags_manage" on continuity_flags for all using (
  workspace_member_role(workspace_id) in ('owner', 'admin', 'series_editor', 'continuity_editor')
);

-- Approval events: members read
create policy "approval_events_select" on approval_events for select using (is_workspace_member(workspace_id));

-- Imports
create policy "wiki_imports_select" on wiki_imports for select using (is_workspace_member(workspace_id));
create policy "wiki_imports_manage" on wiki_imports for all using (
  workspace_member_role(workspace_id) in ('owner', 'admin', 'series_editor', 'writer')
);
create policy "wiki_import_items_select" on wiki_import_items for select using (
  exists (select 1 from wiki_imports wi where wi.id = import_id and is_workspace_member(wi.workspace_id))
);


-- ============================================================
-- 005_assets_jobs_events.sql
-- ============================================================

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


-- ============================================================
-- 006_helper_functions.sql
-- ============================================================

-- ============================================================
-- MIGRATION 006: Helper Functions and Counter RPCs
-- ============================================================

-- ---- increment_storage_usage ----
-- Called from assetService after a successful upload.
-- NOTE: Fixed column names to match workspace_usage schema from 001:
--   assets_uploaded  → assets_count
--   exports_created  → removed (no matching column)
create or replace function increment_storage_usage(
  p_workspace_id uuid,
  p_bytes bigint,
  p_assets integer default 1
) returns void
language plpgsql
security definer
as $$
begin
  update storage_quotas
  set
    used_storage_bytes = used_storage_bytes + p_bytes,
    asset_count        = asset_count + p_assets,
    updated_at         = now()
  where workspace_id = p_workspace_id;

  -- Also write to workspace_usage (daily rollup row)
  insert into workspace_usage (
    workspace_id, period_start, period_end,
    storage_bytes_used, assets_count
  )
  values (
    p_workspace_id,
    date_trunc('day', now()),
    date_trunc('day', now()) + interval '1 day',
    p_bytes, p_assets
  )
  on conflict (workspace_id, period_start)
  do update set
    storage_bytes_used = workspace_usage.storage_bytes_used + excluded.storage_bytes_used,
    assets_count       = workspace_usage.assets_count + excluded.assets_count;
end;
$$;

-- ---- decrement_storage_usage ----
create or replace function decrement_storage_usage(
  p_workspace_id uuid,
  p_bytes bigint,
  p_assets integer default 1
) returns void
language plpgsql
security definer
as $$
begin
  update storage_quotas
  set
    used_storage_bytes = greatest(0, used_storage_bytes - p_bytes),
    asset_count        = greatest(0, asset_count - p_assets),
    updated_at         = now()
  where workspace_id = p_workspace_id;
end;
$$;

-- ---- increment_scene_flag_count ----
-- Called from continuityService when a new continuity flag is raised.
create or replace function increment_scene_flag_count(
  p_scene_id uuid
) returns void
language plpgsql
security definer
as $$
begin
  update scenes
  set continuity_flag_count = continuity_flag_count + 1
  where id = p_scene_id;
end;
$$;

-- ---- decrement_scene_flag_count ----
create or replace function decrement_scene_flag_count(
  p_scene_id uuid
) returns void
language plpgsql
security definer
as $$
begin
  update scenes
  set continuity_flag_count = greatest(0, continuity_flag_count - 1)
  where id = p_scene_id;
end;
$$;

-- ---- increment_page_panel_count ----
-- Called from planningService when a panel is added to a page.
create or replace function increment_page_panel_count(
  p_page_id uuid
) returns void
language plpgsql
security definer
as $$
begin
  update pages
  set panel_count = panel_count + 1
  where id = p_page_id;
end;
$$;

-- ---- decrement_page_panel_count ----
create or replace function decrement_page_panel_count(
  p_page_id uuid
) returns void
language plpgsql
security definer
as $$
begin
  update pages
  set panel_count = greatest(0, panel_count - 1)
  where id = p_page_id;
end;
$$;

-- ---- increment_asset_usage_count ----
create or replace function increment_asset_usage_count(
  p_asset_id uuid
) returns void
language plpgsql
security definer
as $$
begin
  update assets
  set usage_count = usage_count + 1
  where id = p_asset_id;
end;
$$;

-- ---- workspace_usage unique constraint (if missing) ----
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'workspace_usage_workspace_period_key'
  ) then
    alter table workspace_usage add constraint workspace_usage_workspace_period_key
      unique (workspace_id, period_start);
  end if;
end;
$$;
