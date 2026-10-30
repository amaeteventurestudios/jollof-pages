/// <reference path="../pb_data/types.d.ts" />
/**
 * The Insert menu's favourites and recently used blocks live on the account (editor_prefs), and
 * reusable blocks an author saves go in saved_blocks, so both follow them to every book and device.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.fields.add(new Field({ name: "editor_prefs", type: "json", maxSize: 200000 }));
    app.save(users);

    const own = "owner = @request.auth.id";
    const saved = new Collection({
      type: "base",
      name: "saved_blocks",
      listRule: own,
      viewRule: own,
      createRule: `@request.auth.id != "" && @request.body.owner = @request.auth.id`,
      updateRule: `${own} && (@request.body.owner:isset = false || @request.body.owner = @request.auth.id)`,
      deleteRule: own,
      fields: [
        { name: "owner", type: "relation", collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "name", type: "text", required: true, max: 80 },
        // the block as the editor's JSON
        { name: "content", type: "json", required: true, maxSize: 500000 },
        // what it is, for its icon: a box variant or a node type
        { name: "kind", type: "text", max: 40 },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE INDEX idx_saved_blocks_owner ON saved_blocks (owner)"],
    });
    app.save(saved);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("saved_blocks"));
    const users = app.findCollectionByNameOrId("users");
    users.fields.removeByName("editor_prefs");
    app.save(users);
  },
);
