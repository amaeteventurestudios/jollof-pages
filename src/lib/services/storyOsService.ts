// ============================================================
// STORY OS SERVICE — Story OS JSON file management
// Story OS remains the canonical source of truth for story data
// ============================================================
import { getTypedAdminClient as getAdminClient } from '@/lib/supabase/typed';
import { createAuditLog } from './auditService';
import { assertNotLocked } from './permissionService';
import type { AuditSource } from '@/lib/enums';
import type { StoryFile, StoryFileVersion } from '@/lib/types/database';
import crypto from 'crypto';

function hashContent(content: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(content))
    .digest('hex');
}

export async function readStoryFile(params: {
  seriesId: string;
  filePath: string;
}): Promise<StoryFile | null> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('story_files')
    .select('*')
    .eq('series_id', params.seriesId)
    .eq('file_path', params.filePath)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

export async function writeStoryFile(params: {
  workspaceId: string;
  seriesId: string;
  bookId?: string;
  filePath: string;
  fileType: string;
  content: Record<string, unknown>;
  writtenBy: string;
  source?: AuditSource;
}): Promise<StoryFile> {
  const db = getAdminClient();
  const contentHash = hashContent(params.content);
  const source = params.source ?? 'human';

  // Fetch or create the story file record
  let { data: existing } = await db
    .from('story_files')
    .select('*')
    .eq('series_id', params.seriesId)
    .eq('file_path', params.filePath)
    .single();

  if (existing) {
    // Check not locked
    assertNotLocked(
      existing.locked ? 'locked' : 'draft',
      `Story file ${params.filePath}`
    );

    // Skip if content identical
    if (existing.content_hash === contentHash) {
      return existing;
    }
  }

  // Write new version
  const versionNumber = existing ? ((existing as StoryFile & { version_count?: number }).version_count ?? 1) + 1 : 1;

  let storyFileId: string;

  if (!existing) {
    const { data: created, error: createErr } = await db
      .from('story_files')
      .insert({
        workspace_id: params.workspaceId,
        series_id: params.seriesId,
        book_id: params.bookId ?? null,
        file_path: params.filePath,
        file_type: params.fileType,
        content_json: params.content,
        content_hash: contentHash,
        created_by: params.writtenBy,
        updated_by: params.writtenBy,
      })
      .select()
      .single();

    if (createErr) throw createErr;
    storyFileId = created.id;
    existing = created;
  } else {
    storyFileId = existing.id;
  }

  // Create version record
  const { data: version, error: versionErr } = await db
    .from('story_file_versions')
    .insert({
      story_file_id: storyFileId,
      version_number: versionNumber,
      content_json: params.content,
      content_hash: contentHash,
      created_by: params.writtenBy,
      source,
    })
    .select()
    .single();

  if (versionErr) throw versionErr;

  // Update the story file with new content and version pointer
  const { data: updated, error: updateErr } = await db
    .from('story_files')
    .update({
      content_json: params.content,
      content_hash: contentHash,
      current_version_id: version.id,
      updated_by: params.writtenBy,
    })
    .eq('id', storyFileId)
    .select()
    .single();

  if (updateErr) throw updateErr;

  await createAuditLog({
    workspaceId: params.workspaceId,
    actorUserId: params.writtenBy,
    targetType: 'story_file',
    targetId: storyFileId,
    action: 'story_file_updated',
    afterSnapshot: { file_path: params.filePath, version: versionNumber },
    source,
  });

  return updated;
}

export async function restoreStoryFileVersion(params: {
  storyFileId: string;
  versionId: string;
  workspaceId: string;
  restoredBy: string;
}): Promise<StoryFile> {
  const db = getAdminClient();

  const { data: version, error: vErr } = await db
    .from('story_file_versions')
    .select('*')
    .eq('id', params.versionId)
    .eq('story_file_id', params.storyFileId)
    .single();

  if (vErr) throw vErr;
  if (!version) throw new Error('Version not found');

  const { data: file } = await db
    .from('story_files')
    .select('*')
    .eq('id', params.storyFileId)
    .single();

  if (!file) throw new Error('Story file not found');

  const restored = await writeStoryFile({
    workspaceId: params.workspaceId,
    seriesId: file.series_id,
    bookId: file.book_id,
    filePath: file.file_path,
    fileType: file.file_type,
    content: version.content_json as Record<string, unknown>,
    writtenBy: params.restoredBy,
    source: 'human',
  });

  await createAuditLog({
    workspaceId: params.workspaceId,
    actorUserId: params.restoredBy,
    targetType: 'story_file',
    targetId: params.storyFileId,
    action: 'story_file_restored',
    afterSnapshot: { restored_version_id: params.versionId, version_number: version.version_number },
    source: 'human',
  });

  return restored;
}

export async function diffStoryFileVersions(
  versionA: StoryFileVersion,
  versionB: StoryFileVersion
): Promise<Record<string, { from: unknown; to: unknown }>> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  const a = versionA.content_json as Record<string, unknown>;
  const b = versionB.content_json as Record<string, unknown>;

  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of allKeys) {
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
      diff[key] = { from: a[key], to: b[key] };
    }
  }

  return diff;
}

export async function lockStoryFile(params: {
  storyFileId: string;
  workspaceId: string;
  lockedBy: string;
}): Promise<void> {
  const db = getAdminClient();
  await db
    .from('story_files')
    .update({ locked: true, locked_by: params.lockedBy, locked_at: new Date().toISOString() })
    .eq('id', params.storyFileId);

  await createAuditLog({
    workspaceId: params.workspaceId,
    actorUserId: params.lockedBy,
    targetType: 'story_file',
    targetId: params.storyFileId,
    action: 'story_file_locked',
    source: 'human',
  });
}
