export default function AdminRevisionsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Revision Events</h1>
      <p className="text-gray-600 mb-6">
        Every approved object change produces a revision event. Stale objects downstream are tracked here.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: 'Revision Events', desc: 'All field-level change events with before/after snapshots.' },
          { label: 'Stale Objects', desc: 'Objects marked stale after upstream dependency changes.' },
          { label: 'Dependency Graph', desc: 'Nodes and edges tracking object interdependencies.' },
          { label: 'Character States', desc: 'Per-scene/panel visual and emotional state snapshots.' },
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
