// ⚠️ SERVER-ONLY — All R2 operations run server-side
import {
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client, R2_BUCKET_ASSETS, R2_PUBLIC_BASE_URL, R2_SIGNED_URL_TTL } from './client';

// ---- R2 Key Builders ----

export const R2Keys = {
  asset: (workspaceId: string, seriesId: string, assetId: string, filename: string) =>
    `workspaces/${workspaceId}/series/${seriesId}/assets/${assetId}/${filename}`,

  characterAsset: (workspaceId: string, seriesId: string, wikiEntryId: string, assetId: string) =>
    `workspaces/${workspaceId}/series/${seriesId}/characters/${wikiEntryId}/${assetId}.webp`,

  locationAsset: (workspaceId: string, seriesId: string, wikiEntryId: string, assetId: string) =>
    `workspaces/${workspaceId}/series/${seriesId}/locations/${wikiEntryId}/${assetId}.webp`,

  panelAsset: (workspaceId: string, seriesId: string, panelId: string, assetId: string) =>
    `workspaces/${workspaceId}/series/${seriesId}/panels/${panelId}/${assetId}.webp`,

  boardAsset: (workspaceId: string, seriesId: string, boardId: string, assetId: string) =>
    `workspaces/${workspaceId}/series/${seriesId}/boards/${boardId}/${assetId}.webp`,

  import: (workspaceId: string, importId: string, filename: string) =>
    `workspaces/${workspaceId}/imports/${importId}/${filename}`,

  export: (workspaceId: string, exportId: string, filename: string) =>
    `workspaces/${workspaceId}/exports/${exportId}/${filename}`,
};

// ---- Core R2 Operations ----

export interface UploadResult {
  r2_key: string;
  r2_bucket: string;
  public_url: string | null;
  size_bytes: number;
}

export async function uploadAssetToR2(params: {
  key: string;
  bucket?: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
  metadata?: Record<string, string>;
  isPublic?: boolean;
}): Promise<UploadResult> {
  const client = getR2Client();
  const bucket = params.bucket ?? R2_BUCKET_ASSETS();
  const body = typeof params.body === 'string' ? Buffer.from(params.body) : params.body;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: body,
      ContentType: params.contentType,
      Metadata: params.metadata,
    })
  );

  const baseUrl = R2_PUBLIC_BASE_URL();
  const publicUrl = params.isPublic && baseUrl ? `${baseUrl}/${params.key}` : null;

  return {
    r2_key: params.key,
    r2_bucket: bucket,
    public_url: publicUrl,
    size_bytes: body.byteLength ?? (body as Buffer).length,
  };
}

export async function deleteAssetFromR2(params: {
  key: string;
  bucket?: string;
}): Promise<void> {
  const client = getR2Client();
  const bucket = params.bucket ?? R2_BUCKET_ASSETS();
  await client.send(
    new DeleteObjectCommand({ Bucket: bucket, Key: params.key })
  );
}

export async function getSignedReadUrl(params: {
  key: string;
  bucket?: string;
  ttlSeconds?: number;
}): Promise<string> {
  const client = getR2Client();
  const bucket = params.bucket ?? R2_BUCKET_ASSETS();
  const ttl = params.ttlSeconds ?? R2_SIGNED_URL_TTL();

  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: params.key }),
    { expiresIn: ttl }
  );
}

export async function getSignedUploadUrl(params: {
  key: string;
  bucket?: string;
  contentType: string;
  ttlSeconds?: number;
  maxBytes?: number;
}): Promise<string> {
  const client = getR2Client();
  const bucket = params.bucket ?? R2_BUCKET_ASSETS();
  const ttl = params.ttlSeconds ?? R2_SIGNED_URL_TTL();

  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      ContentType: params.contentType,
    }),
    { expiresIn: ttl }
  );
}

export async function copyR2Object(params: {
  sourceBucket: string;
  sourceKey: string;
  destBucket: string;
  destKey: string;
}): Promise<void> {
  const client = getR2Client();
  await client.send(
    new CopyObjectCommand({
      Bucket: params.destBucket,
      CopySource: `${params.sourceBucket}/${params.sourceKey}`,
      Key: params.destKey,
    })
  );
}

export async function archiveR2Object(params: {
  key: string;
  bucket?: string;
}): Promise<void> {
  const bucket = params.bucket ?? R2_BUCKET_ASSETS();
  const archiveKey = `archived/${params.key}`;
  await copyR2Object({
    sourceBucket: bucket,
    sourceKey: params.key,
    destBucket: bucket,
    destKey: archiveKey,
  });
  await deleteAssetFromR2({ key: params.key, bucket });
}

export async function r2ObjectExists(params: {
  key: string;
  bucket?: string;
}): Promise<boolean> {
  const client = getR2Client();
  const bucket = params.bucket ?? R2_BUCKET_ASSETS();
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: params.key }));
    return true;
  } catch {
    return false;
  }
}

export async function calculateR2StorageUsage(params: {
  prefix: string;
  bucket?: string;
}): Promise<number> {
  const client = getR2Client();
  const bucket = params.bucket ?? R2_BUCKET_ASSETS();
  let totalBytes = 0;
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: params.prefix,
        ContinuationToken: continuationToken,
      })
    );
    for (const obj of response.Contents ?? []) {
      totalBytes += obj.Size ?? 0;
    }
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return totalBytes;
}

export function getPublicUrl(key: string): string {
  const base = R2_PUBLIC_BASE_URL();
  if (!base) throw new Error('CLOUDFLARE_R2_PUBLIC_BASE_URL is not configured');
  return `${base}/${key}`;
}
