// ============================================================
// WORKSPACE SERVICE — Server-side
// workspaces, workspace_members, workspace_invites,
// workspace_settings, storage_quotas, feature_flags
// ============================================================
import { getTypedAdminClient as getAdminClient } from '@/lib/supabase/typed';
import { createAuditLog } from './auditService';
import type { WorkspaceRole } from '@/lib/enums';
import type { Workspace, WorkspaceMember, WorkspaceSettings, StorageQuota } from '@/lib/types/database';

export async function getUserWorkspaces(userId: string): Promise<Workspace[]> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('workspace_members')
    .select('workspace_id, workspaces(*)')
    .eq('user_id', userId)
    .eq('workspaces.is_active', true);

  if (error) throw error;
  return (data ?? []).map((r: { workspaces: Workspace }) => r.workspaces).filter(Boolean);
}

export async function getWorkspaceMember(
  workspaceId: string,
  userId: string
): Promise<WorkspaceMember | null> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

export async function getMemberRole(
  workspaceId: string,
  userId: string
): Promise<WorkspaceRole | null> {
  const member = await getWorkspaceMember(workspaceId, userId);
  return member?.role ?? null;
}

export async function createWorkspace(params: {
  name: string;
  slug: string;
  ownerId: string;
  description?: string;
  soloMode?: boolean;
}): Promise<Workspace> {
  const db = getAdminClient();

  const { data: workspace, error: wsError } = await db
    .from('workspaces')
    .insert({
      name: params.name,
      slug: params.slug,
      owner_id: params.ownerId,
      description: params.description ?? null,
      solo_mode: params.soloMode ?? true,
    })
    .select()
    .single();

  if (wsError) throw wsError;

  // Add owner as workspace member
  await db.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: params.ownerId,
    role: 'owner',
  });

  // Initialize workspace settings
  await db.from('workspace_settings').insert({ workspace_id: workspace.id });

  // Initialize storage quota
  await db.from('storage_quotas').insert({ workspace_id: workspace.id });

  await createAuditLog({
    workspaceId: workspace.id,
    actorUserId: params.ownerId,
    targetType: 'workspace',
    targetId: workspace.id,
    action: 'workspace_created',
    source: 'human',
  });

  return workspace;
}

export async function inviteMember(params: {
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedBy: string;
  invitedByRole: WorkspaceRole;
}): Promise<string> {
  const { canManageMembers } = await import('./permissionService');
  if (!canManageMembers(params.invitedByRole)) {
    throw new Error('Only owners and admins can invite members');
  }

  const db = getAdminClient();
  const token = crypto.randomUUID();

  const { data, error } = await db
    .from('workspace_invites')
    .insert({
      workspace_id: params.workspaceId,
      email: params.email,
      role: params.role,
      token,
      invited_by: params.invitedBy,
    })
    .select('id')
    .single();

  if (error) throw error;

  await createAuditLog({
    workspaceId: params.workspaceId,
    actorUserId: params.invitedBy,
    actorRole: params.invitedByRole,
    targetType: 'workspace_invite',
    targetId: data.id,
    action: 'member_invited',
    afterSnapshot: { email: params.email, role: params.role },
    source: 'human',
  });

  return token;
}

export async function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at');

  if (error) throw error;
  return data ?? [];
}

export async function updateMemberRole(params: {
  workspaceId: string;
  userId: string;
  newRole: WorkspaceRole;
  actorId: string;
  actorRole: WorkspaceRole;
}): Promise<void> {
  const { canManageMembers } = await import('./permissionService');
  if (!canManageMembers(params.actorRole)) {
    throw new Error('Only owners and admins can change member roles');
  }

  const db = getAdminClient();
  const { error } = await db
    .from('workspace_members')
    .update({ role: params.newRole })
    .eq('workspace_id', params.workspaceId)
    .eq('user_id', params.userId);

  if (error) throw error;

  await createAuditLog({
    workspaceId: params.workspaceId,
    actorUserId: params.actorId,
    actorRole: params.actorRole,
    targetType: 'workspace_member',
    targetId: params.userId,
    action: 'member_role_changed',
    afterSnapshot: { new_role: params.newRole },
    source: 'human',
  });
}

export async function removeMember(params: {
  workspaceId: string;
  userId: string;
  actorId: string;
  actorRole: WorkspaceRole;
}): Promise<void> {
  const { canManageMembers } = await import('./permissionService');
  if (!canManageMembers(params.actorRole)) {
    throw new Error('Only owners and admins can remove members');
  }

  const db = getAdminClient();
  const { error } = await db
    .from('workspace_members')
    .delete()
    .eq('workspace_id', params.workspaceId)
    .eq('user_id', params.userId)
    .neq('role', 'owner');

  if (error) throw error;

  await createAuditLog({
    workspaceId: params.workspaceId,
    actorUserId: params.actorId,
    actorRole: params.actorRole,
    targetType: 'workspace_member',
    targetId: params.userId,
    action: 'member_removed',
    source: 'human',
  });
}

// ---- Workspace Settings ----

export async function getWorkspaceSettings(workspaceId: string): Promise<WorkspaceSettings | null> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('workspace_settings')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

export async function updateWorkspaceSettings(params: {
  workspaceId: string;
  settings: Partial<{
    allow_self_approval: boolean;
    require_reviewer_for_canon: boolean;
    require_reviewer_for_scenes: boolean;
    auto_run_continuity_on_draft: boolean;
    block_approval_on_critical_flags: boolean;
    story_os_path: string;
    markdown_import_requires_approval: boolean;
    max_asset_size_bytes: number;
    notification_on_review_request: boolean;
    notification_on_approval: boolean;
    notification_on_flag: boolean;
  }>;
  actorRole: WorkspaceRole;
}): Promise<void> {
  const { canManageWorkspace } = await import('./permissionService');
  if (!canManageWorkspace(params.actorRole)) {
    throw new Error('Only owners and admins can update workspace settings');
  }

  const db = getAdminClient();
  const { error } = await db
    .from('workspace_settings')
    .update(params.settings)
    .eq('workspace_id', params.workspaceId);

  if (error) throw error;
}

// ---- Storage Quota ----

export async function getStorageQuota(workspaceId: string): Promise<StorageQuota | null> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('storage_quotas')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

export async function updateStorageUsage(params: {
  workspaceId: string;
  deltaBytes: number;
  deltaAssets: number;
}): Promise<void> {
  const db = getAdminClient();
  await db.rpc('increment_storage_usage', {
    p_workspace_id: params.workspaceId,
    p_bytes: params.deltaBytes,
    p_assets: params.deltaAssets,
  }).maybeSingle().catch(() => null);
}

// ---- Feature Flags ----

export async function getFeatureFlag(params: {
  workspaceId: string;
  flagKey: string;
}): Promise<boolean> {
  const db = getAdminClient();
  const { data } = await db
    .from('feature_flags')
    .select('is_enabled')
    .eq('workspace_id', params.workspaceId)
    .eq('flag_key', params.flagKey)
    .single();

  return data?.is_enabled ?? false;
}

export async function listFeatureFlags(workspaceId: string) {
  const db = getAdminClient();
  const { data, error } = await db
    .from('feature_flags')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('flag_key');

  if (error) throw error;
  return data ?? [];
}

export async function setFeatureFlag(params: {
  workspaceId: string;
  flagKey: string;
  isEnabled: boolean;
  description?: string;
}): Promise<void> {
  const db = getAdminClient();
  const { error } = await db
    .from('feature_flags')
    .upsert(
      {
        workspace_id: params.workspaceId,
        flag_key: params.flagKey,
        is_enabled: params.isEnabled,
        description: params.description ?? null,
      },
      { onConflict: 'workspace_id,flag_key' }
    );

  if (error) throw error;
}
