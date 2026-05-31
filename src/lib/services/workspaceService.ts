// ============================================================
// WORKSPACE SERVICE — Server-side
// ============================================================
import { getTypedAdminClient as getAdminClient } from '@/lib/supabase/typed';
import { createAuditLog } from './auditService';
import type { WorkspaceRole } from '@/lib/enums';
import type { Workspace, WorkspaceMember } from '@/lib/types/database';

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
