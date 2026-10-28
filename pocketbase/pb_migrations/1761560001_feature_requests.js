/// <reference path="../pb_data/types.d.ts" />
/**
 * Feature requests: writers suggest what to build next and vote. Only the server reads and
 * writes, so voters stay private and only the support team sets a status.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    const ideas = new Collection({
      type: "base",
      name: "feature_requests",
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "owner", type: "relation", collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: false },
        { name: "title", type: "text", required: true, max: 140 },
        { name: "details", type: "text", max: 4000 },
        { name: "status", type: "select", maxSelect: 1, values: ["new", "planned", "in_progress", "shipped", "declined"] },
        // user ids, so each person votes once
        { name: "voters", type: "json", maxSize: 2000000 },
        { name: "votes", type: "number", min: 0, onlyInt: true },
        // the team's note to everyone, e.g. what shipped or why not
        { name: "response", type: "text", max: 2000 },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE INDEX idx_feature_votes ON feature_requests (votes)"],
    });
    app.save(ideas);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("feature_requests"));
  },
);
