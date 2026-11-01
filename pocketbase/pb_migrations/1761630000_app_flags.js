/// <reference path="../pb_data/types.d.ts" />
// Site-wide on/off switches the owner flips in Admin > Switches, such as the free .com that
// comes with yearly Author Site Pro (off until the Name.com account has credit).
// Anyone may read them (the public pages say "coming soon" from them); only the server writes.
migrate(
  (app) => {
    const flags = new Collection({
      type: "base",
      name: "app_flags",
      listRule: "",
      viewRule: "",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "key", type: "text", required: true, max: 60 },
        { name: "on", type: "bool" },
        { name: "updated_by", type: "text", max: 254 },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_app_flags_key ON app_flags (`key`)"],
    });
    app.save(flags);
    const free = new Record(flags);
    free.set("key", "free_domains");
    free.set("on", false);
    app.save(free);
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("app_flags"));
    } catch (_) {}
  },
);
