/// <reference path="../pb_data/types.d.ts" />
/**
 * Newsletter allowances: each Pro author's monthly emails are counted from their sent
 * newsletters; emails bought on top live in email_ledger, written only by the web server.
 * mail_accounts holds an author's own Resend account (sealed key and sending domain), which
 * sends their newsletters on their own free allowance instead of the shared one.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    const newsletters = app.findCollectionByNameOrId("newsletters");
    const OWNER = "@request.auth.id != '' && owner = @request.auth.id";

    // how many of a send's emails came from bought ones rather than the monthly allowance
    newsletters.fields.add(new Field({ name: "from_extra", type: "number" }));
    // sent through the author's own Resend account, so it does not count against the shared allowance
    newsletters.fields.add(new Field({ name: "own_account", type: "bool" }));
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

    // server only: the key is sealed, and the studio reads the account through /api/newsletters/account
    const accounts = new Collection({
      type: "base",
      name: "mail_accounts",
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "owner", type: "relation", collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "key_sealed", type: "text", max: 2000, hidden: true },
        { name: "key_hint", type: "text", max: 20 },
        { name: "domain", type: "text", max: 255 },
        { name: "domain_id", type: "text", max: 255 },
        { name: "status", type: "text", max: 40 },
        { name: "records", type: "json", maxSize: 20000 },
        { name: "from_local", type: "text", max: 64 },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_mail_accounts_owner ON mail_accounts (owner)"],
    });
    app.save(accounts);
  },
  (app) => {
    for (const name of ["mail_accounts", "email_ledger"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (_) {}
    }
    const newsletters = app.findCollectionByNameOrId("newsletters");
    newsletters.fields.removeByName("from_extra");
    newsletters.fields.removeByName("own_account");
    app.save(newsletters);
  },
);
