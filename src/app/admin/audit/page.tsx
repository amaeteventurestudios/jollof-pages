import { getAuditLogs } from '@/lib/services/auditService';

const WS_ID = process.env.DEMO_WORKSPACE_ID ?? null;

async function loadLogs() {
  if (!WS_ID) return { logs: [], error: null };
  try {
    return { logs: await getAuditLogs({ workspaceId: WS_ID, limit: 50 }), error: null };
  } catch (e) {
    return { logs: [], error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export default async function AdminAuditPage() {
  const { logs, error } = await loadLogs();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Audit Logs</h1>
      <p className="text-sm text-jollof-subtext mb-6">Full audit trail for every major platform action.</p>

      {!WS_ID && (
        <div className="border border-yellow-600/30 bg-yellow-600/10 rounded-lg p-4 text-sm text-yellow-300 mb-4">
          Set <code className="font-mono text-yellow-200">DEMO_WORKSPACE_ID</code> to load live audit data.
        </div>
      )}
      {error && <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-4 text-sm text-red-300 mb-4">{error}</div>}

      {logs.length > 0 ? (
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b border-jollof-border">
            <th className="py-2 pr-4 text-jollof-label font-medium">Action</th>
            <th className="py-2 pr-4 text-jollof-label font-medium">Target</th>
            <th className="py-2 pr-4 text-jollof-label font-medium">Source</th>
            <th className="py-2 text-jollof-label font-medium">When</th>
          </tr></thead>
          <tbody>
            {logs.map((l: { id: string; action: string; target_type: string; target_id: string | null; source: string; created_at: string }) => (
              <tr key={l.id} className="border-b border-jollof-border/50">
                <td className="py-2 pr-4 font-mono text-xs text-jollof-orange">{l.action}</td>
                <td className="py-2 pr-4 text-xs text-jollof-subtext">{l.target_type}{l.target_id ? ` · ${l.target_id.slice(0, 8)}` : ''}</td>
                <td className="py-2 pr-4"><span className="px-1.5 py-0.5 rounded text-xs bg-jollof-panel text-jollof-subtext">{l.source}</span></td>
                <td className="py-2 text-jollof-subtext text-xs">{new Date(l.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : WS_ID ? <p className="text-sm text-jollof-subtext">No audit logs yet.</p> : null}
    </div>
  );
}
