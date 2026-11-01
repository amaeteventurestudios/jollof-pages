/// <reference path="../pb_data/types.d.ts" />
/** Case laminate hardcover edition: its own ISBN, interior page count and cover wrap. */
migrate(
  (app) => {
    const books = app.findCollectionByNameOrId("books");
    books.fields.add(new Field({ name: "isbn_hardcover", type: "text", max: 20 }));
    books.fields.add(new Field({ name: "hardcover_page_count", type: "number", min: 0, onlyInt: true }));
    books.fields.add(new Field({ name: "cover_hardcover", type: "file", maxSelect: 1, maxSize: 52428800, mimeTypes: ["image/jpeg", "image/png", "application/pdf"] }));
    app.save(books);
  },
  (app) => {
    const books = app.findCollectionByNameOrId("books");
    books.fields.removeByName("isbn_hardcover");
    books.fields.removeByName("hardcover_page_count");
    books.fields.removeByName("cover_hardcover");
    app.save(books);
  },
);
