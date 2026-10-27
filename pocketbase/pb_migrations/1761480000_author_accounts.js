/// <reference path="../pb_data/types.d.ts" />
/**
 * Author accounts: every studio buyer gets a private studio and a public site at
 * <subdomain>.jollofpages.com. The publisher's own site (jollofpages.com) is the site marked `home`.
 *
 * - users.access: "pending" until the $119 payment clears, then "paid"; "comp" for free accounts
 *   (the owner, and everyone who existed before this migration). Only the server sets it.
 * - Only paid or comp accounts can create anything.
 * - site_settings.subdomain / home / custom_domain are set by the server, never by the browser.
 * - Book and pen-name addresses are unique per account, not across the whole service.
 * - Each reader list belongs to the author whose site the reader joined from.
 */
const PAID = "(@request.auth.access = 'paid' || @request.auth.access = 'comp')";
const GATED = ["authors", "books", "chapters", "assets", "writing_log"];
const SERVER_ONLY_SITE = "@request.body.subdomain:isset = false && @request.body.home:isset = false && @request.body.custom_domain:isset = false";

migrate(
  (app) => {
    const AUTH = "@request.auth.id != ''";
    const OWNER = AUTH + " && owner = @request.auth.id";

    // ---- accounts ----
    const users = app.findCollectionByNameOrId("users");
    users.fields.add(new Field({ name: "access", type: "select", maxSelect: 1, values: ["pending", "paid", "comp"] }));
    users.createRule = null; // the server creates accounts at sign-up
    users.updateRule = "id = @request.auth.id && @request.body.access:isset = false";
    app.save(users);
    for (const u of app.findAllRecords("users")) {
      u.set("access", "comp");
      app.saveNoValidate(u);
    }

    for (const name of GATED) {
      const c = app.findCollectionByNameOrId(name);
      c.createRule = "(" + c.createRule + ") && " + PAID;
      app.save(c);
    }

    // ---- per-account addresses ----
    const books = app.findCollectionByNameOrId("books");
    books.removeIndex("idx_books_slug");
    books.addIndex("idx_books_owner_slug", true, "owner, slug", "");
    app.save(books);

    const authors = app.findCollectionByNameOrId("authors");
    authors.removeIndex("idx_authors_slug");
    authors.addIndex("idx_authors_owner_slug", true, "owner, slug", "");
    app.save(authors);

    // ---- sites ----
    const site = app.findCollectionByNameOrId("site_settings");
    site.fields.add(new Field({ name: "subdomain", type: "text", max: 40, pattern: "^$|^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$" }));
    site.fields.add(new Field({ name: "home", type: "bool" }));
    site.fields.add(new Field({ name: "custom_domain", type: "text", max: 253 }));
    site.addIndex("idx_site_subdomain", true, "subdomain", "subdomain != ''");
    site.addIndex("idx_site_domain", true, "custom_domain", "custom_domain != ''");
    site.addIndex("idx_site_owner", false, "owner", "");
    site.createRule = AUTH + " && @request.body.owner = @request.auth.id && " + PAID + " && " + SERVER_ONLY_SITE;
    site.updateRule = OWNER + " && (@request.body.owner:isset = false || @request.body.owner = owner) && " + SERVER_ONLY_SITE;
    app.save(site);

    // the publisher who ran the single-site install keeps jollofpages.com
    const sites = app.findRecordsByFilter("site_settings", "id != ''", "created", 1, 0);
    let homeOwner = "";
    if (sites.length) {
      sites[0].set("home", true);
      app.save(sites[0]);
      homeOwner = sites[0].getString("owner");
    }

    // ---- reader lists ----
    const subs = app.findCollectionByNameOrId("subscribers");
    subs.fields.add(new Field({ name: "owner", type: "relation", collectionId: users.id, maxSelect: 1, cascadeDelete: true }));
    subs.removeIndex("idx_subscribers_email");
    app.save(subs);
    if (homeOwner) {
      for (const r of app.findAllRecords("subscribers")) {
        r.set("owner", homeOwner);
        app.saveNoValidate(r);
      }
    }
    subs.addIndex("idx_subscribers_owner_email", true, "owner, email", "");
    subs.listRule = OWNER;
    subs.viewRule = OWNER;
    subs.deleteRule = OWNER;
    // anyone may join an author's list; they cannot read it back
    subs.createRule = "@request.body.email:isset = true && @request.body.owner:isset = true && @request.body.owner != ''";
    app.save(subs);
  },
  (app) => {
    const AUTH = "@request.auth.id != ''";
    const subs = app.findCollectionByNameOrId("subscribers");
    subs.removeIndex("idx_subscribers_owner_email");
    subs.fields.removeByName("owner");
    subs.addIndex("idx_subscribers_email", true, "email", "");
    subs.listRule = AUTH;
    subs.viewRule = AUTH;
    subs.deleteRule = AUTH;
    subs.createRule = "@request.body.email:isset = true";
    app.save(subs);

    const site = app.findCollectionByNameOrId("site_settings");
    site.removeIndex("idx_site_subdomain");
    site.removeIndex("idx_site_owner");
    site.removeIndex("idx_site_domain");
    for (const f of ["subdomain", "home", "custom_domain"]) site.fields.removeByName(f);
    site.createRule = AUTH + " && @request.body.owner = @request.auth.id";
    site.updateRule = AUTH + " && owner = @request.auth.id && (@request.body.owner:isset = false || @request.body.owner = owner)";
    app.save(site);

    const authors = app.findCollectionByNameOrId("authors");
    authors.removeIndex("idx_authors_owner_slug");
    authors.addIndex("idx_authors_slug", true, "slug", "");
    app.save(authors);

    const books = app.findCollectionByNameOrId("books");
    books.removeIndex("idx_books_owner_slug");
    books.addIndex("idx_books_slug", true, "slug", "");
    app.save(books);

    for (const name of GATED) {
      const c = app.findCollectionByNameOrId(name);
      const suffix = ") && " + PAID;
      if (c.createRule && c.createRule.endsWith(suffix)) c.createRule = c.createRule.slice(1, -suffix.length);
      app.save(c);
    }

    const users = app.findCollectionByNameOrId("users");
    users.fields.removeByName("access");
    users.updateRule = "id = @request.auth.id";
    app.save(users);
  },
);
