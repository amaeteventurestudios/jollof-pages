import { describe, it, expect, vi, beforeEach } from 'vitest';
import { R2Keys } from '@/lib/r2/utils';

// Mock env vars
vi.stubEnv('CLOUDFLARE_R2_ACCOUNT_ID', '');
vi.stubEnv('CLOUDFLARE_R2_ACCESS_KEY_ID', '');
vi.stubEnv('CLOUDFLARE_R2_SECRET_ACCESS_KEY', '');
vi.stubEnv('CLOUDFLARE_R2_BUCKET_ASSETS', '');
vi.stubEnv('CLOUDFLARE_R2_BUCKET_EXPORTS', '');

describe('R2 Key Builder', () => {
  const wsId = 'ws-123';
  const seriesId = 'series-456';
  const assetId = 'asset-789';
  const importId = 'import-abc';
  const exportId = 'export-def';

  it('builds correct asset key', () => {
    const key = R2Keys.asset(wsId, seriesId, assetId, 'cover.webp');
    expect(key).toBe(`workspaces/${wsId}/series/${seriesId}/assets/${assetId}/cover.webp`);
  });

  it('builds correct character asset key', () => {
    const key = R2Keys.characterAsset(wsId, seriesId, 'entry-id', assetId);
    expect(key).toBe(`workspaces/${wsId}/series/${seriesId}/characters/entry-id/${assetId}.webp`);
  });

  it('builds correct import key', () => {
    const key = R2Keys.import(wsId, importId, 'characters.md');
    expect(key).toBe(`workspaces/${wsId}/imports/${importId}/characters.md`);
  });

  it('builds correct export key', () => {
    const key = R2Keys.export(wsId, exportId, 'book-01-package.zip');
    expect(key).toBe(`workspaces/${wsId}/exports/${exportId}/book-01-package.zip`);
  });

  it('builds correct board asset key', () => {
    const key = R2Keys.boardAsset(wsId, seriesId, 'board-id', assetId);
    expect(key).toBe(`workspaces/${wsId}/series/${seriesId}/boards/board-id/${assetId}.webp`);
  });
});

describe('R2 Client env validation', () => {
  it('getR2Client throws when env vars missing', async () => {
    const { getR2Client } = await import('@/lib/r2/client');
    expect(() => getR2Client()).toThrow();
  });

  it('R2_BUCKET_ASSETS throws when not set', async () => {
    const { R2_BUCKET_ASSETS } = await import('@/lib/r2/client');
    expect(() => R2_BUCKET_ASSETS()).toThrow('CLOUDFLARE_R2_BUCKET_ASSETS is not set');
  });
});
