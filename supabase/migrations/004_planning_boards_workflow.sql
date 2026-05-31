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
