// ============================================================
// MARKDOWN IMPORT SERVICE — Server-side
// ============================================================
import matter from 'gray-matter';
import { getTypedAdminClient as getAdminClient } from '@/lib/supabase/typed';
import { createAuditLog } from './auditService';
import { assertHumanApproval, assertNotLocked, requireCanImportMarkdown } from './permissionService';
import { WikiCanonStatus, ImportStatus, type WikiEntryType } from '@/lib/enums';
import type { WorkspaceRole } from '@/lib/enums';
import type { WikiImport, WikiImportItem } from '@/lib/types/database';

interface ParsedMarkdownEntry {
  title: string;
  slug: string;
  entryType: WikiEntryType;
  bodyMarkdown: string;
  frontmatter: Record<string, unknown>;
  tags: string[];
  extractedLinks: string[];
  canonStatus: WikiCanonStatus;
}

// ---- Markdown Parsing ----

export function parseMarkdownFile(content: string): ParsedMarkdownEntry {
  const { data: frontmatter, content: body } = matter(content);

  const title = (frontmatter.title as string) || extractTitleFromBody(body) || 'Untitled';
  const slug = generateSlug((frontmatter.slug as string) || title);
  const entryType = (frontmatter.type as WikiEntryType) || 'custom';
  const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags as string[] : [];
  const canonStatus = (frontmatter.canon_status as WikiCanonStatus) || WikiCanonStatus.DRAFT;

  // Extract [[Wiki Links]]
  const linkMatches = body.match(/\[\[([^\]]+)\]\]/g) ?? [];
  const extractedLinks = linkMatches.map((m) => m.slice(2, -2).trim());

  const keysToOmit = new Set(['title', 'slug', 'type', 'tags', 'canon_status']);
  const restFrontmatter = Object.fromEntries(
    Object.entries(frontmatter).filter(([k]) => !keysToOmit.has(k))
  );

  return {
    title,
    slug,
    entryType,
    bodyMarkdown: body.trim(),
    frontmatter: restFrontmatter,
    tags,
    extractedLinks,
    canonStatus,
  };
}

function extractTitleFromBody(body: string): string | null {
  const match = body.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : null;
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function generateDiffSummary(
  before: Partial<ParsedMarkdownEntry> | null,
  after: ParsedMarkdownEntry
): string {
  if (!before) return 'New entry — no previous version';

  const changes: string[] = [];
  if (before.title !== after.title) changes.push(`Title: "${before.title}" → "${after.title}"`);
  if (before.entryType !== after.entryType) changes.push(`Type: ${before.entryType} → ${after.entryType}`);
  if (before.canonStatus !== after.canonStatus) changes.push(`Canon status: ${before.canonStatus} → ${after.canonStatus}`);

  const bodyLengthDiff = (after.bodyMarkdown?.length ?? 0) - (before.bodyMarkdown?.length ?? 0);
  if (bodyLengthDiff !== 0) {
    changes.push(`Body: ${bodyLengthDiff > 0 ? '+' : ''}${bodyLengthDiff} characters`);
  }

  return changes.length > 0 ? changes.join('; ') : 'No significant changes';
}

// ---- Import Flow ----

export async function createImport(params: {
  workspaceId: string;
  seriesId: string;
  originalFilename: string;
  r2Bucket: string;
  r2Key: string;
  fileSizeBytes: number;
  importName?: string;
  createdBy: string;
  createdByRole: WorkspaceRole;
}): Promise<WikiImport> {
  requireCanImportMarkdown(params.createdByRole);

  const db = getAdminClient();
  const { data, error } = await db
    .from('wiki_imports')
    .insert({
      workspace_id: params.workspaceId,
      series_id: params.seriesId,
      original_filename: params.originalFilename,
      r2_bucket: params.r2Bucket,
      r2_key: params.r2Key,
      file_size_bytes: params.fileSizeBytes,
      import_name: params.importName ?? params.originalFilename,
      created_by: params.createdBy,
      status: ImportStatus.PENDING,
    })
    .select()
    .single();

  if (error) throw error;

  await createAuditLog({
    workspaceId: params.workspaceId,
    actorUserId: params.createdBy,
    actorRole: params.createdByRole,
    targetType: 'wiki_import',
    targetId: data.id,
    action: 'markdown_import_created',
    afterSnapshot: { filename: params.originalFilename },
    source: 'human',
  });

  return data;
}

export async function parseImportItems(params: {
  importId: string;
  workspaceId: string;
  seriesId: string;
  markdownContent: string;
  isMultiFile?: boolean;
}): Promise<WikiImportItem[]> {
  const db = getAdminClient();

  // Update import status to parsing
  await db
    .from('wiki_imports')
    .update({ status: ImportStatus.PARSING })
    .eq('id', params.importId);

  const parsed = parseMarkdownFile(params.markdownContent);
  const items: WikiImportItem[] = [];

  // Check if there's an existing entry to diff against
  const { data: existing } = await db
    .from('wiki_entries')
    .select('*')
    .eq('series_id', params.seriesId)
    .eq('slug', parsed.slug)
    .single();

  const matchType = existing ? 'matched_by_slug' : 'new';
  const diffSummary = existing
    ? generateDiffSummary(
        {
          title: existing.title,
          bodyMarkdown: existing.body_markdown,
          entryType: existing.entry_type as WikiEntryType,
          canonStatus: existing.canon_status as WikiCanonStatus,
        },
        parsed
      )
    : 'New entry';

  const { data: item, error: itemError } = await db
    .from('wiki_import_items')
    .insert({
      import_id: params.importId,
      target_entry_id: existing?.id ?? null,
      match_type: matchType,
      proposed_title: parsed.title,
      proposed_slug: parsed.slug,
      proposed_entry_type: parsed.entryType,
      proposed_body_markdown: parsed.bodyMarkdown,
      proposed_frontmatter: parsed.frontmatter,
      proposed_tags: parsed.tags,
      proposed_canon_status: parsed.canonStatus,
      extracted_links: parsed.extractedLinks,
      diff_summary: diffSummary,
      status: 'pending',
    })
    .select()
    .single();

  if (itemError) throw itemError;
  items.push(item);

  // Track unresolved links
  if (parsed.extractedLinks.length > 0) {
    const unresolvedLinks = parsed.extractedLinks.map((linkText) => ({
      workspace_id: params.workspaceId,
      series_id: params.seriesId,
      source_import_id: params.importId,
      link_text: linkText,
      resolved: false,
    }));

    await db.from('unresolved_wiki_links').insert(unresolvedLinks);
  }

  // Update import to parsed
  await db
    .from('wiki_imports')
    .update({
      status: ImportStatus.PARSED,
      items_count: items.length,
      items_parsed: items.length,
    })
    .eq('id', params.importId);

  return items;
}

export async function approveImport(params: {
  importId: string;
  workspaceId: string;
  approvedBy: string;
  approvedByRole: WorkspaceRole;
  approvedItemIds?: string[]; // if null, approve all pending
}): Promise<void> {
  assertHumanApproval('human', 'Markdown import approval');

  const { canApproveImport } = await import('./permissionService');
  if (!canApproveImport(params.approvedByRole)) {
    throw new Error('You do not have permission to approve imports');
  }

  const db = getAdminClient();

  const { data: importRecord } = await db
    .from('wiki_imports')
    .select('*')
    .eq('id', params.importId)
    .eq('workspace_id', params.workspaceId)
    .single();

  if (!importRecord) throw new Error('Import not found');

  // Fetch items to approve
  let query = db
    .from('wiki_import_items')
    .select('*')
    .eq('import_id', params.importId)
    .eq('status', 'pending');

  if (params.approvedItemIds?.length) {
    query = query.in('id', params.approvedItemIds);
  }

  const { data: items } = await query;
  if (!items?.length) return;

  for (const item of items) {
    // Check target entry is not locked
    if (item.target_entry_id) {
      const { data: targetEntry } = await db
        .from('wiki_entries')
        .select('approval_status')
        .eq('id', item.target_entry_id)
        .single();

      if (targetEntry) {
        try {
          assertNotLocked(targetEntry.approval_status, 'Target wiki entry');
        } catch {
          await db
            .from('wiki_import_items')
            .update({ status: 'rejected', rejection_reason: 'Target entry is locked' })
            .eq('id', item.id);
          continue;
        }
      }
    }

    // Apply the item
    const wikiMod = await import('./wikiService');
    if (item.match_type === 'new') {
      await wikiMod.createWikiEntry({
        workspaceId: params.workspaceId,
        seriesId: importRecord.series_id,
        title: item.proposed_title!,
        entryType: item.proposed_entry_type!,
        bodyMarkdown: item.proposed_body_markdown,
        canonStatus: item.proposed_canon_status ?? WikiCanonStatus.DRAFT,
        frontmatter: item.proposed_frontmatter ?? {},
        createdBy: params.approvedBy,
        source: 'import',
      });
    } else if (item.target_entry_id) {
      await wikiMod.updateWikiEntry({
        entryId: item.target_entry_id,
        workspaceId: params.workspaceId,
        updates: {
          title: item.proposed_title ?? undefined,
          body_markdown: item.proposed_body_markdown ?? undefined,
          frontmatter: item.proposed_frontmatter ?? undefined,
        },
        updatedBy: params.approvedBy,
        changeSummary: `Applied from import: ${importRecord.import_name}`,
        source: 'import',
      });
    }

    await db
      .from('wiki_import_items')
      .update({ status: 'applied', applied_at: new Date().toISOString() })
      .eq('id', item.id);
  }

  await db
    .from('wiki_imports')
    .update({
      status: ImportStatus.APPLIED,
      approved_by: params.approvedBy,
      approved_at: new Date().toISOString(),
      items_approved: items.length,
    })
    .eq('id', params.importId);

  await createAuditLog({
    workspaceId: params.workspaceId,
    actorUserId: params.approvedBy,
    actorRole: params.approvedByRole,
    targetType: 'wiki_import',
    targetId: params.importId,
    action: 'markdown_import_approved',
    afterSnapshot: { items_applied: items.length },
    source: 'human',
  });
}
