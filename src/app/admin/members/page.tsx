import { listWorkspaceMembers } from '@/lib/services/workspaceService';

const WS_ID = process.env.DEMO_WORKSPACE_ID ?? null;

async function loadMembers() {
  if (!WS_ID) return { members: [], error: null };
  try {
    return { members: await listWorkspaceMembers(WS_ID), error: null };
  } catch (e) {
    return { members: [], error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export default async function AdminMembersPage() {
  const { members, error } = await loadMembers();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Members &amp; Roles</h1>
      <p className="text-sm text-jollof-subtext mb-6">Workspace membership, roles, and invite management.</p>

      {!WS_ID && (
        <div className="border border-yellow-600/30 bg-yellow-600/10 rounded-lg p-4 text-sm text-yellow-300 mb-4">
          Set <code className="font-mono text-yellow-200">DEMO_WORKSPACE_ID</code> to load live data.
        </div>
      )}
      {error && <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-4 text-sm text-red-300 mb-4">{error}</div>}

      {members.length > 0 ? (
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b border-jollof-border">
            <th className="py-2 pr-4 text-jollof-label font-medium">User ID</th>
            <th className="py-2 pr-4 text-jollof-label font-medium">Role</th>
            <th className="py-2 text-jollof-label font-medium">Joined</th>
          </tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-jollof-border/50">
                <td className="py-2 pr-4 font-mono text-xs text-jollof-subtext">{m.user_id}</td>
                <td className="py-2 pr-4"><span className="px-2 py-0.5 rounded text-xs bg-jollof-panel text-jollof-text">{m.role}</span></td>
                <td className="py-2 text-jollof-subtext text-xs">{new Date(m.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : WS_ID ? <p className="text-sm text-jollof-subtext">No members found.</p> : null}
    </div>
  );
}
