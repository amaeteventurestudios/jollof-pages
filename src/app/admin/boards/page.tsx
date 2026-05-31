export default function AdminBoardsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Visual Reference Boards</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: 'Boards', desc: 'Moodboards, character boards, location boards, and panel boards.' },
          { label: 'Board Items', desc: 'Notes, images, wiki references, scene cards, and color swatches on boards.' },
          { label: 'Board Links', desc: 'Connections between board items for visual relationship mapping.' },
          { label: 'Board Comments', desc: 'Threaded feedback on board items and board-level notes.' },
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
