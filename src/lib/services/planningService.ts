// ============================================================
// PLANNING SERVICE
// story_arcs, plot_threads, timeline_events, story_beats,
// act_structures, character_arcs, thread_scene_links,
// timeline_scene_links, scenes, pages, panels
// ============================================================
import { getTypedAdminClient as getAdminClient } from '@/lib/supabase/typed';
import { createAuditLog, createRevisionEvent } from './auditService';
import { assertNotLocked, requireWorkspaceRole, PermissionError } from './permissionService';
import { SceneStatus, PageStatus, PanelStatus, EDIT_ROLES, APPROVAL_ROLES } from '@/lib/enums';
import type { WorkspaceRole } from '@/lib/enums';
import type { Scene, Page, Panel } from '@/lib/types/database';
import type {
  StoryArc, PlotThread, TimelineEvent, StoryBeat,
  ActStructure, CharacterArc,
} from '@/lib/types/database';

// ---- Story Arcs ----

export async function createStoryArc(params: {
  workspaceId: string;
  seriesId: string;
  bookId?: string;
  title: string;
  description?: string;
  arcType?: string;
  color?: string;
  wikiEntryId?: string;
  createdBy: string;
  actorRole: WorkspaceRole;
}): Promise<StoryArc> {
  requireWorkspaceRole(params.actorRole, EDIT_ROLES, 'create story arcs');

  const db = getAdminClient();
  const { data, error } = await db
    .from('story_arcs')
    .insert({
      workspace_id: params.workspaceId,
      series_id: params.seriesId,
      book_id: params.bookId ?? null,
      title: params.title,
      description: params.description ?? null,
      arc_type: params.arcType ?? 'main',
      color: params.color ?? null,
      wiki_entry_id: params.wikiEntryId ?? null,
      created_by: params.createdBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateStoryArc(params: {
  arcId: string;
  workspaceId: string;
  updates: { title?: string; description?: string; arcType?: string; color?: string; status?: string; sortOrder?: number };
  actorRole: WorkspaceRole;
}): Promise<void> {
  requireWorkspaceRole(params.actorRole, EDIT_ROLES, 'update story arcs');

  const db = getAdminClient();
  const patch: Record<string, unknown> = {};
  if (params.updates.title !== undefined) patch.title = params.updates.title;
  if (params.updates.description !== undefined) patch.description = params.updates.description;
  if (params.updates.arcType !== undefined) patch.arc_type = params.updates.arcType;
  if (params.updates.color !== undefined) patch.color = params.updates.color;
  if (params.updates.status !== undefined) patch.status = params.updates.status;
  if (params.updates.sortOrder !== undefined) patch.sort_order = params.updates.sortOrder;

  const { error } = await db
    .from('story_arcs')
    .update(patch)
    .eq('id', params.arcId)
    .eq('workspace_id', params.workspaceId);

  if (error) throw error;
}

export async function listStoryArcs(params: {
  workspaceId: string;
  seriesId?: string;
  bookId?: string;
}): Promise<StoryArc[]> {
  const db = getAdminClient();
  let query = db
    .from('story_arcs')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .order('sort_order');

  if (params.seriesId) query = query.eq('series_id', params.seriesId);
  if (params.bookId) query = query.eq('book_id', params.bookId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function deleteStoryArc(params: {
  arcId: string;
  workspaceId: string;
  actorRole: WorkspaceRole;
}): Promise<void> {
  requireWorkspaceRole(params.actorRole, APPROVAL_ROLES, 'delete story arcs');

  const db = getAdminClient();
  const { error } = await db
    .from('story_arcs')
    .delete()
    .eq('id', params.arcId)
    .eq('workspace_id', params.workspaceId);

  if (error) throw error;
}

// ---- Plot Threads ----

export async function createPlotThread(params: {
  workspaceId: string;
  seriesId: string;
  storyArcId?: string;
  title: string;
  description?: string;
  threadType?: string;
  color?: string;
  createdBy: string;
  actorRole: WorkspaceRole;
}): Promise<PlotThread> {
  requireWorkspaceRole(params.actorRole, EDIT_ROLES, 'create plot threads');

  const db = getAdminClient();
  const { data, error } = await db
    .from('plot_threads')
    .insert({
      workspace_id: params.workspaceId,
      series_id: params.seriesId,
      story_arc_id: params.storyArcId ?? null,
      title: params.title,
      description: params.description ?? null,
      thread_type: params.threadType ?? 'primary',
      color: params.color ?? null,
      created_by: params.createdBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePlotThread(params: {
  threadId: string;
  workspaceId: string;
  updates: { title?: string; description?: string; threadType?: string; status?: string; color?: string; sortOrder?: number };
  actorRole: WorkspaceRole;
}): Promise<void> {
  requireWorkspaceRole(params.actorRole, EDIT_ROLES, 'update plot threads');

  const db = getAdminClient();
  const patch: Record<string, unknown> = {};
  if (params.updates.title !== undefined) patch.title = params.updates.title;
  if (params.updates.description !== undefined) patch.description = params.updates.description;
  if (params.updates.threadType !== undefined) patch.thread_type = params.updates.threadType;
  if (params.updates.status !== undefined) patch.status = params.updates.status;
  if (params.updates.color !== undefined) patch.color = params.updates.color;
  if (params.updates.sortOrder !== undefined) patch.sort_order = params.updates.sortOrder;

  const { error } = await db
    .from('plot_threads')
    .update(patch)
    .eq('id', params.threadId)
    .eq('workspace_id', params.workspaceId);

  if (error) throw error;
}

export async function listPlotThreads(params: {
  workspaceId: string;
  seriesId?: string;
  storyArcId?: string;
}): Promise<PlotThread[]> {
  const db = getAdminClient();
  let query = db
    .from('plot_threads')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .order('sort_order');

  if (params.seriesId) query = query.eq('series_id', params.seriesId);
  if (params.storyArcId) query = query.eq('story_arc_id', params.storyArcId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ---- Timeline Events ----

export async function createTimelineEvent(params: {
  workspaceId: string;
  seriesId: string;
  title: string;
  description?: string;
  eventDate?: string;
  eventOrder?: number;
  eventType?: string;
  color?: string;
  wikiEntryId?: string;
  isPublic?: boolean;
  createdBy: string;
  actorRole: WorkspaceRole;
}): Promise<TimelineEvent> {
  requireWorkspaceRole(params.actorRole, EDIT_ROLES, 'create timeline events');

  const db = getAdminClient();
  const { data, error } = await db
    .from('timeline_events')
    .insert({
      workspace_id: params.workspaceId,
      series_id: params.seriesId,
      title: params.title,
      description: params.description ?? null,
      event_date: params.eventDate ?? null,
      event_order: params.eventOrder ?? 0,
      event_type: params.eventType ?? 'story',
      color: params.color ?? null,
      wiki_entry_id: params.wikiEntryId ?? null,
      is_public: params.isPublic ?? true,
      created_by: params.createdBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTimelineEvent(params: {
  eventId: string;
  workspaceId: string;
  updates: { title?: string; description?: string; eventDate?: string; eventOrder?: number; eventType?: string; color?: string };
  actorRole: WorkspaceRole;
}): Promise<void> {
  requireWorkspaceRole(params.actorRole, EDIT_ROLES, 'update timeline events');

  const db = getAdminClient();
  const patch: Record<string, unknown> = {};
  if (params.updates.title !== undefined) patch.title = params.updates.title;
  if (params.updates.description !== undefined) patch.description = params.updates.description;
  if (params.updates.eventDate !== undefined) patch.event_date = params.updates.eventDate;
  if (params.updates.eventOrder !== undefined) patch.event_order = params.updates.eventOrder;
  if (params.updates.eventType !== undefined) patch.event_type = params.updates.eventType;
  if (params.updates.color !== undefined) patch.color = params.updates.color;

  const { error } = await db
    .from('timeline_events')
    .update(patch)
    .eq('id', params.eventId)
    .eq('workspace_id', params.workspaceId);

  if (error) throw error;
}

export async function listTimelineEvents(params: {
  workspaceId: string;
  seriesId?: string;
  eventType?: string;
}): Promise<TimelineEvent[]> {
  const db = getAdminClient();
  let query = db
    .from('timeline_events')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .order('event_order');

  if (params.seriesId) query = query.eq('series_id', params.seriesId);
  if (params.eventType) query = query.eq('event_type', params.eventType);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ---- Story Beats ----

export async function createStoryBeat(params: {
  workspaceId: string;
  seriesId: string;
  bookId?: string;
  storyArcId?: string;
  title: string;
  description?: string;
  beatType?: string;
  sortOrder?: number;
  color?: string;
  createdBy: string;
  actorRole: WorkspaceRole;
}): Promise<StoryBeat> {
  requireWorkspaceRole(params.actorRole, EDIT_ROLES, 'create story beats');

  const db = getAdminClient();
  const { data, error } = await db
    .from('story_beats')
    .insert({
      workspace_id: params.workspaceId,
      series_id: params.seriesId,
      book_id: params.bookId ?? null,
      story_arc_id: params.storyArcId ?? null,
      title: params.title,
      description: params.description ?? null,
      beat_type: params.beatType ?? 'scene',
      sort_order: params.sortOrder ?? 0,
      color: params.color ?? null,
      created_by: params.createdBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listStoryBeats(params: {
  workspaceId: string;
  seriesId?: string;
  bookId?: string;
  storyArcId?: string;
}): Promise<StoryBeat[]> {
  const db = getAdminClient();
  let query = db
    .from('story_beats')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .order('sort_order');

  if (params.seriesId) query = query.eq('series_id', params.seriesId);
  if (params.bookId) query = query.eq('book_id', params.bookId);
  if (params.storyArcId) query = query.eq('story_arc_id', params.storyArcId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ---- Act Structures ----

export async function createActStructure(params: {
  workspaceId: string;
  bookId: string;
  title: string;
  actNumber: number;
  description?: string;
  pageStart?: number;
  pageEnd?: number;
  createdBy: string;
  actorRole: WorkspaceRole;
}): Promise<ActStructure> {
  requireWorkspaceRole(params.actorRole, EDIT_ROLES, 'create act structures');

  const db = getAdminClient();
  const { data, error } = await db
    .from('act_structures')
    .insert({
      workspace_id: params.workspaceId,
      book_id: params.bookId,
      title: params.title,
      act_number: params.actNumber,
      description: params.description ?? null,
      page_start: params.pageStart ?? null,
      page_end: params.pageEnd ?? null,
      created_by: params.createdBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateActStructure(params: {
  actId: string;
  workspaceId: string;
  updates: { title?: string; description?: string; pageStart?: number; pageEnd?: number; progress?: number; status?: string };
  actorRole: WorkspaceRole;
}): Promise<void> {
  requireWorkspaceRole(params.actorRole, EDIT_ROLES, 'update act structures');

  const db = getAdminClient();
  const patch: Record<string, unknown> = {};
  if (params.updates.title !== undefined) patch.title = params.updates.title;
  if (params.updates.description !== undefined) patch.description = params.updates.description;
  if (params.updates.pageStart !== undefined) patch.page_start = params.updates.pageStart;
  if (params.updates.pageEnd !== undefined) patch.page_end = params.updates.pageEnd;
  if (params.updates.progress !== undefined) patch.progress = params.updates.progress;
  if (params.updates.status !== undefined) patch.status = params.updates.status;

  const { error } = await db
    .from('act_structures')
    .update(patch)
    .eq('id', params.actId)
    .eq('workspace_id', params.workspaceId);

  if (error) throw error;
}

export async function listActStructures(bookId: string, workspaceId: string): Promise<ActStructure[]> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('act_structures')
    .select('*')
    .eq('book_id', bookId)
    .eq('workspace_id', workspaceId)
    .order('act_number');

  if (error) throw error;
  return data ?? [];
}

// ---- Character Arcs ----

export async function createCharacterArc(params: {
  workspaceId: string;
  seriesId: string;
  characterEntryId: string;
  storyArcId?: string;
  title: string;
  description?: string;
  arcStartState?: string;
  arcEndState?: string;
  createdBy: string;
  actorRole: WorkspaceRole;
}): Promise<CharacterArc> {
  requireWorkspaceRole(params.actorRole, EDIT_ROLES, 'create character arcs');

  const db = getAdminClient();
  const { data, error } = await db
    .from('character_arcs')
    .insert({
      workspace_id: params.workspaceId,
      series_id: params.seriesId,
      character_entry_id: params.characterEntryId,
      story_arc_id: params.storyArcId ?? null,
      title: params.title,
      description: params.description ?? null,
      arc_start_state: params.arcStartState ?? null,
      arc_end_state: params.arcEndState ?? null,
      created_by: params.createdBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listCharacterArcs(params: {
  workspaceId: string;
  seriesId?: string;
  characterEntryId?: string;
  storyArcId?: string;
}): Promise<CharacterArc[]> {
  const db = getAdminClient();
  let query = db
    .from('character_arcs')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .order('sort_order');

  if (params.seriesId) query = query.eq('series_id', params.seriesId);
  if (params.characterEntryId) query = query.eq('character_entry_id', params.characterEntryId);
  if (params.storyArcId) query = query.eq('story_arc_id', params.storyArcId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ---- Thread-Scene Links ----

export async function linkThreadToScene(params: {
  plotThreadId: string;
  sceneFileId: string;
  role?: string;
  actorRole: WorkspaceRole;
}): Promise<void> {
  requireWorkspaceRole(params.actorRole, EDIT_ROLES, 'link threads to scenes');

  const db = getAdminClient();
  const { error } = await db
    .from('thread_scene_links')
    .upsert({ plot_thread_id: params.plotThreadId, scene_file_id: params.sceneFileId, role: params.role ?? null },
      { onConflict: 'plot_thread_id,scene_file_id' });

  if (error) throw error;
}

export async function unlinkThreadFromScene(params: {
  plotThreadId: string;
  sceneFileId: string;
}): Promise<void> {
  const db = getAdminClient();
  const { error } = await db
    .from('thread_scene_links')
    .delete()
    .eq('plot_thread_id', params.plotThreadId)
    .eq('scene_file_id', params.sceneFileId);

  if (error) throw error;
}

export async function listThreadSceneLinks(plotThreadId: string) {
  const db = getAdminClient();
  const { data, error } = await db
    .from('thread_scene_links')
    .select('*')
    .eq('plot_thread_id', plotThreadId);

  if (error) throw error;
  return data ?? [];
}

// ---- Timeline-Scene Links ----

export async function linkTimelineEventToScene(params: {
  timelineEventId: string;
  sceneFileId: string;
  actorRole: WorkspaceRole;
}): Promise<void> {
  requireWorkspaceRole(params.actorRole, EDIT_ROLES, 'link timeline events to scenes');

  const db = getAdminClient();
  const { error } = await db
    .from('timeline_scene_links')
    .upsert({ timeline_event_id: params.timelineEventId, scene_file_id: params.sceneFileId },
      { onConflict: 'timeline_event_id,scene_file_id' });

  if (error) throw error;
}

export async function unlinkTimelineEventFromScene(params: {
  timelineEventId: string;
  sceneFileId: string;
}): Promise<void> {
  const db = getAdminClient();
  const { error } = await db
    .from('timeline_scene_links')
    .delete()
    .eq('timeline_event_id', params.timelineEventId)
    .eq('scene_file_id', params.sceneFileId);

  if (error) throw error;
}

// ---- Scenes ----

export async function createScene(params: {
  workspaceId: string;
  bookId: string;
  title: string;
  storyFileId?: string;
  storyOsSceneId?: string;
  actStructureId?: string;
  beat?: string;
  notes?: string;
  sortOrder?: number;
  createdBy: string;
  actorRole: WorkspaceRole;
}): Promise<Scene> {
  requireWorkspaceRole(params.actorRole, EDIT_ROLES, 'create scenes');

  const db = getAdminClient();
  const { data, error } = await db
    .from('scenes')
    .insert({
      workspace_id: params.workspaceId,
      book_id: params.bookId,
      title: params.title,
      story_file_id: params.storyFileId ?? null,
      story_os_scene_id: params.storyOsSceneId ?? null,
      act_structure_id: params.actStructureId ?? null,
      beat: params.beat ?? null,
      notes: params.notes ?? null,
      sort_order: params.sortOrder ?? 0,
      status: SceneStatus.OUTLINED,
      created_by: params.createdBy,
    })
    .select()
    .single();

  if (error) throw error;

  await createAuditLog({
    workspaceId: params.workspaceId,
    actorUserId: params.createdBy,
    actorRole: params.actorRole,
    targetType: 'scene',
    targetId: data.id,
    action: 'scene_created',
    afterSnapshot: { title: params.title },
    source: 'human',
  });

  return data;
}

export async function getScene(params: {
  sceneId: string;
  workspaceId: string;
}): Promise<Scene | null> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('scenes')
    .select('*')
    .eq('id', params.sceneId)
    .eq('workspace_id', params.workspaceId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

export async function listScenes(params: {
  workspaceId: string;
  bookId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<Scene[]> {
  const db = getAdminClient();
  let query = db
    .from('scenes')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .order('sort_order');

  if (params.bookId) query = query.eq('book_id', params.bookId);
  if (params.status) query = query.eq('status', params.status);
  if (params.limit) query = query.limit(params.limit);
  if (params.offset !== undefined) {
    query = query.range(params.offset, params.offset + (params.limit ?? 50) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function updateScene(params: {
  sceneId: string;
  workspaceId: string;
  updates: {
    title?: string;
    beat?: string;
    notes?: string;
    status?: SceneStatus;
    pageStart?: number;
    pageEnd?: number;
    wordCount?: number;
    sortOrder?: number;
    actStructureId?: string;
  };
  updatedBy: string;
  actorRole: WorkspaceRole;
}): Promise<void> {
  requireWorkspaceRole(params.actorRole, EDIT_ROLES, 'update scenes');

  const db = getAdminClient();
  const { data: scene } = await db
    .from('scenes')
    .select('status')
    .eq('id', params.sceneId)
    .single();

  if (scene) assertNotLocked(scene.status, 'Scene');

  const patch: Record<string, unknown> = { updated_by: params.updatedBy };
  if (params.updates.title !== undefined) patch.title = params.updates.title;
  if (params.updates.beat !== undefined) patch.beat = params.updates.beat;
  if (params.updates.notes !== undefined) patch.notes = params.updates.notes;
  if (params.updates.status !== undefined) patch.status = params.updates.status;
  if (params.updates.pageStart !== undefined) patch.page_start = params.updates.pageStart;
  if (params.updates.pageEnd !== undefined) patch.page_end = params.updates.pageEnd;
  if (params.updates.wordCount !== undefined) patch.word_count = params.updates.wordCount;
  if (params.updates.sortOrder !== undefined) patch.sort_order = params.updates.sortOrder;
  if (params.updates.actStructureId !== undefined) patch.act_structure_id = params.updates.actStructureId;

  const { error } = await db
    .from('scenes')
    .update(patch)
    .eq('id', params.sceneId)
    .eq('workspace_id', params.workspaceId);

  if (error) throw error;

  if (params.updates.status) {
    await createRevisionEvent({
      workspaceId: params.workspaceId,
      objectType: 'scene',
      objectId: params.sceneId,
      changedField: 'status',
      beforeValue: scene?.status,
      afterValue: params.updates.status,
      triggeredBy: params.updatedBy,
    });
  }
}

// ---- Pages ----

export async function createPage(params: {
  workspaceId: string;
  bookId: string;
  sceneId?: string;
  pageNumber: number;
  targetPanelCount?: number;
  notes?: string;
  createdBy: string;
  actorRole: WorkspaceRole;
}): Promise<Page> {
  requireWorkspaceRole(params.actorRole, EDIT_ROLES, 'create pages');

  const db = getAdminClient();
  const { data, error } = await db
    .from('pages')
    .insert({
      workspace_id: params.workspaceId,
      book_id: params.bookId,
      scene_id: params.sceneId ?? null,
      page_number: params.pageNumber,
      target_panel_count: params.targetPanelCount ?? 4,
      notes: params.notes ?? null,
      status: PageStatus.NOT_STARTED,
      created_by: params.createdBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPage(params: {
  pageId: string;
  workspaceId: string;
}): Promise<Page | null> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('pages')
    .select('*')
    .eq('id', params.pageId)
    .eq('workspace_id', params.workspaceId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

export async function listPages(params: {
  workspaceId: string;
  bookId?: string;
  sceneId?: string;
  status?: string;
}): Promise<Page[]> {
  const db = getAdminClient();
  let query = db
    .from('pages')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .order('page_number');

  if (params.bookId) query = query.eq('book_id', params.bookId);
  if (params.sceneId) query = query.eq('scene_id', params.sceneId);
  if (params.status) query = query.eq('status', params.status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function updatePage(params: {
  pageId: string;
  workspaceId: string;
  updates: {
    sceneId?: string;
    status?: PageStatus;
    notes?: string;
    targetPanelCount?: number;
  };
  updatedBy: string;
  actorRole: WorkspaceRole;
}): Promise<void> {
  requireWorkspaceRole(params.actorRole, EDIT_ROLES, 'update pages');

  const db = getAdminClient();
  const patch: Record<string, unknown> = { updated_by: params.updatedBy };
  if (params.updates.sceneId !== undefined) patch.scene_id = params.updates.sceneId;
  if (params.updates.status !== undefined) patch.status = params.updates.status;
  if (params.updates.notes !== undefined) patch.notes = params.updates.notes;
  if (params.updates.targetPanelCount !== undefined) patch.target_panel_count = params.updates.targetPanelCount;

  const { error } = await db
    .from('pages')
    .update(patch)
    .eq('id', params.pageId)
    .eq('workspace_id', params.workspaceId);

  if (error) throw error;
}

// ---- Panels ----

export async function createPanel(params: {
  workspaceId: string;
  pageId: string;
  sceneId?: string;
  panelNumber: number;
  shotType?: string;
  environment?: string;
  lighting?: string;
  dialogue?: string;
  caption?: string;
  continuityNote?: string;
  directorNotes?: string;
  characters?: string[];
  props?: string[];
  createdBy: string;
  actorRole: WorkspaceRole;
}): Promise<Panel> {
  requireWorkspaceRole(params.actorRole, EDIT_ROLES, 'create panels');

  const db = getAdminClient();
  const { data, error } = await db
    .from('panels')
    .insert({
      workspace_id: params.workspaceId,
      page_id: params.pageId,
      scene_id: params.sceneId ?? null,
      panel_number: params.panelNumber,
      shot_type: params.shotType ?? null,
      environment: params.environment ?? null,
      lighting: params.lighting ?? null,
      dialogue: params.dialogue ?? null,
      caption: params.caption ?? null,
      continuity_note: params.continuityNote ?? null,
      director_notes: params.directorNotes ?? null,
      characters: params.characters ?? [],
      props: params.props ?? [],
      status: PanelStatus.PLANNED,
      created_by: params.createdBy,
    })
    .select()
    .single();

  if (error) throw error;

  // Increment page panel_count
  await db.rpc('increment_page_panel_count', { p_page_id: params.pageId }).maybeSingle().catch(() => null);

  return data;
}

export async function getPanel(params: {
  panelId: string;
  workspaceId: string;
}): Promise<Panel | null> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('panels')
    .select('*')
    .eq('id', params.panelId)
    .eq('workspace_id', params.workspaceId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

export async function listPanels(params: {
  workspaceId: string;
  pageId?: string;
  sceneId?: string;
  status?: string;
}): Promise<Panel[]> {
  const db = getAdminClient();
  let query = db
    .from('panels')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .order('panel_number');

  if (params.pageId) query = query.eq('page_id', params.pageId);
  if (params.sceneId) query = query.eq('scene_id', params.sceneId);
  if (params.status) query = query.eq('status', params.status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function updatePanel(params: {
  panelId: string;
  workspaceId: string;
  updates: {
    status?: PanelStatus;
    shotType?: string;
    environment?: string;
    lighting?: string;
    dialogue?: string;
    caption?: string;
    continuityNote?: string;
    directorNotes?: string;
    characters?: string[];
    props?: string[];
  };
  updatedBy: string;
  actorRole: WorkspaceRole;
}): Promise<void> {
  requireWorkspaceRole(params.actorRole, EDIT_ROLES, 'update panels');

  const db = getAdminClient();
  const patch: Record<string, unknown> = { updated_by: params.updatedBy };
  if (params.updates.status !== undefined) patch.status = params.updates.status;
  if (params.updates.shotType !== undefined) patch.shot_type = params.updates.shotType;
  if (params.updates.environment !== undefined) patch.environment = params.updates.environment;
  if (params.updates.lighting !== undefined) patch.lighting = params.updates.lighting;
  if (params.updates.dialogue !== undefined) patch.dialogue = params.updates.dialogue;
  if (params.updates.caption !== undefined) patch.caption = params.updates.caption;
  if (params.updates.continuityNote !== undefined) patch.continuity_note = params.updates.continuityNote;
  if (params.updates.directorNotes !== undefined) patch.director_notes = params.updates.directorNotes;
  if (params.updates.characters !== undefined) patch.characters = params.updates.characters;
  if (params.updates.props !== undefined) patch.props = params.updates.props;

  const { error } = await db
    .from('panels')
    .update(patch)
    .eq('id', params.panelId)
    .eq('workspace_id', params.workspaceId);

  if (error) throw error;
}

// ---- Scene Status Transitions ----

export async function draftScene(params: {
  sceneId: string;
  workspaceId: string;
  actorId: string;
  actorRole: WorkspaceRole;
}): Promise<void> {
  requireWorkspaceRole(params.actorRole, EDIT_ROLES, 'draft scenes');
  await updateScene({
    sceneId: params.sceneId,
    workspaceId: params.workspaceId,
    updates: { status: SceneStatus.DRAFTED },
    updatedBy: params.actorId,
    actorRole: params.actorRole,
  });
}

export async function submitSceneForReview(params: {
  sceneId: string;
  workspaceId: string;
  actorId: string;
  actorRole: WorkspaceRole;
}): Promise<void> {
  requireWorkspaceRole(params.actorRole, EDIT_ROLES, 'submit scenes for review');

  const db = getAdminClient();
  const { data: scene } = await db
    .from('scenes')
    .select('status')
    .eq('id', params.sceneId)
    .single();

  if (!scene) throw new Error('Scene not found');
  if (scene.status !== SceneStatus.DRAFTED && scene.status !== SceneStatus.REVISED) {
    throw new PermissionError('Only drafted or revised scenes can be submitted for review');
  }

  await updateScene({
    sceneId: params.sceneId,
    workspaceId: params.workspaceId,
    updates: { status: SceneStatus.IN_REVIEW },
    updatedBy: params.actorId,
    actorRole: params.actorRole,
  });
}
