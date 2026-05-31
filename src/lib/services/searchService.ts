// ============================================================
// SEARCH SERVICE — Postgres full-text search
// search_index table
// ============================================================
import { getTypedAdminClient as getAdminClient } from '@/lib/supabase/typed';
import type { SearchIndexRecord } from '@/lib/types/database';

// ---- Index Management ----

export async function indexObject(params: {
  workspaceId: string;
  seriesId?: string;
  objectType: string;
  objectId: string;
  title: string;
  body?: string;
  tags?: string[];
  status?: string;
}): Promise<void> {
  const db = getAdminClient();
  const { error } = await db
    .from('search_index')
    .upsert(
      {
        workspace_id: params.workspaceId,
        series_id: params.seriesId ?? null,
        object_type: params.objectType,
        object_id: params.objectId,
        title: params.title,
        body: params.body ?? null,
        tags: params.tags ?? [],
        status: params.status ?? null,
        indexed_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id,object_type,object_id' }
    );

  if (error) throw error;
}

export async function removeFromIndex(params: {
  workspaceId: string;
  objectType: string;
  objectId: string;
}): Promise<void> {
  const db = getAdminClient();
  const { error } = await db
    .from('search_index')
    .delete()
    .eq('workspace_id', params.workspaceId)
    .eq('object_type', params.objectType)
    .eq('object_id', params.objectId);

  if (error) throw error;
}

export async function removeObjectFromAllIndexes(params: {
  objectType: string;
  objectId: string;
}): Promise<void> {
  const db = getAdminClient();
  const { error } = await db
    .from('search_index')
    .delete()
    .eq('object_type', params.objectType)
    .eq('object_id', params.objectId);

  if (error) throw error;
}

// ---- Search ----

export async function search(params: {
  workspaceId: string;
  query: string;
  objectTypes?: string[];
  seriesId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<SearchIndexRecord[]> {
  if (!params.query.trim()) return [];

  const db = getAdminClient();

  // Build tsquery from plain text — wrap each word for phrase-style matching
  const tsQuery = params.query.trim().split(/\s+/).join(' & ');

  let query = db
    .from('search_index')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .textSearch('search_vector', tsQuery)
    .order('indexed_at', { ascending: false })
    .limit(params.limit ?? 20);

  if (params.objectTypes?.length) query = query.in('object_type', params.objectTypes);
  if (params.seriesId) query = query.eq('series_id', params.seriesId);
  if (params.status) query = query.eq('status', params.status);
  if (params.offset !== undefined) {
    query = query.range(params.offset, params.offset + (params.limit ?? 20) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function searchByTitle(params: {
  workspaceId: string;
  title: string;
  objectTypes?: string[];
  limit?: number;
}): Promise<SearchIndexRecord[]> {
  const db = getAdminClient();
  let query = db
    .from('search_index')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .ilike('title', `%${params.title}%`)
    .limit(params.limit ?? 10);

  if (params.objectTypes?.length) query = query.in('object_type', params.objectTypes);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ---- Bulk Reindex ----

export async function bulkIndexObjects(entries: Array<{
  workspaceId: string;
  seriesId?: string;
  objectType: string;
  objectId: string;
  title: string;
  body?: string;
  tags?: string[];
  status?: string;
}>): Promise<void> {
  if (!entries.length) return;

  const db = getAdminClient();
  const rows = entries.map((e) => ({
    workspace_id: e.workspaceId,
    series_id: e.seriesId ?? null,
    object_type: e.objectType,
    object_id: e.objectId,
    title: e.title,
    body: e.body ?? null,
    tags: e.tags ?? [],
    status: e.status ?? null,
    indexed_at: new Date().toISOString(),
  }));

  const { error } = await db
    .from('search_index')
    .upsert(rows, { onConflict: 'workspace_id,object_type,object_id' });

  if (error) throw error;
}

export async function reindexWorkspaceWikiEntries(workspaceId: string): Promise<number> {
  const db = getAdminClient();
  const { data: entries, error } = await db
    .from('wiki_entries')
    .select('id, series_id, title, body_markdown, approval_status')
    .eq('workspace_id', workspaceId)
    .eq('is_archived', false)
    .eq('is_deleted', false);

  if (error) throw error;
  if (!entries?.length) return 0;

  await bulkIndexObjects(
    entries.map((e: { id: string; series_id: string; title: string; body_markdown: string | null; approval_status: string }) => ({
      workspaceId,
      seriesId: e.series_id,
      objectType: 'wiki_entry',
      objectId: e.id,
      title: e.title,
      body: e.body_markdown ?? undefined,
      status: e.approval_status,
    }))
  );

  return entries.length;
}

export async function reindexWorkspaceScenes(workspaceId: string): Promise<number> {
  const db = getAdminClient();
  const { data: scenes, error } = await db
    .from('scenes')
    .select('id, title, notes, status, book_id')
    .eq('workspace_id', workspaceId);

  if (error) throw error;
  if (!scenes?.length) return 0;

  await bulkIndexObjects(
    scenes.map((s: { id: string; title: string; notes: string | null; status: string }) => ({
      workspaceId,
      objectType: 'scene',
      objectId: s.id,
      title: s.title,
      body: s.notes ?? undefined,
      status: s.status,
    }))
  );

  return scenes.length;
}

export async function reindexWorkspace(workspaceId: string): Promise<{ wiki: number; scenes: number }> {
  const [wiki, scenes] = await Promise.all([
    reindexWorkspaceWikiEntries(workspaceId),
    reindexWorkspaceScenes(workspaceId),
  ]);
  return { wiki, scenes };
}

// ---- Index Stats ----

export async function getIndexStats(workspaceId: string): Promise<Record<string, number>> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('search_index')
    .select('object_type')
    .eq('workspace_id', workspaceId);

  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.object_type] = (counts[row.object_type] ?? 0) + 1;
  }
  return counts;
}

export async function getIndexedEntry(params: {
  workspaceId: string;
  objectType: string;
  objectId: string;
}): Promise<SearchIndexRecord | null> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('search_index')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .eq('object_type', params.objectType)
    .eq('object_id', params.objectId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}
