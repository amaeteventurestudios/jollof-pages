export default function AdminOverviewPage() {
  return (
    <div>
      <div className="text-jollof-orange font-bold text-xs uppercase tracking-widest mb-1">Admin</div>
      <h1 className="text-2xl font-black text-jollof-text mb-1">Admin Panel</h1>
      <p className="text-sm text-jollof-subtext mb-6">Platform administration, workspace governance, and system health.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: 'Members & Roles', desc: 'Manage workspace members, roles, and invites.', href: '/admin/members' },
          { title: 'Wiki Imports', desc: 'Review Markdown import queues and approval status.', href: '/admin/wiki' },
          { title: 'Assets & Storage', desc: 'View uploaded assets, R2 storage usage, and quotas.', href: '/admin/assets' },
          { title: 'Jobs', desc: 'Monitor background jobs, retries, and failures.', href: '/admin/jobs' },
          { title: 'Audit Logs', desc: 'Full audit trail for every major platform action.', href: '/admin/audit' },
          { title: 'Exports', desc: 'View production export history and status.', href: '/admin/exports' },
          { title: 'Continuity Flags', desc: 'Review open, overridden, and critical continuity flags.', href: '/admin/flags' },
        ].map((item) => (
          <a key={item.href} href={item.href} className="jollof-card p-4 hover:border-jollof-orange/30 transition-all group">
            <h3 className="text-sm font-semibold text-jollof-text group-hover:text-jollof-orange transition-colors mb-1">{item.title}</h3>
            <p className="text-xs text-jollof-subtext">{item.desc}</p>
          </a>
        ))}
      </div>

      <div className="mt-8 jollof-panel p-4">
        <p className="text-xs text-jollof-label italic">
          Admin panels are data-wired stubs. Connect to Supabase and run migrations to activate full functionality.
          See <code className="text-jollof-orange">DATABASE_ARCHITECTURE.md</code> for setup instructions.
        </p>
      </div>
    </div>
  );
}
