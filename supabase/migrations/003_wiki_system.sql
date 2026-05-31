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
