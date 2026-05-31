import { getTypedAdminClient as getAdminClient } from '@/lib/supabase/typed';

const WS_ID = process.env.DEMO_WORKSPACE_ID ?? null;

async function loadFlags() {
  if (!WS_ID) return { flags: [], error: null };
  try {
    const db = getAdminClient();
    const { data, error } = await db
      .from('continuity_flags')
      .select('*')
      .eq('workspace_id', WS_ID)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return { flags: data ?? [], error: null };
  } catch (e) {
    return { flags: [], error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export default async function AdminFlagsPage() {
  const { flags, error } = await loadFlags();
  const open = flags.filter((f: { status: string }) => f.status === 'open');
  const critical = open.filter((f: { severity: string }) => f.severity === 'critical');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Continuity Flags</h1>
      <p className="text-sm text-jollof-subtext mb-6">Open, acknowledged, overridden, and critical continuity flags.</p>

      {!WS_ID && (
        <div className="border border-yellow-600/30 bg-yellow-600/10 rounded-lg p-4 text-sm text-yellow-300 mb-4">
          Set <code className="font-mono text-yellow-200">DEMO_WORKSPACE_ID</code> to load live flags.
        </div>
      )}
      {error && <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-4 text-sm text-red-300 mb-4">{error}</div>}

      {WS_ID && (
        <div className="flex gap-4 mb-6">
          <div className="jollof-card px-4 py-3 text-center">
            <div className="text-2xl font-bold text-red-400">{critical.length}</div>
            <div className="text-xs text-jollof-subtext">Critical Open</div>
          </div>
          <div className="jollof-card px-4 py-3 text-center">
            <div className="text-2xl font-bold text-jollof-text">{open.length}</div>
            <div className="text-xs text-jollof-subtext">Total Open</div>
          </div>
          <div className="jollof-card px-4 py-3 text-center">
            <div className="text-2xl font-bold text-jollof-text">{flags.length}</div>
            <div className="text-xs text-jollof-subtext">All Flags</div>
          </div>
        </div>
      )}

      {flags.length > 0 ? (
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b border-jollof-border">
            <th className="py-2 pr-4 text-jollof-label font-medium">Severity</th>
            <th className="py-2 pr-4 text-jollof-label font-medium">Status</th>
            <th className="py-2 pr-4 text-jollof-label font-medium">Description</th>
            <th className="py-2 text-jollof-label font-medium">Created</th>
          </tr></thead>
          <tbody>
            {flags.map((f: { id: string; severity: string; status: string; description: string; created_at: string }) => (
              <tr key={f.id} className="border-b border-jollof-border/50">
                <td className="py-2 pr-4">
                  <span className={`px-1.5 py-0.5 rounded text-xs ${f.severity === 'critical' ? 'bg-red-900/40 text-red-400' : f.severity === 'warning' ? 'bg-yellow-900/40 text-yellow-400' : 'bg-jollof-panel text-jollof-subtext'}`}>{f.severity}</span>
                </td>
                <td className="py-2 pr-4"><span className="px-1.5 py-0.5 rounded text-xs bg-jollof-panel text-jollof-subtext">{f.status}</span></td>
                <td className="py-2 pr-4 text-xs text-jollof-subtext truncate max-w-sm">{f.description}</td>
                <td className="py-2 text-xs text-jollof-subtext">{new Date(f.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : WS_ID ? <p className="text-sm text-jollof-subtext">No continuity flags.</p> : null}
    </div>
  );
}
