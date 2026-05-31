# Jollof Pages — Wiki Import and Export

## Import Flow

1. User uploads `.md`, `.txt`, or `.json` file
2. File stored in R2 at `workspaces/{ws}/imports/{import_id}/{filename}`
3. `wiki_import` record created with status `pending`
4. Parser extracts: title, slug, entry type, tags, body, frontmatter, `[[Wiki Links]]`
5. Each parsed entry creates a `wiki_import_item` with diff summary
6. Unresolved `[[Wiki Links]]` tracked in `unresolved_wiki_links`
7. Import awaits human approval (status: `parsed`)
8. Human reviews diff in admin panel
9. Human approves specific items or all items
10. Approved items applied to wiki entries (create or update)
11. Approved/locked entries cannot be overwritten — rejected with reason
12. Audit logs and version snapshots created

## Matching Strategy

On re-import, entries are matched in this order:
1. By stable `id` in YAML frontmatter (most reliable)
2. By `slug` in YAML frontmatter
3. By `title` text match

Match type is recorded in `wiki_import_items.match_type`.

## Markdown Format

```markdown
---
id: entry-uuid-here          # stable ID for re-import matching
slug: zane-jaja              # URL-safe identifier
title: Zane Jaja
type: character              # wiki entry type
tags:
  - protagonist
  - human
canon_status: confirmed      # draft | suggested | confirmed | disputed | deprecated
---

# Zane Jaja

Body text in Markdown.

## Background

Internal cross-reference: [[Kira Selene]], [[Lagos Drift Zone]]
```

## Export Flow

```
POST /api/export/wiki
  → Queries wiki_entries for series
  → Converts each to Markdown with YAML frontmatter
  → Generates manifest.json with stable IDs
  → Returns file list and manifest
```

## What Cannot Be Changed by Import

| Object State | Import Behavior |
|---|---|
| `approval_status: locked` | Rejected — cannot overwrite |
| `approval_status: approved` | Shown as diff — requires human approval to apply |
| Any entry with `id` mismatch | Created as new entry |

## Supported Import Formats

Now: `.md`, `.txt`, `.json`
Planned: `.csv`, `.docx`
