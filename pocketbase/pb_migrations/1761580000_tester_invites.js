/// <reference path="../pb_data/types.d.ts" />
/**
 * Tester invite links. The owner makes a link in the admin and sends it to people who want to try
 * the studio; whoever signs up through it gets full access without paying, and their account
 * remembers which link brought them in. Only the server reads and writes the links.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    const invites = new Collection({
      type: "base",
      name: "tester_invites",
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        // the secret part of the link: jollofpages.com/join/<code>
        { name: "code", type: "text", required: true, min: 8, max: 64, pattern: "^[a-zA-Z0-9_-]+$" },
        // the owner's own name for the link, e.g. "Writers' WhatsApp group"
        { name: "label", type: "text", max: 120 },
        // 0 means no limit
        { name: "max_uses", type: "number", min: 0, onlyInt: true },
        { name: "uses", type: "number", min: 0, onlyInt: true },
        { name: "expires", type: "date" },
        { name: "revoked", type: "bool" },
        // AI cover credits each tester starts with
        { name: "credits", type: "number", min: 0, max: 10000, onlyInt: true },
        { name: "created_by", type: "text", max: 200 },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_tester_invite_code ON tester_invites (code)"],
    });
    app.save(invites);

    users.fields.add(new Field({ name: "tester_invite", type: "relation", collectionId: invites.id, maxSelect: 1, cascadeDelete: false }));
    users.updateRule =
      "id = @request.auth.id && @request.body.access:isset = false && @request.body.paid_cents:isset = false && @request.body.paid_at:isset = false && @request.body.tester_invite:isset = false";
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.fields.removeByName("tester_invite");
    users.updateRule = "id = @request.auth.id && @request.body.access:isset = false && @request.body.paid_cents:isset = false && @request.body.paid_at:isset = false";
    app.save(users);
    app.delete(app.findCollectionByNameOrId("tester_invites"));
  },
);
