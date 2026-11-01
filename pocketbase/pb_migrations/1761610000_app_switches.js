/// <reference path="../pb_data/types.d.ts" />
// Per-writer switches the admin flips on the Writers > Access page:
// - studio_off: Jollof Studio (the design tool) is closed to them. Off by default, so everyone has it.
// - ai_writer: the AI co-writing app is open to them. Off by default until it launches.
// Only the server sets them; writers can't change their own.
const GUARD = " && @request.body.studio_off:isset = false && @request.body.ai_writer:isset = false";

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.fields.add(new Field({ name: "studio_off", type: "bool" }));
    users.fields.add(new Field({ name: "ai_writer", type: "bool" }));
    users.updateRule = users.updateRule + GUARD;
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.fields.removeByName("studio_off");
    users.fields.removeByName("ai_writer");
    users.updateRule = users.updateRule.replace(GUARD, "");
    app.save(users);
  },
);
