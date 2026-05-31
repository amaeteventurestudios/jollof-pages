// ============================================================
// MARKDOWN EXPORT SERVICE — Server-side
// ============================================================
import { getTypedAdminClient as getAdminClient } from '@/lib/supabase/typed';
import { createAuditLog } from './auditService';
import { requireCanExportBook } from './permissionService';
import type { WorkspaceRole } from '@/lib/enums';
import type { WikiEntry } from '@/lib/types/database';

export function wikiEntryToMarkdown(entry: WikiEntry): string {
  const frontmatter: Record<string, unknown> = {
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    type: entry.entry_type,
    canon_status: entry.canon_status,
    approval_status: entry.approval_status,
    version: entry.version_count,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
    ...((entry.frontmatter as Record<string, unknown>) ?? {}),
  };

  const yamlLines = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n');

  const body = entry.body_markdown ?? '';
  return `---\n${yamlLines}\n---\n\n# ${entry.title}\n\n${body}`;
}

export function wikiEntriesToMarkdownPackage(
  entries: WikiEntry[],
  seriesTitle: string
): { manifest: string; files: Array<{ filename: string; content: string }> } {
  const files = entries.map((entry) => ({
    filename: `${entry.entry_type}/${entry.slug}.md`,
    content: wikiEntryToMarkdown(entry),
  }));

  const manifest = JSON.stringify(
    {
      format: 'jollof-pages-wiki-package',
      version: '1.0',
      series: seriesTitle,
      exported_at: new Date().toISOString(),
      entry_count: entries.length,
      entries: entries.map((e) => ({
        id: e.id,
        slug: e.slug,
        title: e.title,
        type: e.entry_type,
        canon_status: e.canon_status,
        approval_status: e.approval_status,
        version: e.version_count,
        file: `${e.entry_type}/${e.slug}.md`,
      })),
    },
    null,
    2
  );

  return { manifest, files };
}

export async function exportWikiPackage(params: {
  workspaceId: string;
  seriesId: string;
  exportedBy: string;
  exportedByRole: WorkspaceRole;
  onlyApproved?: boolean;
}): Promise<{ manifest: string; files: Array<{ filename: string; content: string }> }> {
  requireCanExportBook(params.exportedByRole);

  const db = getAdminClient();

  let query = db
    .from('wiki_entries')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .eq('series_id', params.seriesId)
    .eq('is_archived', false)
    .order('entry_type', { ascending: true })
    .order('title', { ascending: true });

  if (params.onlyApproved) {
    query = query.in('approval_status', ['approved', 'locked']);
  }

  const { data: entries, error } = await query;
  if (error) throw error;

  const { data: series } = await db
    .from('series')
    .select('title')
    .eq('id', params.seriesId)
    .single();

  const packageData = wikiEntriesToMarkdownPackage(entries ?? [], series?.title ?? 'Unknown Series');

  await createAuditLog({
    workspaceId: params.workspaceId,
    actorUserId: params.exportedBy,
    actorRole: params.exportedByRole,
    targetType: 'wiki_export',
    action: 'wiki_exported',
    afterSnapshot: {
      entry_count: entries?.length ?? 0,
      only_approved: params.onlyApproved ?? false,
    },
    source: 'human',
  });

  return packageData;
}

export function generateClaudeCodeExportManifest(
  wikiFiles: Array<{ filename: string; content: string }>,
  storyOsFiles: Array<{ filename: string; content: string }>
): string {
  return JSON.stringify(
    {
      format: 'jollof-pages-claude-code-package',
      version: '1.0',
      exported_at: new Date().toISOString(),
      instructions: 'Edit Markdown/JSON files. Re-import via Jollof Pages for diff + human approval.',
      immutable: ['All approved or locked entries require human re-approval after edits'],
      wiki_files: wikiFiles.map((f) => f.filename),
      story_os_files: storyOsFiles.map((f) => f.filename),
    },
    null,
    2
  );
}
