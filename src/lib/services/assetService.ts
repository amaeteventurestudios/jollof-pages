// ============================================================
// ASSET SERVICE — Server-side
// assets, asset_versions, asset_usages, asset_upload_sessions
// All images stored in Cloudflare R2, never Supabase Storage
// ============================================================
import { getTypedAdminClient as getAdminClient } from '@/lib/supabase/typed';
import { createAuditLog } from './auditService';
import { uploadAssetToR2, getSignedReadUrl, R2Keys } from '@/lib/r2/utils';
import type { Asset } from '@/lib/types/database';

const ALLOWED_MIME_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
  'image/gif', 'image/svg+xml',
  'text/markdown', 'text/plain', 'application/json',
  'application/zip',
]);

const MAX_FILE_SIZE = 52_428_800; // 50MB

export function validateAssetUpload(params: {
  mimeType: string;
  sizeBytes: number;
  maxSizeBytes?: number;
}): void {
  if (!ALLOWED_MIME_TYPES.has(params.mimeType)) {
    throw new Error(`Unsupported file type: ${params.mimeType}`);
  }
  const maxSize = params.maxSizeBytes ?? MAX_FILE_SIZE;
  if (params.sizeBytes > maxSize) {
    throw new Error(`File exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)}MB`);
  }
}

export async function uploadAsset(params: {
  workspaceId: string;
  seriesId?: string;
  assetId: string;
  filename: string;
  mimeType: string;
  body: Buffer;
  uploadedBy: string;
  assetRole?: string;
  isPublic?: boolean;
  metadata?: Record<string, string>;
}): Promise<Asset> {
  validateAssetUpload({ mimeType: params.mimeType, sizeBytes: params.body.length });

  const db = getAdminClient();
  const r2Key = R2Keys.asset(
    params.workspaceId,
    params.seriesId ?? 'global',
    params.assetId,
    params.filename
  );

  const uploaded = await uploadAssetToR2({
    key: r2Key,
    body: params.body,
    contentType: params.mimeType,
    isPublic: params.isPublic ?? false,
    metadata: {
      workspace_id: params.workspaceId,
      uploaded_by: params.uploadedBy,
      ...params.metadata,
    },
  });

  const { data: asset, error } = await db
    .from('assets')
    .insert({
      id: params.assetId,
      workspace_id: params.workspaceId,
      series_id: params.seriesId ?? null,
      original_filename: params.filename,
      mime_type: params.mimeType,
      size_bytes: params.body.length,
      r2_bucket: uploaded.r2_bucket,
      r2_key: uploaded.r2_key,
      public_url: uploaded.public_url,
      asset_type: params.mimeType.startsWith('image/') ? 'image' : 'document',
      role: params.assetRole ?? 'reference',
      processed: true,
      created_by: params.uploadedBy,
    })
    .select()
    .single();

  if (error) throw error;

  // Update storage quota
  await db.rpc('increment_storage_usage', {
    p_workspace_id: params.workspaceId,
    p_bytes: params.body.length,
  }).maybeSingle();

  await createAuditLog({
    workspaceId: params.workspaceId,
    actorUserId: params.uploadedBy,
    targetType: 'asset',
    targetId: params.assetId,
    action: 'asset_uploaded',
    afterSnapshot: { filename: params.filename, size_bytes: params.body.length },
    source: 'human',
  });

  return asset;
}

export async function softDeleteAsset(params: {
  assetId: string;
  workspaceId: string;
  deletedBy: string;
}): Promise<void> {
  const db = getAdminClient();

  const { data: asset } = await db
    .from('assets')
    .select('r2_key, r2_bucket, size_bytes')
    .eq('id', params.assetId)
    .eq('workspace_id', params.workspaceId)
    .single();

  if (!asset) throw new Error('Asset not found');

  await db
    .from('assets')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_by: params.deletedBy,
    })
    .eq('id', params.assetId);

  await createAuditLog({
    workspaceId: params.workspaceId,
    actorUserId: params.deletedBy,
    targetType: 'asset',
    targetId: params.assetId,
    action: 'asset_deleted',
    source: 'human',
  });
}

export async function getAssetUrl(params: {
  assetId: string;
  workspaceId: string;
  forcePublic?: boolean;
  ttlSeconds?: number;
}): Promise<string> {
  const db = getAdminClient();
  const { data: asset } = await db
    .from('assets')
    .select('r2_key, r2_bucket, public_url')
    .eq('id', params.assetId)
    .eq('workspace_id', params.workspaceId)
    .single();

  if (!asset) throw new Error('Asset not found');

  if (params.forcePublic && asset.public_url) return asset.public_url;

  return getSignedReadUrl({
    key: asset.r2_key,
    bucket: asset.r2_bucket,
    ttlSeconds: params.ttlSeconds,
  });
}

export async function linkAssetToObject(params: {
  assetId: string;
  objectType: string;
  objectId: string;
  usageRole?: string;
}): Promise<void> {
  const db = getAdminClient();
  await db.from('asset_usages').upsert({
    asset_id: params.assetId,
    object_type: params.objectType,
    object_id: params.objectId,
    usage_role: params.usageRole ?? 'reference',
  }, { onConflict: 'asset_id,object_type,object_id' });

  await db
    .from('assets')
    .update({ usage_count: db.rpc('usage_count + 1') as unknown as number })
    .eq('id', params.assetId);
}

export async function unlinkAssetFromObject(params: {
  assetId: string;
  objectType: string;
  objectId: string;
}): Promise<void> {
  const db = getAdminClient();
  await db
    .from('asset_usages')
    .delete()
    .eq('asset_id', params.assetId)
    .eq('object_type', params.objectType)
    .eq('object_id', params.objectId);
}

export async function getAssetUsages(assetId: string) {
  const db = getAdminClient();
  const { data, error } = await db
    .from('asset_usages')
    .select('*')
    .eq('asset_id', assetId);

  if (error) throw error;
  return data ?? [];
}

export async function listAssets(params: {
  workspaceId: string;
  seriesId?: string;
  assetType?: string;
  includeDeleted?: boolean;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}): Promise<Asset[]> {
  const db = getAdminClient();
  let query = db
    .from('assets')
    .select('*')
    .eq('workspace_id', params.workspaceId)
    .order('created_at', { ascending: false });

  if (params.seriesId) query = query.eq('series_id', params.seriesId);
  if (params.assetType) query = query.eq('asset_type', params.assetType);
  if (!params.includeDeleted) query = query.eq('is_deleted', false);
  if (!params.includeArchived) query = query.eq('is_archived', false);
  if (params.limit) query = query.limit(params.limit);
  if (params.offset !== undefined) {
    query = query.range(params.offset, params.offset + (params.limit ?? 50) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ---- Asset Versions ----

export async function createAssetVersion(params: {
  assetId: string;
  versionNumber: number;
  r2Key: string;
  sizeBytes: number;
  createdBy: string;
}): Promise<void> {
  const db = getAdminClient();
  const { error } = await db
    .from('asset_versions')
    .insert({
      asset_id: params.assetId,
      version_number: params.versionNumber,
      r2_key: params.r2Key,
      size_bytes: params.sizeBytes,
      created_by: params.createdBy,
    });

  if (error) throw error;
}

export async function listAssetVersions(assetId: string) {
  const db = getAdminClient();
  const { data, error } = await db
    .from('asset_versions')
    .select('*')
    .eq('asset_id', assetId)
    .order('version_number', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// ---- Upload Sessions (signed-URL flow) ----

export async function createUploadSession(params: {
  workspaceId: string;
  seriesId?: string;
  r2Key: string;
  r2Bucket: string;
  uploadUrl: string;
  originalFilename: string;
  expectedMimeType?: string;
  expectedSizeBytes?: number;
  createdBy: string;
}): Promise<string> {
  const db = getAdminClient();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const uploadUrlExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from('asset_upload_sessions')
    .insert({
      workspace_id: params.workspaceId,
      series_id: params.seriesId ?? null,
      r2_key: params.r2Key,
      r2_bucket: params.r2Bucket,
      upload_url: params.uploadUrl,
      upload_url_expires_at: uploadUrlExpiresAt,
      original_filename: params.originalFilename,
      expected_mime_type: params.expectedMimeType ?? null,
      expected_size_bytes: params.expectedSizeBytes ?? null,
      created_by: params.createdBy,
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function completeUploadSession(params: {
  sessionId: string;
  resultingAssetId: string;
}): Promise<void> {
  const db = getAdminClient();
  const { error } = await db
    .from('asset_upload_sessions')
    .update({ status: 'completed', resulting_asset_id: params.resultingAssetId })
    .eq('id', params.sessionId);

  if (error) throw error;
}

export async function getUploadSession(sessionId: string) {
  const db = getAdminClient();
  const { data, error } = await db
    .from('asset_upload_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}
