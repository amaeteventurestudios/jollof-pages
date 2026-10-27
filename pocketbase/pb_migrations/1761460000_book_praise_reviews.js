/// <reference path="../pb_data/types.d.ts" />
/** Praise (quotes from people) and reviews (excerpts from publications) for each book's page. */
migrate(
  (app) => {
    const books = app.findCollectionByNameOrId("books");
    books.fields.add(new Field({ name: "praise", type: "json", maxSize: 20000 }));
    books.fields.add(new Field({ name: "reviews", type: "json", maxSize: 20000 }));
    app.save(books);
  },
  (app) => {
    const books = app.findCollectionByNameOrId("books");
    books.fields.removeByName("praise");
    books.fields.removeByName("reviews");
    app.save(books);
  },
);
