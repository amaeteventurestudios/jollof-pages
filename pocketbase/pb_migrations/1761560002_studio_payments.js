/// <reference path="../pb_data/types.d.ts" />
/**
 * What each writer paid for the studio and when, so the owner's admin can add up sales.
 * Only the server sets these, like `access`.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.fields.add(new Field({ name: "paid_cents", type: "number", min: 0 }));
    users.fields.add(new Field({ name: "paid_at", type: "date" }));
    users.updateRule = "id = @request.auth.id && @request.body.access:isset = false && @request.body.paid_cents:isset = false && @request.body.paid_at:isset = false";
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.fields.removeByName("paid_cents");
    users.fields.removeByName("paid_at");
    users.updateRule = "id = @request.auth.id && @request.body.access:isset = false";
    app.save(users);
  },
);
