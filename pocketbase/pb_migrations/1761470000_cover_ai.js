/// <reference path="../pb_data/types.d.ts" />
/**
 * AI cover art: pay-as-you-go credits and the pictures they paid for.
 *
 * Owners can read their own rows but never write them. Only the web server, signed in as a
 * superuser, adds credits (after Stripe confirms a payment) and spends them (per picture).
 * A user's balance is the sum of `delta` over their credit_ledger rows.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    const books = app.findCollectionByNameOrId("books");
    const ts = [
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ];
    const OWNER = "@request.auth.id != '' && owner = @request.auth.id";

    const generations = new Collection({
      type: "base",
      name: "cover_generations",
      listRule: OWNER,
      viewRule: OWNER,
      createRule: null,
      updateRule: null,
      deleteRule: OWNER,
      fields: [
        { name: "owner", type: "relation", collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "book", type: "relation", collectionId: books.id, maxSelect: 1, cascadeDelete: true },
        { name: "prompt", type: "text", max: 6000 },
        { name: "target", type: "select", maxSelect: 1, values: ["front", "back"] },
        { name: "quality", type: "select", maxSelect: 1, values: ["draft", "print"] },
        { name: "aspect", type: "text", max: 10 },
        { name: "model", type: "text", max: 120 },
        { name: "status", type: "select", maxSelect: 1, values: ["running", "done", "failed"] },
        { name: "credits", type: "number" },
        { name: "mock", type: "bool" },
        { name: "error", type: "text", max: 2000 },
        { name: "width", type: "number" },
        { name: "height", type: "number" },
        {
          name: "image",
          type: "file",
          maxSelect: 1,
          maxSize: 52428800,
          mimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
          thumbs: ["480x0"],
        },
        ...ts,
      ],
      indexes: ["CREATE INDEX idx_cover_generations_book ON cover_generations (owner, book, created)"],
    });
    app.save(generations);

    const ledger = new Collection({
      type: "base",
      name: "credit_ledger",
      listRule: OWNER,
      viewRule: OWNER,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "owner", type: "relation", collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "delta", type: "number", required: false },
        { name: "reason", type: "select", required: true, maxSelect: 1, values: ["topup", "generation", "refund", "grant"] },
        // Stripe Checkout session id: unique, so a payment is credited once however often it is confirmed
        { name: "stripe_session", type: "text", max: 255 },
        { name: "amount_cents", type: "number" },
        { name: "generation", type: "relation", collectionId: generations.id, maxSelect: 1, cascadeDelete: false },
        { name: "note", type: "text", max: 500 },
        ...ts,
      ],
      indexes: [
        "CREATE INDEX idx_credit_ledger_owner ON credit_ledger (owner)",
        "CREATE UNIQUE INDEX idx_credit_ledger_stripe ON credit_ledger (stripe_session) WHERE stripe_session != ''",
      ],
    });
    app.save(ledger);
  },
  (app) => {
    for (const name of ["credit_ledger", "cover_generations"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (_) {}
    }
  },
);
