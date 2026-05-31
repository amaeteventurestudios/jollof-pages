// ⚠️ SERVER-ONLY — R2 credentials must never reach the client
import { S3Client } from '@aws-sdk/client-s3';

let _r2Client: S3Client | null = null;

function assertR2Env() {
  const required = [
    'CLOUDFLARE_R2_ACCOUNT_ID',
    'CLOUDFLARE_R2_ACCESS_KEY_ID',
    'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing R2 environment variables: ${missing.join(', ')}`);
  }
}

export function getR2Client(): S3Client {
  if (typeof window !== 'undefined') {
    throw new Error('R2 client cannot be used on the client side');
  }
  if (!_r2Client) {
    assertR2Env();
    _r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _r2Client;
}

export const R2_BUCKET_ASSETS = () => {
  const b = process.env.CLOUDFLARE_R2_BUCKET_ASSETS;
  if (!b) throw new Error('CLOUDFLARE_R2_BUCKET_ASSETS is not set');
  return b;
};

export const R2_BUCKET_EXPORTS = () => {
  const b = process.env.CLOUDFLARE_R2_BUCKET_EXPORTS;
  if (!b) throw new Error('CLOUDFLARE_R2_BUCKET_EXPORTS is not set');
  return b;
};

export const R2_PUBLIC_BASE_URL = () =>
  process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL ?? '';

export const R2_SIGNED_URL_TTL = () =>
  parseInt(process.env.CLOUDFLARE_R2_SIGNED_URL_TTL_SECONDS ?? '3600', 10);
