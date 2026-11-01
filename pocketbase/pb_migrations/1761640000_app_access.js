/// <reference path="../pb_data/types.d.ts" />
// App switches for people who have a Jollof Studio account but no Jollof Pages one, so the
// owner can switch them off on Admin > Writers > Access too. People with a Jollof Pages account
// keep their switches on their users record (studio_off, ai_writer). Server only: no API rules.
migrate(
  (app) => {
    const c = new Collection({
      type: "base",
      name: "app_access",
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "email", type: "email", required: true },
        { name: "studio_off", type: "bool" },
        { name: "ai_writer", type: "bool" },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_app_access_email ON app_access (email)"],
    });
    app.save(c);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("app_access"));
  },
);
