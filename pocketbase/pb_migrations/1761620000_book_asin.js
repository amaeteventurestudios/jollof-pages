/// <reference path="../pb_data/types.d.ts" />
// The book's Amazon ASIN (Kindle ebooks have one starting with B0; print editions use the ISBN-10).
migrate(
  (app) => {
    const books = app.findCollectionByNameOrId("books");
    books.fields.add(new Field({ name: "asin", type: "text", max: 10, pattern: "^$|^[A-Z0-9]{10}$" }));
    app.save(books);
  },
  (app) => {
    const books = app.findCollectionByNameOrId("books");
    books.fields.removeByName("asin");
    app.save(books);
  },
);
