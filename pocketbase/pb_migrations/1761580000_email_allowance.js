/// <reference path="../pb_data/types.d.ts" />
/**
 * Newsletter allowances: each Pro author's monthly emails are counted from their sent
 * newsletters; emails bought on top live in email_ledger, written only by the web server.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    const newsletters = app.findCollectionByNameOrId("newsletters");
    const OWNER = "@request.auth.id != '' && owner = @request.auth.id";

    // how many of a send's emails came from bought ones rather than the monthly allowance
    newsletters.fields.add(new Field({ name: "from_extra", type: "number" }));
    app.save(newsletters);

    const ledger = new Collection({
      type: "base",
      name: "email_ledger",
      listRule: OWNER,
      viewRule: OWNER,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "owner", type: "relation", collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "delta", type: "number" },
        { name: "reason", type: "select", required: true, maxSelect: 1, values: ["topup", "send", "refund", "grant"] },
        { name: "stripe_session", type: "text", max: 255 },
        { name: "amount_cents", type: "number" },
        { name: "newsletter", type: "relation", collectionId: newsletters.id, maxSelect: 1, cascadeDelete: false },
        { name: "note", type: "text", max: 500 },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE INDEX idx_email_ledger_owner ON email_ledger (owner)",
        "CREATE UNIQUE INDEX idx_email_ledger_stripe ON email_ledger (stripe_session) WHERE stripe_session != ''",
      ],
    });
    app.save(ledger);
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("email_ledger"));
    } catch (_) {}
    const newsletters = app.findCollectionByNameOrId("newsletters");
    newsletters.fields.removeByName("from_extra");
    app.save(newsletters);
  },
);
