/// <reference path="../pb_data/types.d.ts" />
/**
 * Notes on the page come in kinds: a plain comment (empty), a research note, a fact to check, or a
 * bookmark. They share the comment's anchor, replies and resolve.
 */
migrate(
  (app) => {
    const comments = app.findCollectionByNameOrId("comments");
    comments.fields.add(new Field({ name: "kind", type: "select", maxSelect: 1, values: ["research", "factcheck", "bookmark"] }));
    app.save(comments);
  },
  (app) => {
    const comments = app.findCollectionByNameOrId("comments");
    comments.fields.removeByName("kind");
    app.save(comments);
  },
);
