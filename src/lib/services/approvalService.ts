// ============================================================
// APPROVAL SERVICE — Governs all approval and lock operations
// ============================================================
import { getTypedAdminClient as getAdminClient } from '@/lib/supabase/typed';
import { createAuditLog, createRevisionEvent } from './auditService';
import {
  assertHumanApproval, assertNotLocked, assertCanSelfApprove,
  requireCanApproveScene, canApprovePanel,
  PermissionError
} from './permissionService';
import { SceneStatus, ContinuityFlagSeverity } from '@/lib/enums';
import type { WorkspaceRole } from '@/lib/enums';

async function hasCriticalFlags(bookId: string, sceneId?: string): Promise<boolean> {
  const db = getAdminClient();
  let query = db
    .from('continuity_flags')
    .select('id', { count: 'exact', head: true })
    .eq('book_id', bookId)
    .eq('severity', ContinuityFlagSeverity.CRITICAL)
    .eq('status', 'open');

  if (sceneId) query = query.eq('scene_id', sceneId);

  const { count } = await query;
  return (count ?? 0) > 0;
}

export async function approveScene(params: {
  sceneId: string;
  workspaceId: string;
  actorId: string;
  actorRole: WorkspaceRole;
  sceneAuthorId?: string;
  justification?: string;
  allowSelfApproval?: boolean;
}): Promise<void> {
  assertHumanApproval('human', 'Scene approval');
  requireCanApproveScene(params.actorRole);

  if (params.sceneAuthorId) {
    assertCanSelfApprove(
      params.sceneAuthorId,
      params.actorId,
      params.allowSelfApproval ?? false,
      params.actorRole
    );
  }

  const db = getAdminClient();

  const { data: scene } = await db
    .from('scenes')
    .select('status, book_id, title')
    .eq('id', params.sceneId)
    .eq('workspace_id', params.workspaceId)
    .single();

  if (!scene) throw new Error('Scene not found');
  assertNotLocked(scene.status, 'Scene');

  // Check critical continuity flags
  const hasCritical = await hasCriticalFlags(scene.book_id, params.sceneId);
  if (hasCritical) {
    throw new PermissionError(
      'Cannot approve scene with unresolved critical continuity flags. Resolve or override all critical flags first.'
    );
  }

  const { error } = await db
    .from('scenes')
    .update({
      status: SceneStatus.APPROVED,
      approved_by: params.actorId,
      approved_at: new Date().toISOString(),
      updated_by: params.actorId,
    })
    .eq('id', params.sceneId);

  if (error) throw error;

  await db.from('approval_events').insert({
    workspace_id: params.workspaceId,
    target_type: 'scene',
    target_id: params.sceneId,
    actor_id: params.actorId,
    actor_role: params.actorRole,
    action: 'approved',
    from_status: scene.status,
    to_status: SceneStatus.APPROVED,
    justification: params.justification ?? null,
    source: 'human',
  });

  await createAuditLog({
    workspaceId: params.workspaceId,
    actorUserId: params.actorId,
    actorRole: params.actorRole,
    targetType: 'scene',
    targetId: params.sceneId,
    action: 'scene_approved',
    source: 'human',
  });
}

export async function lockScene(params: {
  sceneId: string;
  workspaceId: string;
  actorId: string;
  actorRole: WorkspaceRole;
}): Promise<void> {
  assertHumanApproval('human', 'Scene lock');
  requireCanApproveScene(params.actorRole);

  const db = getAdminClient();
  const { data: scene } = await db
    .from('scenes')
    .select('status')
    .eq('id', params.sceneId)
    .single();

  if (!scene) throw new Error('Scene not found');
  if (scene.status !== SceneStatus.APPROVED) {
    throw new PermissionError('Only approved scenes can be locked');
  }

  await db
    .from('scenes')
    .update({
      status: SceneStatus.LOCKED,
      locked_by: params.actorId,
      locked_at: new Date().toISOString(),
      updated_by: params.actorId,
    })
    .eq('id', params.sceneId);

  await createAuditLog({
    workspaceId: params.workspaceId,
    actorUserId: params.actorId,
    actorRole: params.actorRole,
    targetType: 'scene',
    targetId: params.sceneId,
    action: 'scene_locked',
    source: 'human',
  });
}

export async function requestSceneRevision(params: {
  sceneId: string;
  workspaceId: string;
  actorId: string;
  actorRole: WorkspaceRole;
  justification: string;
}): Promise<void> {
  const db = getAdminClient();

  const { data: scene } = await db
    .from('scenes')
    .select('status, approved_by, title')
    .eq('id', params.sceneId)
    .single();

  if (!scene) throw new Error('Scene not found');
  assertNotLocked(scene.status, 'Scene');

  const { error } = await db
    .from('scenes')
    .update({
      status: SceneStatus.REVISED,
      approved_by: null,
      approved_at: null,
      updated_by: params.actorId,
    })
    .eq('id', params.sceneId);

  if (error) throw error;

  await createRevisionEvent({
    workspaceId: params.workspaceId,
    objectType: 'scene',
    objectId: params.sceneId,
    changedField: 'status',
    beforeValue: scene.status,
    afterValue: SceneStatus.REVISED,
    triggeredBy: params.actorId,
  });

  await db.from('approval_events').insert({
    workspace_id: params.workspaceId,
    target_type: 'scene',
    target_id: params.sceneId,
    actor_id: params.actorId,
    actor_role: params.actorRole,
    action: 'needs_revision',
    from_status: scene.status,
    to_status: SceneStatus.REVISED,
    justification: params.justification,
    source: 'human',
  });

  await createAuditLog({
    workspaceId: params.workspaceId,
    actorUserId: params.actorId,
    actorRole: params.actorRole,
    targetType: 'scene',
    targetId: params.sceneId,
    action: 'scene_revision_requested',
    afterSnapshot: { justification: params.justification },
    source: 'human',
  });
}

export async function approvePanel(params: {
  panelId: string;
  workspaceId: string;
  actorId: string;
  actorRole: WorkspaceRole;
}): Promise<void> {
  assertHumanApproval('human', 'Panel approval');
  if (!canApprovePanel(params.actorRole)) {
    throw new PermissionError('You do not have permission to approve panels');
  }

  const db = getAdminClient();
  const { error } = await db
    .from('panels')
    .update({
      status: 'approved',
      approved_by: params.actorId,
      approved_at: new Date().toISOString(),
      updated_by: params.actorId,
    })
    .eq('id', params.panelId)
    .eq('workspace_id', params.workspaceId);

  if (error) throw error;

  await db.from('approval_events').insert({
    workspace_id: params.workspaceId,
    target_type: 'panel',
    target_id: params.panelId,
    actor_id: params.actorId,
    actor_role: params.actorRole,
    action: 'approved',
    to_status: 'approved',
    source: 'human',
  });

  await createAuditLog({
    workspaceId: params.workspaceId,
    actorUserId: params.actorId,
    actorRole: params.actorRole,
    targetType: 'panel',
    targetId: params.panelId,
    action: 'panel_approved',
    source: 'human',
  });
}
