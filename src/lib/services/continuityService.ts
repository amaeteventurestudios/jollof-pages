// ============================================================
// CONTINUITY SERVICE
// ============================================================
import { getTypedAdminClient as getAdminClient } from '@/lib/supabase/typed';
import { createAuditLog } from './auditService';
import { assertHumanApproval, canResolveContinuity, PermissionError } from './permissionService';
import { ContinuityFlagSeverity, ContinuityFlagStatus } from '@/lib/enums';
import type { WorkspaceRole } from '@/lib/enums';
import type { ContinuityFlag } from '@/lib/types/database';

export async function createContinuityFlag(params: {
  workspaceId: string;
  bookId: string;
  sceneId?: string;
  pageId?: string;
  panelId?: string;
  severity: ContinuityFlagSeverity;
  description: string;
  source?: string;
  createdBy: string;
}): Promise<ContinuityFlag> {
  const db = getAdminClient();

  const { data, error } = await db
    .from('continuity_flags')
    .insert({
      workspace_id: params.workspaceId,
      book_id: params.bookId,
      scene_id: params.sceneId ?? null,
      page_id: params.pageId ?? null,
      panel_id: params.panelId ?? null,
      severity: params.severity,
      description: params.description,
      source: params.source ?? 'system',
      created_by: params.createdBy,
    })
    .select()
    .single();

  if (error) throw error;

  // Update scene flag count
  if (params.sceneId) {
    await db.rpc('increment_scene_flag_count', { p_scene_id: params.sceneId }).maybeSingle();
  }

  await createAuditLog({
    workspaceId: params.workspaceId,
    actorUserId: params.createdBy,
    targetType: 'continuity_flag',
    targetId: data.id,
    action: 'continuity_flag_created',
    afterSnapshot: { severity: params.severity, description: params.description },
    source: 'system',
  });

  return data;
}

export async function resolveFlag(params: {
  flagId: string;
  workspaceId: string;
  resolvedBy: string;
  resolvedByRole: WorkspaceRole;
}): Promise<void> {
  if (!canResolveContinuity(params.resolvedByRole)) {
    throw new PermissionError('You do not have permission to resolve continuity flags');
  }

  const db = getAdminClient();
  const { error } = await db
    .from('continuity_flags')
    .update({
      status: ContinuityFlagStatus.RESOLVED,
      resolved_by: params.resolvedBy,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', params.flagId)
    .eq('workspace_id', params.workspaceId);

  if (error) throw error;
}

export async function overrideFlag(params: {
  flagId: string;
  workspaceId: string;
  overriddenBy: string;
  overriddenByRole: WorkspaceRole;
  justification: string;
}): Promise<void> {
  assertHumanApproval('human', 'Continuity flag override');
  if (!canResolveContinuity(params.overriddenByRole)) {
    throw new PermissionError('You do not have permission to override continuity flags');
  }
  if (!params.justification.trim()) {
    throw new Error('Justification is required to override a continuity flag');
  }

  const db = getAdminClient();
  const { error } = await db
    .from('continuity_flags')
    .update({
      status: ContinuityFlagStatus.OVERRIDDEN,
      overridden_by: params.overriddenBy,
      override_justification: params.justification,
      overridden_at: new Date().toISOString(),
    })
    .eq('id', params.flagId)
    .eq('workspace_id', params.workspaceId);

  if (error) throw error;

  await createAuditLog({
    workspaceId: params.workspaceId,
    actorUserId: params.overriddenBy,
    actorRole: params.overriddenByRole,
    targetType: 'continuity_flag',
    targetId: params.flagId,
    action: 'continuity_flag_overridden',
    afterSnapshot: { justification: params.justification },
    source: 'human',
  });
}

export async function getOpenFlagsForBook(bookId: string): Promise<ContinuityFlag[]> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('continuity_flags')
    .select('*')
    .eq('book_id', bookId)
    .eq('status', 'open')
    .order('severity', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function hasBlockingFlags(bookId: string, sceneId?: string): Promise<boolean> {
  const db = getAdminClient();
  let query = db
    .from('continuity_flags')
    .select('id', { count: 'exact', head: true })
    .eq('book_id', bookId)
    .eq('severity', ContinuityFlagSeverity.CRITICAL)
    .eq('status', ContinuityFlagStatus.OPEN);

  if (sceneId) query = query.eq('scene_id', sceneId);

  const { count } = await query;
  return (count ?? 0) > 0;
}
