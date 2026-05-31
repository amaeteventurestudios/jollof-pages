# Jollof Pages — Security and RLS

## RLS Policy Design

Every workspace-owned table has Row Level Security (RLS) enabled in Supabase.

### Core Helper Functions

```sql
-- Is the current user a member of this workspace?
is_workspace_member(workspace_id uuid) → boolean

-- What is the current user's role in this workspace?
workspace_member_role(workspace_id uuid) → workspace_role
```

### Policy Pattern

```sql
-- Members can read
create policy "table_select_member" on table_name for select
  using (is_workspace_member(workspace_id));

-- Writers can insert
create policy "table_insert_writer" on table_name for insert with check (
  workspace_member_role(workspace_id) in ('owner', 'admin', 'series_editor', 'writer')
);

-- Admins can delete
create policy "table_delete_admin" on table_name for delete using (
  workspace_member_role(workspace_id) in ('owner', 'admin')
);
```

## Client vs Server Access

| Client (anon/JWT) | Server (service_role) |
|---|---|
| Supabase anon key | Supabase service role key |
| RLS enforced | RLS bypassed |
| For user-facing reads | For admin writes, audit logs, jobs |

**The service role key must NEVER be exposed to the client.**

## R2 Credential Security

- R2 credentials are environment variables loaded server-side only
- `src/lib/r2/client.ts` throws if called from `window` context
- All R2 operations are in `src/lib/r2/utils.ts` (server-only)
- Client never receives R2 keys — only signed URLs with TTL

## Sensitive Operations

These must always go through server actions or API routes:
- Asset upload (POST /api/upload)
- Markdown import (POST /api/wiki/import)
- Import approval
- Production export creation
- Role management
- Workspace deletion

## What Viewers Can Do

`viewer` role: read-only access to all workspace content
`reviewer` role: read + comment only, no edit or approval

## Audit Requirements

Every meaningful mutation produces an `audit_logs` record with:
- `actor_user_id`
- `actor_role`
- `target_type` + `target_id`
- `action`
- `source` (human | import | system | external_ai | agent)
- `before_snapshot` / `after_snapshot`
