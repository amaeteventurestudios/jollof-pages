export default function AdminOverviewPage() {
  const hasDemoWs = !!process.env.DEMO_WORKSPACE_ID;

  return (
    <div>
      <div className="text-jollof-orange font-bold text-xs uppercase tracking-widest mb-1">Admin</div>
      <h1 className="text-2xl font-black text-jollof-text mb-1">Admin Panel</h1>
      <p className="text-sm text-jollof-subtext mb-6">Platform administration, workspace governance, and system health.</p>

      {!hasDemoWs && (
        <div className="border border-yellow-600/30 bg-yellow-600/10 rounded-lg p-4 text-sm text-yellow-300 mb-6">
          Set <code className="font-mono text-yellow-200">DEMO_WORKSPACE_ID</code> in your environment to load live workspace data in each panel.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: 'Members & Roles', desc: 'Workspace members, roles, and invite management.', href: '/admin/members' },
          { title: 'Wiki Imports', desc: 'Markdown import queue, review status, and applied changes.', href: '/admin/wiki' },
          { title: 'Assets & Storage', desc: 'Uploaded assets, R2 storage usage, and quota tracking.', href: '/admin/assets' },
          { title: 'Jobs', desc: 'Background job queue, retries, and failure states.', href: '/admin/jobs' },
          { title: 'Audit Logs', desc: 'Full audit trail for every major platform action.', href: '/admin/audit' },
          { title: 'Exports', desc: 'Production export history, manifests, and file lists.', href: '/admin/exports' },
          { title: 'Continuity Flags', desc: 'Open, critical, and overridden continuity flags.', href: '/admin/flags' },
          { title: 'Planning', desc: 'Story arcs, plot threads, acts, beats, scenes, and panels.', href: '/admin/planning' },
          { title: 'Boards', desc: 'Visual reference boards, items, links, and comments.', href: '/admin/boards' },
          { title: 'Search Index', desc: 'Postgres full-text search index stats and reindex controls.', href: '/admin/search' },
          { title: 'Revisions', desc: 'Field-level change events, stale objects, and dependency graph.', href: '/admin/revisions' },
        ].map((item) => (
          <a key={item.href} href={item.href} className="jollof-card p-4 hover:border-jollof-orange/30 transition-all group">
            <h3 className="text-sm font-semibold text-jollof-text group-hover:text-jollof-orange transition-colors mb-1">{item.title}</h3>
            <p className="text-xs text-jollof-subtext">{item.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
