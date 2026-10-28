/// <reference path="../pb_data/types.d.ts" />
/**
 * Help requests from writers to the publisher. Writers read their own; only the server writes,
 * so the support inbox and its emails stay in one place.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    const support = new Collection({
      type: "base",
      name: "support_requests",
      listRule: "owner = @request.auth.id",
      viewRule: "owner = @request.auth.id",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "owner", type: "relation", collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "email", type: "email" },
        { name: "topic", type: "select", maxSelect: 1, values: ["question", "publishing", "formatting", "covers", "website", "billing", "bug", "idea"] },
        { name: "subject", type: "text", max: 200 },
        { name: "message", type: "text", max: 10000 },
        { name: "status", type: "select", maxSelect: 1, values: ["open", "answered", "closed"] },
        // [{ from: "writer" | "support", text, at }]
        { name: "replies", type: "json", maxSize: 200000 },
        { name: "page", type: "text", max: 500 },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE INDEX idx_support_owner ON support_requests (owner)"],
    });
    app.save(support);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("support_requests"));
  },
);
