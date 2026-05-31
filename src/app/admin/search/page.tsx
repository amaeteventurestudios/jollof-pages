export default function AdminSearchPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Search Index</h1>
      <p className="text-gray-600 mb-6">
        Postgres full-text search index covering wiki entries, scenes, pages, panels, assets, and exports.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: 'Reindex Wiki Entries', desc: 'Rebuild tsvector index for all active wiki entries in a workspace.' },
          { label: 'Reindex Scenes', desc: 'Rebuild tsvector index for all scenes.' },
          { label: 'Index Stats', desc: 'Show record counts per object_type in the search_index table.' },
          { label: 'Full Workspace Reindex', desc: 'Trigger a dependency_rebuild + search_reindex job for the workspace.' },
        ].map((item) => (
          <div key={item.label} className="border rounded-lg p-4">
            <h2 className="font-semibold mb-1">{item.label}</h2>
            <p className="text-sm text-gray-500">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
