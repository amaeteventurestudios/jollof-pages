/// <reference path="../pb_data/types.d.ts" />
/**
 * Brands (white label): the same studio under another name on another domain. A brand has its
 * own name, logo, colour and price; its writers' sites live at <name>.<brand domain>. Anyone may
 * read a brand's public face (the proxy and sign-in page need it); only the server writes.
 */
migrate(
  (app) => {
    const brands = new Collection({
      type: "base",
      name: "brands",
      listRule: "active = true",
      viewRule: "active = true",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "name", type: "text", required: true, max: 80 },
        // the brand's own root domain, e.g. writewithada.com; writer sites go on its subdomains
        { name: "domain", type: "text", required: true, max: 253, pattern: "^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$" },
        { name: "tagline", type: "text", max: 160 },
        { name: "logo", type: "file", maxSelect: 1, maxSize: 2097152, mimeTypes: ["image/png", "image/svg+xml", "image/webp", "image/jpeg"] },
        // the brand colour for buttons and links, #rrggbb
        { name: "color", type: "text", max: 7, pattern: "^$|^#[0-9a-fA-F]{6}$" },
        { name: "support_email", type: "email" },
        // one-time studio price in cents; 0 means the Jollof Pages price
        { name: "price_cents", type: "number", min: 0, onlyInt: true },
        { name: "active", type: "bool" },
        { name: "created_by", type: "text", max: 200 },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_brand_domain ON brands (domain)"],
    });
    app.save(brands);

    const users = app.findCollectionByNameOrId("users");
    users.fields.add(new Field({ name: "brand", type: "relation", collectionId: brands.id, maxSelect: 1, cascadeDelete: false }));
    users.updateRule = users.updateRule + " && @request.body.brand:isset = false";
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.fields.removeByName("brand");
    users.updateRule = users.updateRule.replace(" && @request.body.brand:isset = false", "");
    app.save(users);
    app.delete(app.findCollectionByNameOrId("brands"));
  },
);
