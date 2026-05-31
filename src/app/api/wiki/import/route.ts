import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMemberRole } from '@/lib/services/workspaceService';
import { createImport, parseImportItems } from '@/lib/services/markdownImportService';
import { uploadAssetToR2, R2Keys } from '@/lib/r2/utils';
import { R2_BUCKET_ASSETS } from '@/lib/r2/client';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = req.nextUrl.searchParams.get('workspace_id');
    const seriesId = req.nextUrl.searchParams.get('series_id');
    if (!workspaceId || !seriesId) {
      return NextResponse.json({ error: 'workspace_id and series_id are required' }, { status: 400 });
    }

    const role = await getMemberRole(workspaceId, user.id);
    if (!role) return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    if (!file.name.endsWith('.md') && !file.name.endsWith('.txt') && !file.name.endsWith('.json')) {
      return NextResponse.json({ error: 'Supported formats: .md, .txt, .json' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const importId = crypto.randomUUID();
    const r2Key = R2Keys.import(workspaceId, importId, file.name);

    // Store original file in R2
    await uploadAssetToR2({
      key: r2Key,
      bucket: R2_BUCKET_ASSETS(),
      body: buffer,
      contentType: file.type || 'text/markdown',
    });

    // Create import record
    const importRecord = await createImport({
      workspaceId,
      seriesId,
      originalFilename: file.name,
      r2Bucket: R2_BUCKET_ASSETS(),
      r2Key,
      fileSizeBytes: buffer.length,
      createdBy: user.id,
      createdByRole: role,
    });

    // Parse immediately if it's markdown/text
    let items: Awaited<ReturnType<typeof parseImportItems>> = [];
    if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
      const content = buffer.toString('utf-8');
      items = await parseImportItems({
        importId: importRecord.id,
        workspaceId,
        seriesId,
        markdownContent: content,
      });
    }

    return NextResponse.json({
      import: importRecord,
      items_parsed: items.length,
      requires_approval: true,
      message: 'Import created and parsed. Human approval required before applying changes.',
    }, { status: 201 });
  } catch (err) {
    console.error('[API /wiki/import]', err);
    const message = err instanceof Error ? err.message : 'Import failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
