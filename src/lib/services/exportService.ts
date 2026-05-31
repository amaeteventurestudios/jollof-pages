// ============================================================
// EXPORT SERVICE — Production package exports
// ============================================================
import { getTypedAdminClient as getAdminClient } from '@/lib/supabase/typed';
import { createAuditLog } from './auditService';
import { requireCanExportBook, PermissionError } from './permissionService';
import { hasBlockingFlags } from './continuityService';
import { R2_BUCKET_EXPORTS } from '@/lib/r2/client';
import type { WorkspaceRole, ExportType } from '@/lib/enums';
import type { ProductionExport } from '@/lib/types/database';

export async function createProductionExport(params: {
  workspaceId: string;
  seriesId: string;
  bookId?: string;
  exportType: ExportType;
  title: string;
  createdBy: string;
  createdByRole: WorkspaceRole;
}): Promise<ProductionExport> {
  requireCanExportBook(params.createdByRole);

  const db = getAdminClient();

  // Check for blocking continuity flags
  if (params.bookId) {
    const blocking = await hasBlockingFlags(params.bookId);
    if (blocking) {
      throw new PermissionError(
        'Export blocked: unresolved critical continuity flags must be resolved or overridden before exporting a production package'
      );
    }
  }

  const { data, error } = await db
    .from('production_exports')
    .insert({
      workspace_id: params.workspaceId,
      series_id: params.seriesId,
      book_id: params.bookId ?? null,
      export_type: params.exportType,
      title: params.title,
      status: 'pending',
      created_by: params.createdBy,
    })
    .select()
    .single();

  if (error) throw error;

  await createAuditLog({
    workspaceId: params.workspaceId,
    actorUserId: params.createdBy,
    actorRole: params.createdByRole,
    targetType: 'production_export',
    targetId: data.id,
    action: 'export_created',
    afterSnapshot: { export_type: params.exportType, book_id: params.bookId },
    source: 'human',
  });

  return data;
}

export async function buildExportManifest(params: {
  exportId: string;
  workspaceId: string;
  bookId?: string;
}): Promise<Record<string, unknown>> {
  const db = getAdminClient();

  const [scenesResult, pagesResult, flagsResult] = await Promise.all([
    params.bookId
      ? db.from('scenes').select('id, title, status').eq('book_id', params.bookId)
      : Promise.resolve({ data: [] }),
    params.bookId
      ? db.from('pages').select('id, page_number, status').eq('book_id', params.bookId)
      : Promise.resolve({ data: [] }),
    params.bookId
      ? db.from('continuity_flags').select('id, severity, status').eq('book_id', params.bookId).eq('status', 'open')
      : Promise.resolve({ data: [] }),
  ]);

  const scenes = (scenesResult as { data: Array<{ id: string; title: string; status: string }> | null }).data ?? [];
  const pages = (pagesResult as { data: Array<{ id: string; page_number: number; status: string }> | null }).data ?? [];
  const flags = (flagsResult as { data: Array<{ id: string; severity: string; status: string }> | null }).data ?? [];

  const approvedScenes = scenes.filter((s) => ['approved', 'locked'].includes(s.status));
  const approvedPages = pages.filter((p) => ['approved'].includes(p.status));
  const criticalFlags = flags.filter((f) => f.severity === 'critical');

  return {
    export_id: params.exportId,
    generated_at: new Date().toISOString(),
    scenes: {
      total: scenes.length,
      approved: approvedScenes.length,
      approved_ids: approvedScenes.map((s) => s.id),
    },
    pages: {
      total: pages.length,
      approved: approvedPages.length,
    },
    continuity_flags: {
      total_open: flags.length,
      critical: criticalFlags.length,
    },
    production_ready: criticalFlags.length === 0 && approvedScenes.length === scenes.length,
  };
}

export async function finalizeExport(params: {
  exportId: string;
  workspaceId: string;
  manifest: Record<string, unknown>;
  r2Key: string;
  fileSizeBytes: number;
}): Promise<void> {
  const db = getAdminClient();

  await db
    .from('production_exports')
    .update({
      status: 'completed',
      r2_bucket: R2_BUCKET_EXPORTS(),
      r2_key: params.r2Key,
      file_size_bytes: params.fileSizeBytes,
      manifest: params.manifest,
      validation_summary: params.manifest['continuity_flags'] as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.exportId);
}
