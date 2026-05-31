import { listAssets } from '@/lib/services/assetService';
import { getStorageQuota } from '@/lib/services/workspaceService';

const WS_ID = process.env.DEMO_WORKSPACE_ID ?? null;

async function loadAssets() {
  if (!WS_ID) return { assets: [], quota: null, error: null };
  try {
    const [assets, quota] = await Promise.all([
      listAssets({ workspaceId: WS_ID, limit: 30 }),
      getStorageQuota(WS_ID),
    ]);
    return { assets, quota, error: null };
  } catch (e) {
    return { assets: [], quota: null, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

function fmt(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function AdminAssetsPage() {
  const { assets, quota, error } = await loadAssets();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Assets &amp; Storage</h1>
      <p className="text-sm text-jollof-subtext mb-6">Uploaded assets, R2 storage, and quota tracking.</p>

      {!WS_ID && (
        <div className="border border-yellow-600/30 bg-yellow-600/10 rounded-lg p-4 text-sm text-yellow-300 mb-4">
          Set <code className="font-mono text-yellow-200">DEMO_WORKSPACE_ID</code> to load live asset data.
        </div>
      )}
      {error && <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-4 text-sm text-red-300 mb-4">{error}</div>}

      {quota && (
        <div className="flex gap-4 mb-6">
          <div className="jollof-card px-4 py-3">
            <div className="text-lg font-bold text-jollof-text">{fmt(quota.used_storage_bytes)}</div>
            <div className="text-xs text-jollof-subtext">of {fmt(quota.max_storage_bytes)} used</div>
          </div>
          <div className="jollof-card px-4 py-3">
            <div className="text-lg font-bold text-jollof-text">{quota.asset_count}</div>
            <div className="text-xs text-jollof-subtext">assets (max {quota.max_assets})</div>
          </div>
        </div>
      )}

      {assets.length > 0 ? (
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b border-jollof-border">
            <th className="py-2 pr-4 text-jollof-label font-medium">Filename</th>
            <th className="py-2 pr-4 text-jollof-label font-medium">Type</th>
            <th className="py-2 pr-4 text-jollof-label font-medium">Size</th>
            <th className="py-2 text-jollof-label font-medium">Uploaded</th>
          </tr></thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id} className="border-b border-jollof-border/50">
                <td className="py-2 pr-4 text-xs text-jollof-text truncate max-w-xs">{a.original_filename}</td>
                <td className="py-2 pr-4 text-xs text-jollof-subtext">{a.mime_type}</td>
                <td className="py-2 pr-4 text-xs text-jollof-subtext">{fmt(a.size_bytes)}</td>
                <td className="py-2 text-xs text-jollof-subtext">{new Date(a.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : WS_ID ? <p className="text-sm text-jollof-subtext">No assets uploaded yet.</p> : null}
    </div>
  );
}
