/// <reference path="../pb_data/types.d.ts" />
// Authors can delete books (they go to Trash for 30 days first) and turn their website off.
// books.trashed: when the book went to Trash; pb_hooks/trash_purge.pb.js deletes it for good 30 days later.
// site_settings.paused: the author turned their own site off (unlike `offline`, which only an admin sets).
migrate(
  (app) => {
    const books = app.findCollectionByNameOrId("books");
    books.fields.add(new Field({ name: "trashed", type: "date" }));
    app.save(books);

    const site = app.findCollectionByNameOrId("site_settings");
    site.fields.add(new Field({ name: "paused", type: "bool" }));
    app.save(site);
  },
  (app) => {
    const books = app.findCollectionByNameOrId("books");
    books.fields.removeByName("trashed");
    app.save(books);
    const site = app.findCollectionByNameOrId("site_settings");
    site.fields.removeByName("paused");
    app.save(site);
  },
);
