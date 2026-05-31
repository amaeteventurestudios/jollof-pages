// ⚠️ SERVER-ONLY — R2 credentials never leave the server
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTypedAdminClient as getAdminClient } from '@/lib/supabase/typed';
import { uploadAssetToR2, R2Keys } from '@/lib/r2/utils';
import { validateAssetUpload } from '@/lib/services/assetService';
import { getMemberRole } from '@/lib/services/workspaceService';
import { createAuditLog } from '@/lib/services/auditService';
import { AssetUploadSchema } from '@/lib/schemas';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = req.nextUrl.searchParams.get('workspace_id');
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 });
    }

    // Check permissions
    const role = await getMemberRole(workspaceId, user.id);
    if (!role) {
      return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate input
    const parsed = AssetUploadSchema.safeParse({
      filename: file.name,
      mimeType: file.type,
      seriesId: formData.get('series_id'),
      role: formData.get('role') ?? 'reference',
      isPublic: formData.get('is_public') === 'true',
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid upload params', details: parsed.error.issues }, { status: 400 });
    }

    const { filename, mimeType, seriesId, role: assetRole, isPublic } = parsed.data;

    // Validate file
    const buffer = Buffer.from(await file.arrayBuffer());
    validateAssetUpload({ mimeType, sizeBytes: buffer.length });

    const assetId = crypto.randomUUID();
    const r2Key = R2Keys.asset(workspaceId, seriesId ?? 'global', assetId, filename);

    const uploaded = await uploadAssetToR2({
      key: r2Key,
      body: buffer,
      contentType: mimeType,
      isPublic,
    });

    const db = getAdminClient();
    const { data: asset, error: assetErr } = await db
      .from('assets')
      .insert({
        id: assetId,
        workspace_id: workspaceId,
        series_id: seriesId ?? null,
        original_filename: filename,
        mime_type: mimeType,
        size_bytes: buffer.length,
        r2_bucket: uploaded.r2_bucket,
        r2_key: uploaded.r2_key,
        public_url: uploaded.public_url,
        asset_type: mimeType.startsWith('image/') ? 'image' : 'document',
        role: assetRole,
        processed: true,
        created_by: user.id,
      })
      .select('id, r2_key, public_url, size_bytes, mime_type, original_filename')
      .single();

    if (assetErr) throw assetErr;

    await createAuditLog({
      workspaceId,
      actorUserId: user.id,
      actorRole: role,
      targetType: 'asset',
      targetId: assetId,
      action: 'asset_uploaded',
      afterSnapshot: { filename, size_bytes: buffer.length },
      source: 'human',
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (err) {
    console.error('[API /upload]', err);
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
