// ============================================================
// DEPENDENCY SERVICE
// dependency_nodes, dependency_edges, character_states
// ============================================================
import { getTypedAdminClient as getAdminClient } from '@/lib/supabase/typed';
import { createAuditLog, createRevisionEvent } from './auditService';
import { requireWorkspaceRole } from './permissionService';
import { EDIT_ROLES, WorkspaceRole } from '@/lib/enums';
import type { DependencyNode, DependencyEdge, CharacterState } from '@/lib/types/database';

// character_states RLS also includes art_director (matches DB policy)
const CHARACTER_STATE_ROLES = [...EDIT_ROLES, WorkspaceRole.ART_DIRECTOR];

// ---- Dependency Nodes ----

export async function upsertDependencyNode(params: {
  workspaceId: string;
  objectType: string;
  objectId: string;
}): Promise<DependencyNode> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('dependency_nodes')
    .upsert(
      {
        workspace_id: params.workspaceId,
        object_type: params.objectType,
        object_id: params.objectId,
        is_stale: false,
        last_validated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id,object_type,object_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getDependencyNode(params: {
  workspaceId: string;
  objectType: string;
  objectId: string;
}): Promise<DependencyNode | null> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('dependency_nodes')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .eq('object_type', params.objectType)
    .eq('object_id', params.objectId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

export async function listDependencyNodes(params: {
  workspaceId: string;
  objectType?: string;
  isStale?: boolean;
}): Promise<DependencyNode[]> {
  const db = getAdminClient();
  let query = db
    .from('dependency_nodes')
    .select('*')
    .eq('workspace_id', params.workspaceId);

  if (params.objectType) query = query.eq('object_type', params.objectType);
  if (params.isStale !== undefined) query = query.eq('is_stale', params.isStale);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ---- Dependency Edges ----

export async function linkDependencyNodes(params: {
  workspaceId: string;
  sourceObjectType: string;
  sourceObjectId: string;
  targetObjectType: string;
  targetObjectId: string;
  relationship: string;
}): Promise<DependencyEdge> {
  const source = await upsertDependencyNode({
    workspaceId: params.workspaceId,
    objectType: params.sourceObjectType,
    objectId: params.sourceObjectId,
  });

  const target = await upsertDependencyNode({
    workspaceId: params.workspaceId,
    objectType: params.targetObjectType,
    objectId: params.targetObjectId,
  });

  const db = getAdminClient();
  const { data, error } = await db
    .from('dependency_edges')
    .upsert(
      {
        source_node_id: source.id,
        target_node_id: target.id,
        relationship: params.relationship,
      },
      { onConflict: 'source_node_id,target_node_id,relationship' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function unlinkDependencyNodes(params: {
  workspaceId: string;
  sourceObjectType: string;
  sourceObjectId: string;
  targetObjectType: string;
  targetObjectId: string;
  relationship?: string;
}): Promise<void> {
  const db = getAdminClient();

  const sourceNode = await getDependencyNode({
    workspaceId: params.workspaceId,
    objectType: params.sourceObjectType,
    objectId: params.sourceObjectId,
  });
  const targetNode = await getDependencyNode({
    workspaceId: params.workspaceId,
    objectType: params.targetObjectType,
    objectId: params.targetObjectId,
  });

  if (!sourceNode || !targetNode) return;

  let query = db
    .from('dependency_edges')
    .delete()
    .eq('source_node_id', sourceNode.id)
    .eq('target_node_id', targetNode.id);

  if (params.relationship) query = query.eq('relationship', params.relationship);
  const { error } = await query;
  if (error) throw error;
}

export async function getDownstreamNodes(params: {
  workspaceId: string;
  objectType: string;
  objectId: string;
  depth?: number;
}): Promise<DependencyNode[]> {
  const db = getAdminClient();
  const node = await getDependencyNode(params);
  if (!node) return [];

  const maxDepth = params.depth ?? 3;
  const visited = new Set<string>();
  const result: DependencyNode[] = [];

  async function traverse(nodeId: string, currentDepth: number): Promise<void> {
    if (currentDepth > maxDepth || visited.has(nodeId)) return;
    visited.add(nodeId);

    const { data: edges } = await db
      .from('dependency_edges')
      .select('target_node_id, target_node:dependency_nodes!target_node_id(*)')
      .eq('source_node_id', nodeId);

    for (const edge of edges ?? []) {
      const targetNode = (edge as { target_node: DependencyNode }).target_node;
      if (targetNode && !visited.has(targetNode.id)) {
        result.push(targetNode);
        await traverse(targetNode.id, currentDepth + 1);
      }
    }
  }

  await traverse(node.id, 0);
  return result;
}

export async function getUpstreamNodes(params: {
  workspaceId: string;
  objectType: string;
  objectId: string;
}): Promise<DependencyNode[]> {
  const db = getAdminClient();
  const node = await getDependencyNode(params);
  if (!node) return [];

  const { data: edges } = await db
    .from('dependency_edges')
    .select('source_node_id, source_node:dependency_nodes!source_node_id(*)')
    .eq('target_node_id', node.id);

  return (edges ?? []).map((e: unknown) => (e as { source_node: DependencyNode }).source_node).filter(Boolean);
}

// ---- Mark Stale ----

export async function markNodeStale(params: {
  workspaceId: string;
  objectType: string;
  objectId: string;
}): Promise<void> {
  const db = getAdminClient();
  const { error } = await db
    .from('dependency_nodes')
    .update({ is_stale: true })
    .eq('workspace_id', params.workspaceId)
    .eq('object_type', params.objectType)
    .eq('object_id', params.objectId);

  if (error) throw error;
}

export async function propagateStaleness(params: {
  workspaceId: string;
  objectType: string;
  objectId: string;
  triggeredBy?: string;
}): Promise<string[]> {
  const downstream = await getDownstreamNodes(params);
  if (downstream.length === 0) return [];

  const db = getAdminClient();
  const staleIds = downstream.map((n) => n.id);

  await db
    .from('dependency_nodes')
    .update({ is_stale: true })
    .in('id', staleIds);

  const staleObjects = downstream.map((n) => ({
    object_type: n.object_type,
    object_id: n.object_id,
  }));

  await createRevisionEvent({
    workspaceId: params.workspaceId,
    objectType: params.objectType,
    objectId: params.objectId,
    changedField: 'staleness_propagated',
    afterValue: { stale_count: staleObjects.length },
    triggeredBy: params.triggeredBy,
    staleObjects,
  });

  return staleIds;
}

export async function clearNodeStale(params: {
  workspaceId: string;
  objectType: string;
  objectId: string;
}): Promise<void> {
  const db = getAdminClient();
  const { error } = await db
    .from('dependency_nodes')
    .update({ is_stale: false, last_validated_at: new Date().toISOString() })
    .eq('workspace_id', params.workspaceId)
    .eq('object_type', params.objectType)
    .eq('object_id', params.objectId);

  if (error) throw error;
}

// ---- Dependency Rebuild ----

export async function rebuildObjectDependencies(params: {
  workspaceId: string;
  objectType: string;
  objectId: string;
  dependencies: Array<{
    targetObjectType: string;
    targetObjectId: string;
    relationship: string;
  }>;
}): Promise<void> {
  await upsertDependencyNode({
    workspaceId: params.workspaceId,
    objectType: params.objectType,
    objectId: params.objectId,
  });

  await Promise.all(
    params.dependencies.map((dep) =>
      linkDependencyNodes({
        workspaceId: params.workspaceId,
        sourceObjectType: params.objectType,
        sourceObjectId: params.objectId,
        targetObjectType: dep.targetObjectType,
        targetObjectId: dep.targetObjectId,
        relationship: dep.relationship,
      })
    )
  );
}

export async function getStaleObjects(workspaceId: string): Promise<DependencyNode[]> {
  return listDependencyNodes({ workspaceId, isStale: true });
}

// ---- Character States ----

export async function createCharacterState(params: {
  workspaceId: string;
  wikiEntryId: string;
  sceneId?: string;
  pageId?: string;
  panelId?: string;
  outfit?: Record<string, unknown>;
  hair?: string;
  injuries?: Record<string, unknown>;
  weapons?: Record<string, unknown>;
  equipment?: Record<string, unknown>;
  emotionalState?: string;
  knowledgeState?: Record<string, unknown>;
  locationContext?: string;
  props?: Record<string, unknown>;
  continuityNotes?: string;
  createdBy: string;
  actorRole: WorkspaceRole;
}): Promise<CharacterState> {
  requireWorkspaceRole(params.actorRole, CHARACTER_STATE_ROLES, 'create character states');

  const db = getAdminClient();
  const { data, error } = await db
    .from('character_states')
    .insert({
      workspace_id: params.workspaceId,
      wiki_entry_id: params.wikiEntryId,
      scene_id: params.sceneId ?? null,
      page_id: params.pageId ?? null,
      panel_id: params.panelId ?? null,
      outfit: params.outfit ?? null,
      hair: params.hair ?? null,
      injuries: params.injuries ?? null,
      weapons: params.weapons ?? null,
      equipment: params.equipment ?? null,
      emotional_state: params.emotionalState ?? null,
      knowledge_state: params.knowledgeState ?? null,
      location_context: params.locationContext ?? null,
      props: params.props ?? null,
      continuity_notes: params.continuityNotes ?? null,
      created_by: params.createdBy,
    })
    .select()
    .single();

  if (error) throw error;

  // Register in dependency graph
  await upsertDependencyNode({
    workspaceId: params.workspaceId,
    objectType: 'character_state',
    objectId: data.id,
  });

  if (params.wikiEntryId) {
    await linkDependencyNodes({
      workspaceId: params.workspaceId,
      sourceObjectType: 'character_state',
      sourceObjectId: data.id,
      targetObjectType: 'wiki_entry',
      targetObjectId: params.wikiEntryId,
      relationship: 'state_of',
    });
  }

  if (params.sceneId) {
    await linkDependencyNodes({
      workspaceId: params.workspaceId,
      sourceObjectType: 'character_state',
      sourceObjectId: data.id,
      targetObjectType: 'scene',
      targetObjectId: params.sceneId,
      relationship: 'state_at',
    });
  }

  return data;
}

export async function updateCharacterState(params: {
  stateId: string;
  workspaceId: string;
  updates: {
    outfit?: Record<string, unknown>;
    hair?: string;
    injuries?: Record<string, unknown>;
    weapons?: Record<string, unknown>;
    equipment?: Record<string, unknown>;
    emotionalState?: string;
    locationContext?: string;
    continuityNotes?: string;
  };
  actorRole: WorkspaceRole;
  updatedBy: string;
}): Promise<void> {
  requireWorkspaceRole(params.actorRole, CHARACTER_STATE_ROLES, 'update character states');

  const db = getAdminClient();
  const patch: Record<string, unknown> = {};
  if (params.updates.outfit !== undefined) patch.outfit = params.updates.outfit;
  if (params.updates.hair !== undefined) patch.hair = params.updates.hair;
  if (params.updates.injuries !== undefined) patch.injuries = params.updates.injuries;
  if (params.updates.weapons !== undefined) patch.weapons = params.updates.weapons;
  if (params.updates.equipment !== undefined) patch.equipment = params.updates.equipment;
  if (params.updates.emotionalState !== undefined) patch.emotional_state = params.updates.emotionalState;
  if (params.updates.locationContext !== undefined) patch.location_context = params.updates.locationContext;
  if (params.updates.continuityNotes !== undefined) patch.continuity_notes = params.updates.continuityNotes;

  const { error } = await db
    .from('character_states')
    .update(patch)
    .eq('id', params.stateId)
    .eq('workspace_id', params.workspaceId);

  if (error) throw error;

  await createAuditLog({
    workspaceId: params.workspaceId,
    actorUserId: params.updatedBy,
    actorRole: params.actorRole,
    targetType: 'character_state',
    targetId: params.stateId,
    action: 'character_state_updated',
    afterSnapshot: params.updates,
    source: 'human',
  });
}

export async function getCharacterStatesForScene(params: {
  workspaceId: string;
  sceneId: string;
}): Promise<CharacterState[]> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('character_states')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .eq('scene_id', params.sceneId);

  if (error) throw error;
  return data ?? [];
}

export async function getCharacterStatesForPanel(params: {
  workspaceId: string;
  panelId: string;
}): Promise<CharacterState[]> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('character_states')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .eq('panel_id', params.panelId);

  if (error) throw error;
  return data ?? [];
}

export async function getCharacterHistory(params: {
  workspaceId: string;
  wikiEntryId: string;
}): Promise<CharacterState[]> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('character_states')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .eq('wiki_entry_id', params.wikiEntryId)
    .order('created_at');

  if (error) throw error;
  return data ?? [];
}

export async function markCharacterStatesStale(params: {
  workspaceId: string;
  wikiEntryId: string;
  sceneId?: string;
}): Promise<void> {
  const db = getAdminClient();
  let query = db
    .from('character_states')
    .update({ is_stale: true })
    .eq('workspace_id', params.workspaceId)
    .eq('wiki_entry_id', params.wikiEntryId);

  if (params.sceneId) query = query.neq('scene_id', params.sceneId);

  const { error } = await query;
  if (error) throw error;
}
