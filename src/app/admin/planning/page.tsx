export default function AdminPlanningPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Planning</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Story Arcs', desc: 'Main, subplot, and thematic arcs across the series.' },
          { label: 'Plot Threads', desc: 'Individual threads that weave through scenes and books.' },
          { label: 'Timeline Events', desc: 'In-world chronological events and flashback anchors.' },
          { label: 'Story Beats', desc: 'Scene-level beats mapped to acts and arcs.' },
          { label: 'Act Structures', desc: 'Three-act or custom act breakdowns per book.' },
          { label: 'Character Arcs', desc: 'Character journey states from start to resolution.' },
          { label: 'Scenes', desc: 'All scenes across books with status tracking.' },
          { label: 'Pages', desc: 'Page layout and panel count progress.' },
          { label: 'Panels', desc: 'Panel-level descriptions, states, and art-readiness.' },
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
