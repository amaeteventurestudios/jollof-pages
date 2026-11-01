/// <reference path="../pb_data/types.d.ts" />
/**
 * Per-chapter layout options (chapter image, hidden heading, page number or running head, small
 * title, inverted title), and grid thumbnails for the image library.
 */
migrate(
  (app) => {
    const chapters = app.findCollectionByNameOrId("chapters");
    chapters.fields.add(new Field({ name: "options", type: "json", maxSize: 20000 }));
    app.save(chapters);

    const assets = app.findCollectionByNameOrId("assets");
    assets.fields.getByName("file").thumbs = ["400x0"];
    app.save(assets);
  },
  (app) => {
    const chapters = app.findCollectionByNameOrId("chapters");
    chapters.fields.removeByName("options");
    app.save(chapters);

    const assets = app.findCollectionByNameOrId("assets");
    assets.fields.getByName("file").thumbs = [];
    app.save(assets);
  },
);
