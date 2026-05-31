// ============================================================
// COMMENT SERVICE — comments, notifications
// ============================================================
import { getTypedAdminClient as getAdminClient } from '@/lib/supabase/typed';
import type { Comment, Notification } from '@/lib/types/database';

const COMMENTABLE_TYPES = new Set([
  'wiki_entry', 'scene', 'page', 'panel', 'board',
  'asset', 'continuity_flag', 'timeline_event',
  'story_arc', 'plot_thread', 'production_export',
]);

// ---- Comments ----

export async function addComment(params: {
  workspaceId: string;
  objectType: string;
  objectId: string;
  authorId: string;
  bodyMarkdown: string;
  parentCommentId?: string;
}): Promise<Comment> {
  if (!COMMENTABLE_TYPES.has(params.objectType)) {
    throw new Error(`Unsupported commentable object type: ${params.objectType}`);
  }
  if (!params.bodyMarkdown.trim()) {
    throw new Error('Comment body cannot be empty');
  }

  const db = getAdminClient();
  const { data, error } = await db
    .from('comments')
    .insert({
      workspace_id: params.workspaceId,
      object_type: params.objectType,
      object_id: params.objectId,
      author_id: params.authorId,
      body_markdown: params.bodyMarkdown,
      parent_comment_id: params.parentCommentId ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getComment(commentId: string): Promise<Comment | null> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('comments')
    .select('*')
    .eq('id', commentId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

export async function listComments(params: {
  workspaceId: string;
  objectType: string;
  objectId: string;
  includeResolved?: boolean;
}): Promise<Comment[]> {
  const db = getAdminClient();
  let query = db
    .from('comments')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .eq('object_type', params.objectType)
    .eq('object_id', params.objectId)
    .is('parent_comment_id', null)
    .order('created_at');

  if (!params.includeResolved) query = query.eq('is_resolved', false);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getCommentThread(parentCommentId: string): Promise<Comment[]> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('comments')
    .select('*')
    .eq('parent_comment_id', parentCommentId)
    .order('created_at');

  if (error) throw error;
  return data ?? [];
}

export async function updateComment(params: {
  commentId: string;
  authorId: string;
  bodyMarkdown: string;
}): Promise<void> {
  if (!params.bodyMarkdown.trim()) {
    throw new Error('Comment body cannot be empty');
  }

  const db = getAdminClient();
  const { error } = await db
    .from('comments')
    .update({ body_markdown: params.bodyMarkdown })
    .eq('id', params.commentId)
    .eq('author_id', params.authorId);

  if (error) throw error;
}

export async function resolveComment(params: {
  commentId: string;
  workspaceId: string;
  resolvedBy: string;
}): Promise<void> {
  const db = getAdminClient();
  const { error } = await db
    .from('comments')
    .update({
      is_resolved: true,
      resolved_by: params.resolvedBy,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', params.commentId)
    .eq('workspace_id', params.workspaceId);

  if (error) throw error;
}

export async function deleteComment(params: {
  commentId: string;
  authorId: string;
}): Promise<void> {
  const db = getAdminClient();
  const { error } = await db
    .from('comments')
    .delete()
    .eq('id', params.commentId)
    .eq('author_id', params.authorId);

  if (error) throw error;
}

// ---- Notifications ----

export async function createNotification(params: {
  workspaceId: string;
  userId: string;
  notificationType: string;
  title: string;
  body?: string;
  objectType?: string;
  objectId?: string;
  metadata?: Record<string, unknown>;
}): Promise<Notification> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('notifications')
    .insert({
      workspace_id: params.workspaceId,
      user_id: params.userId,
      notification_type: params.notificationType,
      title: params.title,
      body: params.body ?? null,
      object_type: params.objectType ?? null,
      object_id: params.objectId ?? null,
      metadata: params.metadata ?? {},
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function broadcastNotification(params: {
  workspaceId: string;
  userIds: string[];
  notificationType: string;
  title: string;
  body?: string;
  objectType?: string;
  objectId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!params.userIds.length) return;

  const db = getAdminClient();
  const rows = params.userIds.map((userId) => ({
    workspace_id: params.workspaceId,
    user_id: userId,
    notification_type: params.notificationType,
    title: params.title,
    body: params.body ?? null,
    object_type: params.objectType ?? null,
    object_id: params.objectId ?? null,
    metadata: params.metadata ?? {},
  }));

  const { error } = await db.from('notifications').insert(rows);
  if (error) throw error;
}

export async function getUserNotifications(params: {
  userId: string;
  workspaceId?: string;
  unreadOnly?: boolean;
  limit?: number;
}): Promise<Notification[]> {
  const db = getAdminClient();
  let query = db
    .from('notifications')
    .select('*')
    .eq('user_id', params.userId)
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 50);

  if (params.workspaceId) query = query.eq('workspace_id', params.workspaceId);
  if (params.unreadOnly) query = query.eq('is_read', false);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(params: {
  notificationId: string;
  userId: string;
}): Promise<void> {
  const db = getAdminClient();
  const { error } = await db
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', params.notificationId)
    .eq('user_id', params.userId);

  if (error) throw error;
}

export async function markAllNotificationsRead(params: {
  userId: string;
  workspaceId?: string;
}): Promise<void> {
  const db = getAdminClient();
  let query = db
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', params.userId)
    .eq('is_read', false);

  if (params.workspaceId) query = query.eq('workspace_id', params.workspaceId);
  const { error } = await query;
  if (error) throw error;
}

export async function getUnreadCount(params: {
  userId: string;
  workspaceId?: string;
}): Promise<number> {
  const db = getAdminClient();
  let query = db
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', params.userId)
    .eq('is_read', false);

  if (params.workspaceId) query = query.eq('workspace_id', params.workspaceId);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}
