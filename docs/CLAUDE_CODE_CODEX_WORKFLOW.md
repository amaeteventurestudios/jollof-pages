# Claude Code & Codex External Editing Workflow

Jollof Pages supports safe external editing by Claude Code, Codex, or any structured AI development tool using a structured export → edit → re-import → diff → human approval flow.

## Core Rule

**AI tools may edit. Humans approve. The system enforces.**

No external tool can bypass the approval gate. Changes to approved or locked entries are rejected. Every re-import generates a structured diff before applying.

## Export for External Editing

### Export wiki package (Markdown)
```
POST /api/export/wiki?workspace_id=...&series_id=...&only_approved=true
```

This produces:
- One `.md` file per wiki entry (with YAML frontmatter containing stable IDs)
- `manifest.json` with entry index, IDs, slugs, versions, and canon statuses

### Export combined Claude Code package
```
POST /api/export/claude-code?workspace_id=...&series_id=...
```

Produces wiki Markdown + Story OS JSON + manifest with editing instructions.

## Editing Rules for Claude Code / Codex

When editing exported files:

1. **Do not change the `id` field** — this is the stable match key for re-import
2. **Do not change the `slug` field** unless intentionally renaming (will create a new entry)
3. **Update the body and frontmatter freely** — the diff engine will surface changes
4. **Use `[[Wiki Link]]` syntax** for internal cross-references
5. **Do not set `approval_status: approved` or `approval_status: locked`** — this is ignored on import
6. **Do not delete files** to delete entries — use `canon_status: deprecated` or `is_archived: true`
7. **Add new entries** by creating new `.md` files with a unique `slug` in frontmatter

## Re-import Flow

### 1. Upload edited package
```
POST /api/wiki/import?workspace_id=...&series_id=...
Content-Type: multipart/form-data
Body: file=<edited-file.md>
```

### 2. System parses and diffs
The import service:
- Parses YAML frontmatter
- Matches entries by `id` → `slug` → `title`
- Generates a structured diff per entry
- Extracts `[[Wiki Links]]` and tracks unresolved links
- Creates `wiki_import_items` with `status: pending`

### 3. Human reviews diff in Jollof Pages
The import appears in the Review Queue and Wiki Import admin panel.
Each item shows:
- Before/after diff
- Match type (new, matched, unresolvable)
- Extracted wiki links
- Proposed canon status

### 4. Human approves
```
POST /api/wiki/import/approve
Body: { importId: "...", approvedItemIds: ["..."] }
```

Approved items are written to the database. Approved/locked entries cannot be overwritten.

## What Cannot Be Overwritten by Import

- **Locked entries** (`approval_status: locked`) — blocked entirely
- **Approved entries** — will show as diff items requiring explicit human approval to apply

## Story OS Files

Story OS JSON files can also be exported and re-imported via the same flow. The `storyOsService` validates all writes, creates version records, and prevents dangling references.

```
POST /api/export/story-os?workspace_id=...&series_id=...
```

## Audit Trail

Every import, diff, approval, and write creates:
- `wiki_import` record
- `wiki_import_items` diff records
- `audit_log` entries with `source: import`
- `wiki_entry_versions` snapshots
