import { getTypedAdminClient as getAdminClient } from '@/lib/supabase/typed';

const WS_ID = process.env.DEMO_WORKSPACE_ID ?? null;

async function loadImports() {
  if (!WS_ID) return { imports: [], error: null };
  try {
    const db = getAdminClient();
    const { data, error } = await db
      .from('wiki_imports')
      .select('*')
      .eq('workspace_id', WS_ID)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) throw error;
    return { imports: data ?? [], error: null };
  } catch (e) {
    return { imports: [], error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export default async function AdminWikiPage() {
  const { imports, error } = await loadImports();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Wiki Imports</h1>
      <p className="text-sm text-jollof-subtext mb-6">Markdown import queue, review status, and applied changes.</p>

      {!WS_ID && (
        <div className="border border-yellow-600/30 bg-yellow-600/10 rounded-lg p-4 text-sm text-yellow-300 mb-4">
          Set <code className="font-mono text-yellow-200">DEMO_WORKSPACE_ID</code> to load live import data.
        </div>
      )}
      {error && <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-4 text-sm text-red-300 mb-4">{error}</div>}

      {imports.length > 0 ? (
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b border-jollof-border">
            <th className="py-2 pr-4 text-jollof-label font-medium">File</th>
            <th className="py-2 pr-4 text-jollof-label font-medium">Status</th>
            <th className="py-2 pr-4 text-jollof-label font-medium">Items</th>
            <th className="py-2 text-jollof-label font-medium">Created</th>
          </tr></thead>
          <tbody>
            {imports.map((i: { id: string; original_filename: string; status: string; items_count: number; created_at: string }) => (
              <tr key={i.id} className="border-b border-jollof-border/50">
                <td className="py-2 pr-4 text-xs text-jollof-text">{i.original_filename}</td>
                <td className="py-2 pr-4"><span className="px-1.5 py-0.5 rounded text-xs bg-jollof-panel text-jollof-subtext">{i.status}</span></td>
                <td className="py-2 pr-4 text-xs text-jollof-subtext">{i.items_count}</td>
                <td className="py-2 text-xs text-jollof-subtext">{new Date(i.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : WS_ID ? <p className="text-sm text-jollof-subtext">No imports yet.</p> : null}
    </div>
  );
}
