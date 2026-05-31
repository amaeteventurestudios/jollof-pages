import { getTypedAdminClient as getAdminClient } from '@/lib/supabase/typed';
import { getStaleObjects } from '@/lib/services/dependencyService';

const WS_ID = process.env.DEMO_WORKSPACE_ID ?? null;

async function loadRevisions() {
  if (!WS_ID) return { events: [], stale: [], error: null };
  try {
    const db = getAdminClient();
    const { data: events, error } = await db
      .from('revision_events')
      .select('*')
      .eq('workspace_id', WS_ID)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    const stale = await getStaleObjects(WS_ID);
    return { events: events ?? [], stale, error: null };
  } catch (e) {
    return { events: [], stale: [], error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export default async function AdminRevisionsPage() {
  const { events, stale, error } = await loadRevisions();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Revision Events</h1>
      <p className="text-sm text-jollof-subtext mb-6">
        Field-level change events, stale object tracking, and dependency graph state.
      </p>

      {!WS_ID && (
        <div className="border border-yellow-600/30 bg-yellow-600/10 rounded-lg p-4 text-sm text-yellow-300 mb-4">
          Set <code className="font-mono text-yellow-200">DEMO_WORKSPACE_ID</code> to load live revision data.
        </div>
      )}
      {error && <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-4 text-sm text-red-300 mb-4">{error}</div>}

      {stale.length > 0 && (
        <div className="border border-yellow-600/30 bg-yellow-600/10 rounded-lg p-4 mb-6">
          <div className="text-sm font-semibold text-yellow-300 mb-2">{stale.length} stale object{stale.length > 1 ? 's' : ''} need review</div>
          <div className="text-xs text-yellow-200/70">Objects whose upstream dependencies changed and have not been re-validated.</div>
        </div>
      )}

      {events.length > 0 ? (
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b border-jollof-border">
            <th className="py-2 pr-4 text-jollof-label font-medium">Object</th>
            <th className="py-2 pr-4 text-jollof-label font-medium">Field</th>
            <th className="py-2 pr-4 text-jollof-label font-medium">Before → After</th>
            <th className="py-2 text-jollof-label font-medium">When</th>
          </tr></thead>
          <tbody>
            {events.map((e: { id: string; object_type: string; object_id: string; changed_field: string | null; before_value: unknown; after_value: unknown; created_at: string }) => (
              <tr key={e.id} className="border-b border-jollof-border/50">
                <td className="py-2 pr-4 text-xs font-mono text-jollof-orange">{e.object_type}</td>
                <td className="py-2 pr-4 text-xs text-jollof-subtext">{e.changed_field ?? '—'}</td>
                <td className="py-2 pr-4 text-xs text-jollof-subtext">
                  {e.before_value != null ? String(e.before_value) : '—'} → {e.after_value != null ? String(e.after_value) : '—'}
                </td>
                <td className="py-2 text-xs text-jollof-subtext">{new Date(e.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : WS_ID ? <p className="text-sm text-jollof-subtext">No revision events yet.</p> : null}
    </div>
  );
}
