// ============================================================
// BOARD SERVICE — Visual Reference Boards
// boards, board_items, board_item_links, board_comments
// ============================================================
import { getTypedAdminClient as getAdminClient } from '@/lib/supabase/typed';
import { createAuditLog } from './auditService';
import { canManageBoard, PermissionError } from './permissionService';
import type { BoardType, WorkspaceRole } from '@/lib/enums';
import type { Board, BoardItem } from '@/lib/types/database';

// ---- Boards ----

export async function createBoard(params: {
  workspaceId: string;
  seriesId: string;
  bookId?: string;
  boardType: BoardType;
  title: string;
  description?: string;
  createdBy: string;
  actorRole: WorkspaceRole;
}): Promise<Board> {
  if (!canManageBoard(params.actorRole)) {
    throw new PermissionError('You do not have permission to create boards');
  }

  const db = getAdminClient();
  const { data, error } = await db
    .from('boards')
    .insert({
      workspace_id: params.workspaceId,
      series_id: params.seriesId,
      book_id: params.bookId ?? null,
      board_type: params.boardType,
      title: params.title,
      description: params.description ?? null,
      created_by: params.createdBy,
    })
    .select()
    .single();

  if (error) throw error;

  await createAuditLog({
    workspaceId: params.workspaceId,
    actorUserId: params.createdBy,
    actorRole: params.actorRole,
    targetType: 'board',
    targetId: data.id,
    action: 'board_created',
    afterSnapshot: { title: params.title, board_type: params.boardType },
    source: 'human',
  });

  return data;
}

export async function getBoard(params: {
  boardId: string;
  workspaceId: string;
}): Promise<Board | null> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('boards')
    .select('*')
    .eq('id', params.boardId)
    .eq('workspace_id', params.workspaceId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

export async function listBoards(params: {
  workspaceId: string;
  seriesId?: string;
  boardType?: BoardType;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}): Promise<Board[]> {
  const db = getAdminClient();
  let query = db
    .from('boards')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .order('created_at', { ascending: false });

  if (params.seriesId) query = query.eq('series_id', params.seriesId);
  if (params.boardType) query = query.eq('board_type', params.boardType);
  if (!params.includeArchived) query = query.eq('is_archived', false);
  if (params.limit) query = query.limit(params.limit);
  if (params.offset !== undefined) {
    const end = params.offset + (params.limit ?? 50) - 1;
    query = query.range(params.offset, end);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function updateBoard(params: {
  boardId: string;
  workspaceId: string;
  updates: { title?: string; description?: string; coverAssetId?: string };
  updatedBy: string;
  actorRole: WorkspaceRole;
}): Promise<void> {
  if (!canManageBoard(params.actorRole)) {
    throw new PermissionError('You do not have permission to update this board');
  }

  const db = getAdminClient();
  const patch: Record<string, unknown> = { updated_by: params.updatedBy };
  if (params.updates.title !== undefined) patch.title = params.updates.title;
  if (params.updates.description !== undefined) patch.description = params.updates.description;
  if (params.updates.coverAssetId !== undefined) patch.cover_asset_id = params.updates.coverAssetId;

  const { error } = await db
    .from('boards')
    .update(patch)
    .eq('id', params.boardId)
    .eq('workspace_id', params.workspaceId);

  if (error) throw error;
}

export async function archiveBoard(params: {
  boardId: string;
  workspaceId: string;
  actorId: string;
  actorRole: WorkspaceRole;
}): Promise<void> {
  if (!canManageBoard(params.actorRole)) {
    throw new PermissionError('You do not have permission to archive boards');
  }

  const db = getAdminClient();
  const { error } = await db
    .from('boards')
    .update({ is_archived: true, updated_by: params.actorId })
    .eq('id', params.boardId)
    .eq('workspace_id', params.workspaceId);

  if (error) throw error;

  await createAuditLog({
    workspaceId: params.workspaceId,
    actorUserId: params.actorId,
    actorRole: params.actorRole,
    targetType: 'board',
    targetId: params.boardId,
    action: 'board_archived',
    source: 'human',
  });
}

// ---- Board Items ----

export async function addBoardItem(params: {
  boardId: string;
  workspaceId: string;
  itemType: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  zIndex?: number;
  title?: string;
  bodyMarkdown?: string;
  url?: string;
  color?: string;
  assetId?: string;
  wikiEntryId?: string;
  groupId?: string;
  metadata?: Record<string, unknown>;
  createdBy: string;
  actorRole: WorkspaceRole;
}): Promise<BoardItem> {
  if (!canManageBoard(params.actorRole)) {
    throw new PermissionError('You do not have permission to add items to this board');
  }

  const db = getAdminClient();
  const { data, error } = await db
    .from('board_items')
    .insert({
      board_id: params.boardId,
      item_type: params.itemType,
      x: params.x,
      y: params.y,
      width: params.width ?? 200,
      height: params.height ?? 150,
      z_index: params.zIndex ?? 0,
      title: params.title ?? null,
      body_markdown: params.bodyMarkdown ?? null,
      url: params.url ?? null,
      color: params.color ?? null,
      asset_id: params.assetId ?? null,
      wiki_entry_id: params.wikiEntryId ?? null,
      group_id: params.groupId ?? null,
      metadata: params.metadata ?? {},
      created_by: params.createdBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBoardItem(params: {
  itemId: string;
  boardId: string;
  updates: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    zIndex?: number;
    title?: string;
    bodyMarkdown?: string;
    color?: string;
    isLocked?: boolean;
    metadata?: Record<string, unknown>;
  };
}): Promise<void> {
  const db = getAdminClient();
  const patch: Record<string, unknown> = {};
  if (params.updates.x !== undefined) patch.x = params.updates.x;
  if (params.updates.y !== undefined) patch.y = params.updates.y;
  if (params.updates.width !== undefined) patch.width = params.updates.width;
  if (params.updates.height !== undefined) patch.height = params.updates.height;
  if (params.updates.zIndex !== undefined) patch.z_index = params.updates.zIndex;
  if (params.updates.title !== undefined) patch.title = params.updates.title;
  if (params.updates.bodyMarkdown !== undefined) patch.body_markdown = params.updates.bodyMarkdown;
  if (params.updates.color !== undefined) patch.color = params.updates.color;
  if (params.updates.isLocked !== undefined) patch.is_locked = params.updates.isLocked;
  if (params.updates.metadata !== undefined) patch.metadata = params.updates.metadata;

  if (Object.keys(patch).length === 0) return;

  const { error } = await db
    .from('board_items')
    .update(patch)
    .eq('id', params.itemId)
    .eq('board_id', params.boardId);

  if (error) throw error;
}

export async function batchMoveBoardItems(params: {
  boardId: string;
  positions: Array<{ itemId: string; x: number; y: number; zIndex?: number }>;
}): Promise<void> {
  const db = getAdminClient();
  await Promise.all(
    params.positions.map((p) => {
      const patch: Record<string, unknown> = { x: p.x, y: p.y };
      if (p.zIndex !== undefined) patch.z_index = p.zIndex;
      return db
        .from('board_items')
        .update(patch)
        .eq('id', p.itemId)
        .eq('board_id', params.boardId);
    })
  );
}

export async function deleteBoardItem(params: {
  itemId: string;
  boardId: string;
  actorRole: WorkspaceRole;
}): Promise<void> {
  if (!canManageBoard(params.actorRole)) {
    throw new PermissionError('You do not have permission to delete board items');
  }

  const db = getAdminClient();
  const { error } = await db
    .from('board_items')
    .delete()
    .eq('id', params.itemId)
    .eq('board_id', params.boardId);

  if (error) throw error;
}

export async function listBoardItems(boardId: string): Promise<BoardItem[]> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('board_items')
    .select('*')
    .eq('board_id', boardId)
    .order('z_index');

  if (error) throw error;
  return data ?? [];
}

// ---- Board Item Links ----

export async function addBoardItemLink(params: {
  sourceItemId: string;
  targetItemId: string;
  label?: string;
}): Promise<string> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('board_item_links')
    .insert({
      source_item_id: params.sourceItemId,
      target_item_id: params.targetItemId,
      label: params.label ?? null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function deleteBoardItemLink(linkId: string): Promise<void> {
  const db = getAdminClient();
  const { error } = await db
    .from('board_item_links')
    .delete()
    .eq('id', linkId);

  if (error) throw error;
}

export async function listBoardItemLinks(boardId: string) {
  const db = getAdminClient();
  const { data, error } = await db
    .from('board_item_links')
    .select('*, source_item:board_items!source_item_id(id, board_id), target_item:board_items!target_item_id(id, board_id)')
    .eq('board_items.board_id', boardId);

  if (error) throw error;
  return data ?? [];
}

// ---- Board Comments ----

export async function addBoardComment(params: {
  boardId: string;
  authorId: string;
  bodyMarkdown: string;
  parentCommentId?: string;
}): Promise<string> {
  if (!params.bodyMarkdown.trim()) {
    throw new Error('Comment body cannot be empty');
  }

  const db = getAdminClient();
  const { data, error } = await db
    .from('board_comments')
    .insert({
      board_id: params.boardId,
      author_id: params.authorId,
      body_markdown: params.bodyMarkdown,
      parent_comment_id: params.parentCommentId ?? null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function resolveBoardComment(params: {
  commentId: string;
  boardId: string;
}): Promise<void> {
  const db = getAdminClient();
  const { error } = await db
    .from('board_comments')
    .update({ is_resolved: true })
    .eq('id', params.commentId)
    .eq('board_id', params.boardId);

  if (error) throw error;
}

export async function listBoardComments(boardId: string, includeResolved = false) {
  const db = getAdminClient();
  let query = db
    .from('board_comments')
    .select('*')
    .eq('board_id', boardId)
    .order('created_at');

  if (!includeResolved) query = query.eq('is_resolved', false);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
