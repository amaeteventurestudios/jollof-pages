export default function AdminPage() {
  return (
    <div>
      <div className="jollof-card p-6">
        <h2 className="text-base font-semibold text-jollof-text mb-2">Admin Panel</h2>
        <p className="text-sm text-jollof-subtext">
          Connect Supabase and run <code className="text-jollof-orange">supabase db push</code> to activate this panel.
          Data will load from the database once migrations are applied.
        </p>
      </div>
    </div>
  );
}
