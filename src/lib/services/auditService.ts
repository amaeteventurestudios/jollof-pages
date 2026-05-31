// ============================================================
// AUDIT SERVICE — Server-side only
// ============================================================
import { getTypedAdminClient as getAdminClient } from '@/lib/supabase/typed';
import type { AuditSource } from '@/lib/enums';

interface AuditParams {
  workspaceId?: string;
  actorUserId?: string;
  actorRole?: string;
  targetType: string;
  targetId?: string;
  action: string;
  beforeSnapshot?: unknown;
  afterSnapshot?: unknown;
  source?: AuditSource;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

interface RevisionParams {
  workspaceId: string;
  objectType: string;
  objectId: string;
  changedField?: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  triggeredBy?: string;
  impactSummary?: Record<string, unknown>;
  staleObjects?: unknown[];
}

export async function createAuditLog(params: AuditParams): Promise<void> {
  try {
    const db = getAdminClient();
    await db.from('audit_logs').insert({
      workspace_id: params.workspaceId ?? null,
      actor_user_id: params.actorUserId ?? null,
      actor_role: params.actorRole ?? null,
      target_type: params.targetType,
      target_id: params.targetId ?? null,
      action: params.action,
      before_snapshot: params.beforeSnapshot ?? null,
      after_snapshot: params.afterSnapshot ?? null,
      source: params.source ?? 'system',
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
      metadata: params.metadata ?? {},
    });
  } catch (err) {
    // Audit failures should not crash the main operation — log and continue
    console.error('[AuditService] Failed to write audit log:', err);
  }
}

export async function createRevisionEvent(params: RevisionParams): Promise<string | null> {
  try {
    const db = getAdminClient();
    const { data, error } = await db
      .from('revision_events')
      .insert({
        workspace_id: params.workspaceId,
        object_type: params.objectType,
        object_id: params.objectId,
        changed_field: params.changedField ?? null,
        before_value: params.beforeValue ?? null,
        after_value: params.afterValue ?? null,
        triggered_by: params.triggeredBy ?? null,
        impact_summary: params.impactSummary ?? null,
        stale_objects: params.staleObjects ?? [],
      })
      .select('id')
      .single();

    if (error) throw error;
    return data?.id ?? null;
  } catch (err) {
    console.error('[AuditService] Failed to write revision event:', err);
    return null;
  }
}

export async function getAuditLogs(params: {
  workspaceId: string;
  targetType?: string;
  targetId?: string;
  limit?: number;
  offset?: number;
}) {
  const db = getAdminClient();
  let query = db
    .from('audit_logs')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 50)
    .range(params.offset ?? 0, (params.offset ?? 0) + (params.limit ?? 50) - 1);

  if (params.targetType) query = query.eq('target_type', params.targetType);
  if (params.targetId) query = query.eq('target_id', params.targetId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
