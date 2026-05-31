# Jollof Pages — Roles and Permissions

## Role Hierarchy

| Role | Level | Description |
|---|---|---|
| `owner` | 1 | Full workspace control. Cannot be removed. |
| `admin` | 2 | Manages members, assets, settings. Cannot delete workspace. |
| `series_editor` | 3 | Approves canon, scenes, pages, production readiness. |
| `writer` | 4 | Drafts and submits scenes, notes, wiki proposals, revisions. |
| `continuity_editor` | 5 | Resolves continuity flags. Can override warnings with justification. |
| `art_director` | 5 | Approves visual references, boards, panel visual readiness, art handoff. |
| `reviewer` | 6 | Comment only. Cannot edit or approve. |
| `viewer` | 7 | Read-only. Cannot comment, edit, or approve. |

## Permission Matrix

| Action | owner | admin | series_editor | writer | continuity_editor | art_director | reviewer | viewer |
|---|---|---|---|---|---|---|---|---|
| Manage workspace | ✓ | ✓ | | | | | | |
| Manage members | ✓ | ✓ | | | | | | |
| Approve canon/wiki | ✓ | ✓ | ✓ | | | | | |
| Approve scenes | ✓ | ✓ | ✓ | | | | | |
| Approve pages | ✓ | ✓ | ✓ | | | | ✓ | |
| Approve panels | ✓ | ✓ | ✓ | | | ✓ | | |
| Resolve continuity flags | ✓ | ✓ | ✓ | | ✓ | | | |
| Manage boards | ✓ | ✓ | ✓ | ✓ | | ✓ | | |
| Import Markdown | ✓ | ✓ | ✓ | ✓ | | | | |
| Approve import | ✓ | ✓ | ✓ | | | | | |
| Export production | ✓ | ✓ | ✓ | | | | | |
| Manage assets | ✓ | ✓ | | | | ✓ | | |
| Draft/edit | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | |
| Comment | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| Read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## Solo Mode

In solo mode, the single workspace owner holds all roles simultaneously. `assertCanSelfApprove()` passes for solo owners regardless of content authorship.

## Team Mode

In team mode:
- Writers cannot approve their own scenes unless `allow_self_approval` is enabled in workspace settings
- Series editors can approve their own scenes (they hold an approval role)
- All approvals must be from a human — agents and imports cannot approve

## Approval Governance

```typescript
// Always check before any approval action:
assertHumanApproval(source, 'Scene approval');
requireCanApproveScene(actorRole);
assertNotLocked(currentStatus, 'Scene');
assertCanSelfApprove(authorId, approverId, settings.allow_self_approval, actorRole);
```

## Implementation

Permission helpers are in `src/lib/services/permissionService.ts`.
Database RLS policies enforce workspace isolation in `supabase/migrations/`.
