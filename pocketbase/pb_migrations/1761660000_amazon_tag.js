/// <reference path="../pb_data/types.d.ts" />
// A writer's own Amazon Associates store tag (like "ada-20"), put on their Amazon buy buttons.
// Empty means Jollof Pages' own tag (AMAZON_ASSOCIATE_TAG) is used.
migrate(
  (app) => {
    const site = app.findCollectionByNameOrId("site_settings");
    site.fields.add(new Field({ name: "amazon_tag", type: "text", max: 40, pattern: "^$|^[A-Za-z0-9-]{3,40}$" }));
    app.save(site);
  },
  (app) => {
    const site = app.findCollectionByNameOrId("site_settings");
    site.fields.removeByName("amazon_tag");
    app.save(site);
  },
);
