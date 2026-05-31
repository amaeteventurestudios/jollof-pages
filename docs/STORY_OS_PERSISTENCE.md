# Jollof Pages — Story OS Persistence

## Story OS is the Source of Truth

Story OS JSON files are the canonical source for:
- Scene drafts and metadata
- Page ranges and assignments
- Panel breakdowns
- Character states per scene/panel
- Canon suggestions (tracker files)
- Continuity checklist results
- Plot progress

Supabase mirrors metadata for search, permissions, and UI state.

## Write Rules

All Story OS writes go through `storyOsService`:

1. Check file exists → create if not
2. Check locked → reject if locked
3. Hash content → skip if identical
4. Write content to `story_files.content_json`
5. Create `story_file_versions` record with version number
6. Update `story_files.current_version_id`
7. Write audit log

**No direct database mutations of canonical story data outside the service layer.**

## Version History

Every write creates a versioned snapshot. Versions can be:
- Browsed in the admin panel
- Diffed against any previous version
- Restored (creates a new write, not a rollback)

## Locking

Files can be locked by `series_editor` or above. Locked files cannot be written without explicit revision flow.

## File Types

```
story_files.file_type values:
  series_index        → series-level index
  book_index          → book-level index
  scene_index         → scene_index.json
  scene_file          → individual scene file
  canon_characters    → canon_characters.json
  canon_world         → canon_world.json
  canon_threads       → canon_threads.json
  tracker_pages       → tracker_pages.json (page ranges authority)
  tracker_continuity  → continuity_checklist.json
  tracker_revisions   → tracker_revisions.json
  tracker_canon_suggestions → tracker_canon_suggestions.json
  tracker_plot        → tracker_plot.json
  custom              → any other file
```
