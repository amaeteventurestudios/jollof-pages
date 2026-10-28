/// <reference path="../pb_data/types.d.ts" />
/** Box sets: the books a collection was assembled from. */
migrate(
  (app) => {
    const books = app.findCollectionByNameOrId("books");
    books.fields.add(new Field({ name: "box_set", type: "json", maxSize: 20000 }));
    app.save(books);
  },
  (app) => {
    const books = app.findCollectionByNameOrId("books");
    books.fields.removeByName("box_set");
    app.save(books);
  },
);
