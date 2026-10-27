/// <reference path="../pb_data/types.d.ts" />
/**
 * Author Site Pro and the tools that come with it: billing, domains bought for authors,
 * newsletters, direct ebook sales and site analytics.
 *
 * Money, domains, orders and stats are written only by the web server (as a superuser);
 * authors can read their own rows. Newsletter drafts are the author's to write until sent.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    const books = app.findCollectionByNameOrId("books");
    const AUTH = "@request.auth.id != ''";
    const OWNER = AUTH + " && owner = @request.auth.id";
    const PAID = "(@request.auth.access = 'paid' || @request.auth.access = 'comp')";
    const ts = [
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ];
    const owner = { name: "owner", type: "relation", collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true };

    // ---- Pro subscription and payouts, one row per account ----
    const billing = new Collection({
      type: "base",
      name: "billing",
      listRule: OWNER,
      viewRule: OWNER,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        owner,
        { name: "stripe_customer", type: "text", max: 255 },
        { name: "stripe_subscription", type: "text", max: 255 },
        { name: "interval", type: "select", maxSelect: 1, values: ["month", "year"] },
        { name: "status", type: "text", max: 40 },
        // the first-year .com that comes with yearly Pro, once per account
        { name: "free_domain_used", type: "bool" },
        // Stripe Connect account that ebook sales are paid into
        { name: "payout_account", type: "text", max: 255 },
        { name: "payouts_ready", type: "bool" },
        ...ts,
      ],
      indexes: ["CREATE UNIQUE INDEX idx_billing_owner ON billing (owner)"],
    });
    app.save(billing);

    // ---- domains registered for authors ----
    const domains = new Collection({
      type: "base",
      name: "domains",
      listRule: OWNER,
      viewRule: OWNER,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        owner,
        { name: "domain", type: "text", required: true, max: 253 },
        { name: "status", type: "select", maxSelect: 1, values: ["waiting_payment", "registering", "active", "failed", "lapsed"] },
        { name: "price_cents", type: "number" },
        { name: "registrant", type: "json", maxSize: 4000 },
        { name: "registrar", type: "text", max: 40 },
        { name: "order_id", type: "text", max: 120 },
        { name: "expires", type: "date" },
        { name: "autorenew", type: "bool" },
        { name: "error", type: "text", max: 2000 },
        ...ts,
      ],
      indexes: ["CREATE UNIQUE INDEX idx_domains_domain ON domains (domain)"],
    });
    app.save(domains);

    // ---- newsletters ----
    const newsletters = new Collection({
      type: "base",
      name: "newsletters",
      listRule: OWNER,
      viewRule: OWNER,
      createRule: AUTH + " && @request.body.owner = @request.auth.id && " + PAID + " && (@request.body.status:isset = false || @request.body.status = 'draft')",
      updateRule: OWNER + " && status = 'draft' && (@request.body.status:isset = false || @request.body.status = 'draft') && (@request.body.owner:isset = false || @request.body.owner = owner)",
      deleteRule: OWNER + " && status = 'draft'",
      fields: [
        owner,
        { name: "subject", type: "text", max: 200 },
        { name: "body", type: "text", max: 100000 },
        { name: "status", type: "select", maxSelect: 1, values: ["draft", "sending", "sent", "failed"] },
        { name: "sent_at", type: "date" },
        { name: "recipients", type: "number" },
        { name: "sent_count", type: "number" },
        { name: "error", type: "text", max: 2000 },
        ...ts,
      ],
    });
    app.save(newsletters);

    // readers can leave a list from any newsletter
    const subs = app.findCollectionByNameOrId("subscribers");
    subs.fields.add(new Field({ name: "token", type: "text", max: 64 }));
    subs.fields.add(new Field({ name: "unsubscribed", type: "bool" }));
    app.save(subs);
    for (const r of app.findAllRecords("subscribers")) {
      r.set("token", $security.randomString(40));
      app.saveNoValidate(r);
    }
    subs.addIndex("idx_subscribers_token", true, "token", "token != ''");
    // the public may add an address but not choose its token or leave someone else's list
    subs.createRule = "@request.body.email:isset = true && @request.body.owner:isset = true && @request.body.owner != '' && @request.body.unsubscribed:isset = false";
    app.save(subs);

    // ---- selling ebooks direct ----
    books.fields.add(new Field({ name: "sell_direct", type: "bool" }));
    books.fields.add(new Field({ name: "ebook_price_cents", type: "number", min: 0 }));
    // protected: only the owner (and the server, after a sale) can download it
    books.fields.add(
      new Field({ name: "ebook_file", type: "file", maxSelect: 1, maxSize: 104857600, protected: true, mimeTypes: ["application/epub+zip", "application/pdf", "application/zip", "application/octet-stream"] }),
    );
    app.save(books);

    const orders = new Collection({
      type: "base",
      name: "orders",
      listRule: OWNER,
      viewRule: OWNER,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        owner,
        { name: "book", type: "relation", collectionId: books.id, maxSelect: 1, cascadeDelete: false },
        { name: "email", type: "email" },
        { name: "amount_cents", type: "number" },
        { name: "fee_cents", type: "number" },
        { name: "currency", type: "text", max: 8 },
        { name: "stripe_session", type: "text", max: 255 },
        { name: "token", type: "text", max: 64 },
        { name: "downloads", type: "number" },
        ...ts,
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_orders_session ON orders (stripe_session)",
        "CREATE UNIQUE INDEX idx_orders_token ON orders (token)",
        "CREATE INDEX idx_orders_owner ON orders (owner, created)",
      ],
    });
    app.save(orders);

    // ---- analytics: daily counts, no cookies, no personal data ----
    const stats = new Collection({
      type: "base",
      name: "site_stats",
      listRule: OWNER,
      viewRule: OWNER,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        owner,
        { name: "date", type: "text", required: true, pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        // view, visitor, signup, buy_click, sale
        { name: "kind", type: "text", required: true, max: 20 },
        // the page path, referring site or store, depending on kind
        { name: "key", type: "text", max: 300 },
        { name: "count", type: "number" },
        ...ts,
      ],
      indexes: ["CREATE UNIQUE INDEX idx_stats_row ON site_stats (owner, date, kind, `key`)"],
    });
    app.save(stats);
  },
  (app) => {
    for (const name of ["site_stats", "orders", "newsletters", "domains", "billing"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (_) {}
    }
    const books = app.findCollectionByNameOrId("books");
    for (const f of ["sell_direct", "ebook_price_cents", "ebook_file"]) books.fields.removeByName(f);
    app.save(books);
    const subs = app.findCollectionByNameOrId("subscribers");
    subs.removeIndex("idx_subscribers_token");
    subs.fields.removeByName("token");
    subs.fields.removeByName("unsubscribed");
    subs.createRule = "@request.body.email:isset = true && @request.body.owner:isset = true && @request.body.owner != ''";
    app.save(subs);
  },
);
