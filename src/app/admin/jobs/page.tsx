import { listJobs, getJobStats } from '@/lib/services/jobService';

const WS_ID = process.env.DEMO_WORKSPACE_ID ?? null;

async function loadJobs() {
  if (!WS_ID) return { jobs: [], stats: {}, error: null };
  try {
    const [jobs, stats] = await Promise.all([
      listJobs({ workspaceId: WS_ID, limit: 30 }),
      getJobStats(WS_ID),
    ]);
    return { jobs, stats, error: null };
  } catch (e) {
    return { jobs: [], stats: {}, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export default async function AdminJobsPage() {
  const { jobs, stats, error } = await loadJobs();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Background Jobs</h1>
      <p className="text-sm text-jollof-subtext mb-6">Job queue status, retries, and failures.</p>

      {!WS_ID && (
        <div className="border border-yellow-600/30 bg-yellow-600/10 rounded-lg p-4 text-sm text-yellow-300 mb-4">
          Set <code className="font-mono text-yellow-200">DEMO_WORKSPACE_ID</code> to load live job data.
        </div>
      )}
      {error && <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-4 text-sm text-red-300 mb-4">{error}</div>}

      {Object.keys(stats).length > 0 && (
        <div className="flex gap-3 mb-6 flex-wrap">
          {Object.entries(stats).map(([status, count]) => (
            <div key={status} className="jollof-card px-3 py-2 text-center">
              <div className="text-lg font-bold text-jollof-text">{count as number}</div>
              <div className="text-xs text-jollof-subtext">{status}</div>
            </div>
          ))}
        </div>
      )}

      {jobs.length > 0 ? (
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b border-jollof-border">
            <th className="py-2 pr-4 text-jollof-label font-medium">Type</th>
            <th className="py-2 pr-4 text-jollof-label font-medium">Status</th>
            <th className="py-2 pr-4 text-jollof-label font-medium">Retries</th>
            <th className="py-2 text-jollof-label font-medium">Created</th>
          </tr></thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-b border-jollof-border/50">
                <td className="py-2 pr-4 font-mono text-xs text-jollof-orange">{j.job_type}</td>
                <td className="py-2 pr-4"><span className="px-1.5 py-0.5 rounded text-xs bg-jollof-panel text-jollof-subtext">{j.status}</span></td>
                <td className="py-2 pr-4 text-jollof-subtext text-xs">{j.retry_count}/{j.max_retries}</td>
                <td className="py-2 text-jollof-subtext text-xs">{new Date(j.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : WS_ID ? <p className="text-sm text-jollof-subtext">No jobs found.</p> : null}
    </div>
  );
}
