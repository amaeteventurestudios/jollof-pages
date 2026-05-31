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
