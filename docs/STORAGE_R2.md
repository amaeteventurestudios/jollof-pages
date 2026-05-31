# Jollof Pages — Cloudflare R2 Storage

## Architecture Rule

**All uploaded files are stored in Cloudflare R2. Never in Supabase Storage.**

Supabase stores asset metadata (r2_key, r2_bucket, size_bytes, mime_type, checksums). R2 stores the actual files.

## Buckets

| Bucket Env | Purpose |
|---|---|
| `CLOUDFLARE_R2_BUCKET_ASSETS` | All images, documents, references, imports |
| `CLOUDFLARE_R2_BUCKET_EXPORTS` | Production export packages, wiki exports |

## Object Key Conventions

```
workspaces/{workspace_id}/series/{series_id}/assets/{asset_id}/{filename}
workspaces/{workspace_id}/series/{series_id}/characters/{wiki_entry_id}/{asset_id}.webp
workspaces/{workspace_id}/series/{series_id}/locations/{wiki_entry_id}/{asset_id}.webp
workspaces/{workspace_id}/series/{series_id}/panels/{panel_id}/{asset_id}.webp
workspaces/{workspace_id}/series/{series_id}/boards/{board_id}/{asset_id}.webp
workspaces/{workspace_id}/imports/{import_id}/{filename}
workspaces/{workspace_id}/exports/{export_id}/{filename}
```

## Security Rules

- R2 credentials (`CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`) are **server-only**
- Never expose R2 credentials to client components
- Private assets use signed URLs (`getSignedReadUrl()`) with configurable TTL
- Public assets may use `CLOUDFLARE_R2_PUBLIC_BASE_URL` for direct access
- All R2 operations go through `src/lib/r2/utils.ts` server-side functions

## Signed URLs

```typescript
// Read URL (private asset)
const url = await getSignedReadUrl({ key, ttlSeconds: 3600 });

// Upload URL (for direct client upload)
const uploadUrl = await getSignedUploadUrl({ key, contentType: 'image/webp' });
```

## Image Handling

- PNG/JPEG → convert to WebP server-side where feasible
- Store WebP output in R2
- Optionally preserve original at `r2_key_original`
- Capture width, height, size_bytes, checksum in `assets` table

## API Route

Upload endpoint: `POST /api/upload?workspace_id=...`
- Accepts: multipart/form-data with `file` field
- Validates MIME type and file size
- Uploads to R2 via server-side handler
- Creates `assets` record in Supabase
- Returns asset metadata (never R2 credentials)
