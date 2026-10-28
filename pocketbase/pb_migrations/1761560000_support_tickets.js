/// <reference path="../pb_data/types.d.ts" />
/**
 * Help requests become numbered tickets with screenshots. Files are protected: they are served
 * through the studio's API to the writer who sent them and the support team only.
 */
migrate(
  (app) => {
    const c = app.findCollectionByNameOrId("support_requests");
    c.fields.add(new Field({ name: "number", type: "number", min: 0, onlyInt: true }));
    c.fields.add(
      new Field({
        name: "attachments",
        type: "file",
        maxSelect: 20,
        maxSize: 10485760,
        protected: true,
        mimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"],
      }),
    );
    app.save(c);
    // number the tickets already there, oldest first
    const rows = app.findRecordsByFilter("support_requests", "id != ''", "created", 0, 0);
    rows.forEach((r, i) => {
      r.set("number", 1001 + i);
      app.saveNoValidate(r);
    });
  },
  (app) => {
    const c = app.findCollectionByNameOrId("support_requests");
    c.fields.removeByName("number");
    c.fields.removeByName("attachments");
    app.save(c);
  },
);
