# Jollof Pages — Database Architecture

## Stack

| Layer | Technology | Purpose |
|---|---|---|
| Auth | Supabase Auth | User identity, JWT sessions |
| Database | Supabase Postgres | All structured metadata, permissions, wiki, planning, audit |
| File Storage | Cloudflare R2 | All uploaded assets, exports, import packages |
| Story Source | Story OS JSON | Canonical story production data |

## Core Principle

Story OS JSON files remain the authoritative source of truth for story execution data (scenes, pages, panels, character states, canon facts, page ranges). Supabase stores metadata, search indexes, permissions, wiki versions, jobs, audit logs, and references into Story OS files.

## Schema Groups

### 1. Identity and Workspaces
`profiles`, `workspaces`, `workspace_members`, `workspace_invites`, `workspace_settings`, `storage_quotas`, `feature_flags`, `workspace_usage`

### 2. Story Containers
`series`, `books`, `story_files`, `story_file_versions`, `story_file_locks`, `story_file_snapshots`

### 3. Wiki and Canon
`wiki_entries`, `wiki_entry_versions`, `wiki_entry_sections`, `wiki_categories`, `wiki_tags`, `wiki_entry_tags`, `wiki_templates`, `wiki_relationships`, `wiki_entry_links`, `wiki_backlinks`, `unresolved_wiki_links`, `custom_fields`, `custom_field_values`, `wiki_mentions`, `wiki_approval_events`, `wiki_attachments`, `wiki_comments`, `wiki_imports`, `wiki_import_items`

### 4. Planning
`story_arcs`, `plot_threads`, `timeline_events`, `story_beats`, `act_structures`, `character_arcs`, `thread_scene_links`, `timeline_scene_links`

### 5. Visual Boards
`boards`, `board_items`, `board_item_links`, `board_comments`

### 6. Workflow
`scenes`, `pages`, `panels`, `continuity_flags`, `approval_events`

### 7. Assets
`assets`, `asset_versions`, `asset_usages`, `asset_upload_sessions`

### 8. Character States
`character_states`

### 9. Dependency Graph
`dependency_nodes`, `dependency_edges`

### 10. Jobs
`jobs`

### 11. Exports
`production_exports`, `production_export_files`

### 12. Search
`search_index`

### 13. Audit and Events
`audit_logs`, `revision_events`, `comments`, `notifications`, `admin_audit_events`

## Running Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref <your-project-ref>

# Push all migrations
supabase db push

# Or run locally
supabase start
supabase db reset
```

## Generating TypeScript Types

```bash
npx supabase gen types typescript --linked > src/lib/types/database.generated.ts
```

## RLS Policy Design

All workspace-owned tables have Row Level Security enabled. Access is gated on `workspace_members` role checks using helper functions `is_workspace_member()` and `workspace_member_role()`.

Service-role operations (admin client) bypass RLS and must only be called from server-side code.
