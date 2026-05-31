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
