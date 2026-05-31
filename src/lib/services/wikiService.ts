// ============================================================
// WIKI SERVICE — Server-side
// ============================================================
import { getTypedAdminClient as getAdminClient } from '@/lib/supabase/typed';
import { createAuditLog } from './auditService';
import {
  assertNotLocked, assertHumanApproval,
  requireCanApproveCanon, PermissionError
} from './permissionService';
import {
  WikiCanonStatus, WikiApprovalStatus,
  type WikiEntryType
} from '@/lib/enums';
import type { WikiEntry, WikiEntryVersion } from '@/lib/types/database';
import type { WorkspaceRole } from '@/lib/enums';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export async function createWikiEntry(params: {
  workspaceId: string;
  seriesId: string;
  title: string;
  entryType: WikiEntryType;
  bodyMarkdown?: string;
  canonStatus?: WikiCanonStatus;
  frontmatter?: Record<string, unknown>;
  createdBy: string;
  source?: string;
}): Promise<WikiEntry> {
  const db = getAdminClient();
  const slug = generateSlug(params.title);

  const { data: entry, error } = await db
    .from('wiki_entries')
    .insert({
      workspace_id: params.workspaceId,
      series_id: params.seriesId,
      slug,
      title: params.title,
      entry_type: params.entryType,
      body_markdown: params.bodyMarkdown ?? null,
      canon_status: params.canonStatus ?? WikiCanonStatus.DRAFT,
      approval_status: WikiApprovalStatus.DRAFT,
      frontmatter: params.frontmatter ?? {},
      created_by: params.createdBy,
    })
    .select()
    .single();

  if (error) throw error;

  // Create initial version
  const version = await createWikiEntryVersion({
    entryId: entry.id,
    versionNumber: 1,
    title: entry.title,
    bodyMarkdown: entry.body_markdown,
    frontmatter: entry.frontmatter as Record<string, unknown>,
    canonStatus: entry.canon_status as WikiCanonStatus,
    approvalStatus: entry.approval_status as WikiApprovalStatus,
    createdBy: params.createdBy,
    source: (params.source as 'human' | 'import' | 'system' | 'agent') ?? 'human',
  });

  // Update entry with version ID
  await db
    .from('wiki_entries')
    .update({ current_version_id: version.id })
    .eq('id', entry.id);

  await createAuditLog({
    workspaceId: params.workspaceId,
    actorUserId: params.createdBy,
    targetType: 'wiki_entry',
    targetId: entry.id,
    action: 'wiki_entry_created',
    afterSnapshot: { title: entry.title, type: params.entryType },
    source: (params.source as 'human' | 'import' | 'system' | 'agent') ?? 'human',
  });

  return { ...entry, current_version_id: version.id };
}

export async function updateWikiEntry(params: {
  entryId: string;
  workspaceId: string;
  updates: Partial<Pick<WikiEntry, 'title' | 'body_markdown' | 'frontmatter' | 'canon_status' | 'excerpt'>>;
  updatedBy: string;
  changeSummary?: string;
  source?: string;
}): Promise<WikiEntry> {
  const db = getAdminClient();

  // Load current entry to check lock status
  const { data: current, error: fetchErr } = await db
    .from('wiki_entries')
    .select('*')
    .eq('id', params.entryId)
    .eq('workspace_id', params.workspaceId)
    .single();

  if (fetchErr) throw fetchErr;
  assertNotLocked(current.approval_status, 'Wiki entry');

  const { data: updated, error } = await db
    .from('wiki_entries')
    .update({
      ...params.updates,
      updated_by: params.updatedBy,
      version_count: current.version_count + 1,
    })
    .eq('id', params.entryId)
    .select()
    .single();

  if (error) throw error;

  const version = await createWikiEntryVersion({
    entryId: params.entryId,
    versionNumber: updated.version_count,
    title: updated.title,
    bodyMarkdown: updated.body_markdown,
    frontmatter: updated.frontmatter as Record<string, unknown>,
    canonStatus: updated.canon_status as WikiCanonStatus,
    approvalStatus: updated.approval_status as WikiApprovalStatus,
    changeSummary: params.changeSummary,
    createdBy: params.updatedBy,
    source: (params.source as 'human' | 'import' | 'system' | 'agent') ?? 'human',
  });

  await db
    .from('wiki_entries')
    .update({ current_version_id: version.id })
    .eq('id', params.entryId);

  await createAuditLog({
    workspaceId: params.workspaceId,
    actorUserId: params.updatedBy,
    targetType: 'wiki_entry',
    targetId: params.entryId,
    action: 'wiki_entry_updated',
    beforeSnapshot: { title: current.title, canon_status: current.canon_status },
    afterSnapshot: params.updates,
    source: (params.source as 'human' | 'import' | 'system' | 'agent') ?? 'human',
  });

  return updated;
}

export async function approveWikiEntry(params: {
  entryId: string;
  workspaceId: string;
  actorId: string;
  actorRole: WorkspaceRole;
  justification?: string;
  source?: string;
}): Promise<WikiEntry> {
  assertHumanApproval(params.source ?? 'human', 'Wiki entry approval');
  requireCanApproveCanon(params.actorRole);

  const db = getAdminClient();

  const { data: current } = await db
    .from('wiki_entries')
    .select('approval_status, title')
    .eq('id', params.entryId)
    .single();

  if (!current) throw new Error('Wiki entry not found');
  assertNotLocked(current.approval_status, 'Wiki entry');

  const { data: updated, error } = await db
    .from('wiki_entries')
    .update({
      approval_status: WikiApprovalStatus.APPROVED,
      canon_status: WikiCanonStatus.CONFIRMED,
      approved_by: params.actorId,
      approved_at: new Date().toISOString(),
      updated_by: params.actorId,
    })
    .eq('id', params.entryId)
    .select()
    .single();

  if (error) throw error;

  await db.from('wiki_approval_events').insert({
    wiki_entry_id: params.entryId,
    actor_id: params.actorId,
    action: 'approved',
    from_status: current.approval_status,
    to_status: WikiApprovalStatus.APPROVED,
    justification: params.justification ?? null,
  });

  await createAuditLog({
    workspaceId: params.workspaceId,
    actorUserId: params.actorId,
    actorRole: params.actorRole,
    targetType: 'wiki_entry',
    targetId: params.entryId,
    action: 'wiki_entry_approved',
    source: 'human',
  });

  return updated;
}

export async function lockWikiEntry(params: {
  entryId: string;
  workspaceId: string;
  actorId: string;
  actorRole: WorkspaceRole;
}): Promise<WikiEntry> {
  assertHumanApproval('human', 'Wiki entry lock');
  requireCanApproveCanon(params.actorRole);

  const db = getAdminClient();
  const { data: current } = await db
    .from('wiki_entries')
    .select('approval_status')
    .eq('id', params.entryId)
    .single();

  if (!current) throw new Error('Wiki entry not found');
  if (current.approval_status !== WikiApprovalStatus.APPROVED) {
    throw new PermissionError('Only approved entries can be locked');
  }

  const { data: updated, error } = await db
    .from('wiki_entries')
    .update({
      approval_status: WikiApprovalStatus.LOCKED,
      locked_by: params.actorId,
      locked_at: new Date().toISOString(),
      updated_by: params.actorId,
    })
    .eq('id', params.entryId)
    .select()
    .single();

  if (error) throw error;

  await createAuditLog({
    workspaceId: params.workspaceId,
    actorUserId: params.actorId,
    actorRole: params.actorRole,
    targetType: 'wiki_entry',
    targetId: params.entryId,
    action: 'wiki_entry_locked',
    source: 'human',
  });

  return updated;
}

export async function restoreWikiEntryVersion(params: {
  entryId: string;
  versionId: string;
  workspaceId: string;
  restoredBy: string;
}): Promise<WikiEntry> {
  const db = getAdminClient();

  const { data: current } = await db
    .from('wiki_entries')
    .select('approval_status, version_count')
    .eq('id', params.entryId)
    .single();

  if (!current) throw new Error('Wiki entry not found');
  assertNotLocked(current.approval_status, 'Wiki entry');

  const { data: version } = await db
    .from('wiki_entry_versions')
    .select('*')
    .eq('id', params.versionId)
    .eq('wiki_entry_id', params.entryId)
    .single();

  if (!version) throw new Error('Version not found');

  return updateWikiEntry({
    entryId: params.entryId,
    workspaceId: params.workspaceId,
    updates: {
      title: version.title,
      body_markdown: version.body_markdown,
      frontmatter: version.frontmatter as Record<string, unknown>,
    },
    updatedBy: params.restoredBy,
    changeSummary: `Restored from version ${version.version_number}`,
    source: 'human',
  });
}

async function createWikiEntryVersion(params: {
  entryId: string;
  versionNumber: number;
  title: string;
  bodyMarkdown: string | null;
  frontmatter: Record<string, unknown>;
  canonStatus: WikiCanonStatus;
  approvalStatus: WikiApprovalStatus;
  changeSummary?: string;
  createdBy: string;
  source: 'human' | 'import' | 'system' | 'agent';
}): Promise<WikiEntryVersion> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('wiki_entry_versions')
    .insert({
      wiki_entry_id: params.entryId,
      version_number: params.versionNumber,
      title: params.title,
      body_markdown: params.bodyMarkdown,
      frontmatter: params.frontmatter,
      canon_status: params.canonStatus,
      approval_status: params.approvalStatus,
      change_summary: params.changeSummary ?? null,
      created_by: params.createdBy,
      source: params.source,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listWikiEntries(params: {
  workspaceId: string;
  seriesId: string;
  entryType?: string;
  canonStatus?: string;
  approvalStatus?: string;
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<WikiEntry[]> {
  const db = getAdminClient();
  let query = db
    .from('wiki_entries')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .eq('series_id', params.seriesId)
    .eq('is_archived', false)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true })
    .limit(params.limit ?? 100)
    .range(params.offset ?? 0, (params.offset ?? 0) + (params.limit ?? 100) - 1);

  if (params.entryType) query = query.eq('entry_type', params.entryType);
  if (params.canonStatus) query = query.eq('canon_status', params.canonStatus);
  if (params.approvalStatus) query = query.eq('approval_status', params.approvalStatus);
  if (params.search) query = query.textSearch('search_vector', params.search);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function generateWikiBacklinks(entryId: string, _seriesId: string): Promise<void> {
  const db = getAdminClient();

  // Find all entries that link to this one
  const { data: links } = await db
    .from('wiki_entry_links')
    .select('source_entry_id')
    .eq('target_entry_id', entryId);

  if (!links?.length) return;

  const backlinks = links.map((l: { source_entry_id: string }) => ({
    entry_id: entryId,
    referencing_entry_id: l.source_entry_id,
  }));

  await db
    .from('wiki_backlinks')
    .upsert(backlinks, { onConflict: 'entry_id,referencing_entry_id' });
}
