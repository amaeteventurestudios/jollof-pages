import { getIndexStats } from '@/lib/services/searchService';

const WS_ID = process.env.DEMO_WORKSPACE_ID ?? null;

async function loadStats() {
  if (!WS_ID) return { stats: {}, error: null };
  try {
    return { stats: await getIndexStats(WS_ID), error: null };
  } catch (e) {
    return { stats: {}, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export default async function AdminSearchPage() {
  const { stats, error } = await loadStats();
  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Search Index</h1>
      <p className="text-sm text-jollof-subtext mb-6">
        Postgres full-text search index — wiki entries, scenes, assets, exports.
      </p>

      {!WS_ID && (
        <div className="border border-yellow-600/30 bg-yellow-600/10 rounded-lg p-4 text-sm text-yellow-300 mb-4">
          Set <code className="font-mono text-yellow-200">DEMO_WORKSPACE_ID</code> to load live index stats.
        </div>
      )}
      {error && <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-4 text-sm text-red-300 mb-4">{error}</div>}

      {total > 0 && (
        <>
          <div className="flex gap-4 mb-6 flex-wrap">
            <div className="jollof-card px-4 py-3 text-center">
              <div className="text-2xl font-bold text-jollof-text">{total}</div>
              <div className="text-xs text-jollof-subtext">Total indexed</div>
            </div>
            {Object.entries(stats).map(([type, count]) => (
              <div key={type} className="jollof-card px-4 py-3 text-center">
                <div className="text-lg font-bold text-jollof-text">{count}</div>
                <div className="text-xs text-jollof-subtext">{type}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {[
          { label: 'Reindex Wiki Entries', desc: 'Rebuild tsvector for all active wiki entries via reindexWorkspaceWikiEntries().' },
          { label: 'Reindex Scenes', desc: 'Rebuild tsvector for all scenes via reindexWorkspaceScenes().' },
          { label: 'Full Reindex', desc: 'Trigger search_reindex job for full workspace rebuild.' },
          { label: 'Remove Stale Entries', desc: 'Remove search_index rows for deleted or archived objects.' },
        ].map((item) => (
          <div key={item.label} className="jollof-card p-4">
            <h2 className="font-semibold text-sm mb-1 text-jollof-text">{item.label}</h2>
            <p className="text-xs text-jollof-subtext">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
