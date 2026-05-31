import { listProductionExports } from '@/lib/services/exportService';

const WS_ID = process.env.DEMO_WORKSPACE_ID ?? null;

async function loadExports() {
  if (!WS_ID) return { exports: [], error: null };
  try {
    return { exports: await listProductionExports({ workspaceId: WS_ID, limit: 30 }), error: null };
  } catch (e) {
    return { exports: [], error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export default async function AdminExportsPage() {
  const { exports, error } = await loadExports();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Production Exports</h1>
      <p className="text-sm text-jollof-subtext mb-6">Export history, status, and production packages.</p>

      {!WS_ID && (
        <div className="border border-yellow-600/30 bg-yellow-600/10 rounded-lg p-4 text-sm text-yellow-300 mb-4">
          Set <code className="font-mono text-yellow-200">DEMO_WORKSPACE_ID</code> to load live exports.
        </div>
      )}
      {error && <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-4 text-sm text-red-300 mb-4">{error}</div>}

      {exports.length > 0 ? (
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b border-jollof-border">
            <th className="py-2 pr-4 text-jollof-label font-medium">Title</th>
            <th className="py-2 pr-4 text-jollof-label font-medium">Type</th>
            <th className="py-2 pr-4 text-jollof-label font-medium">Status</th>
            <th className="py-2 text-jollof-label font-medium">Created</th>
          </tr></thead>
          <tbody>
            {exports.map((e: { id: string; title: string; export_type: string; status: string; created_at: string }) => (
              <tr key={e.id} className="border-b border-jollof-border/50">
                <td className="py-2 pr-4 text-xs text-jollof-text">{e.title}</td>
                <td className="py-2 pr-4 text-xs text-jollof-subtext font-mono">{e.export_type}</td>
                <td className="py-2 pr-4"><span className="px-1.5 py-0.5 rounded text-xs bg-jollof-panel text-jollof-subtext">{e.status}</span></td>
                <td className="py-2 text-xs text-jollof-subtext">{new Date(e.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : WS_ID ? <p className="text-sm text-jollof-subtext">No exports yet.</p> : null}
    </div>
  );
}
