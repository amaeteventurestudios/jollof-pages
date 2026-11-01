/// <reference path="../pb_data/types.d.ts" />
/**
 * The owner's admin console:
 * - staff: people the owner lets into the admin, each with a role (src/lib/admin-roles.ts).
 * - admin_audit: one row for every change made in the admin, who made it and to what.
 * - usage_stats: daily counts of what writers do in the studio (exports, translations, AI help),
 *   never what they wrote. Same shape as site_stats.
 * - users.suspended: a suspended account can't sign in (authRule) and its site goes offline.
 * - site_settings.offline: the admin can take a site down for spam or a complaint.
 * Only the server reads and writes the new collections and fields.
 */
const NO_OFFLINE = " && @request.body.offline:isset = false";
const NO_SUSPEND = " && @request.body.suspended:isset = false";

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    app.save(
      new Collection({
        type: "base",
        name: "staff",
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: "email", type: "email", required: true },
          { name: "role", type: "select", required: true, maxSelect: 1, values: ["admin", "support", "finance", "viewer"] },
          { name: "note", type: "text", max: 200 },
          { name: "added_by", type: "text", max: 200 },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: ["CREATE UNIQUE INDEX idx_staff_email ON staff (email)"],
      }),
    );

    app.save(
      new Collection({
        type: "base",
        name: "admin_audit",
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: "actor", type: "text", required: true, max: 200 },
          { name: "role", type: "text", max: 20 },
          { name: "action", type: "text", required: true, max: 60 },
          { name: "target", type: "text", max: 60 },
          { name: "target_label", type: "text", max: 300 },
          { name: "detail", type: "text", max: 1000 },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        ],
        indexes: ["CREATE INDEX idx_audit_created ON admin_audit (created)"],
      }),
    );

    app.save(
      new Collection({
        type: "base",
        name: "usage_stats",
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: "owner", type: "relation", collectionId: users.id, maxSelect: 1, cascadeDelete: true },
          { name: "date", type: "text", required: true, pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          { name: "kind", type: "text", required: true, max: 40 },
          { name: "key", type: "text", max: 300 },
          { name: "count", type: "number" },
        ],
        indexes: ["CREATE UNIQUE INDEX idx_usage_row ON usage_stats (owner, date, kind, `key`)", "CREATE INDEX idx_usage_date ON usage_stats (date)"],
      }),
    );

    users.fields.add(new Field({ name: "suspended", type: "bool" }));
    users.fields.add(new Field({ name: "suspended_reason", type: "text", max: 300 }));
    users.authRule = "suspended != true";
    users.updateRule = users.updateRule + NO_SUSPEND + " && @request.body.suspended_reason:isset = false";
    app.save(users);

    const site = app.findCollectionByNameOrId("site_settings");
    site.fields.add(new Field({ name: "offline", type: "bool" }));
    site.createRule = site.createRule + NO_OFFLINE;
    site.updateRule = site.updateRule + NO_OFFLINE;
    app.save(site);
  },
  (app) => {
    const site = app.findCollectionByNameOrId("site_settings");
    site.fields.removeByName("offline");
    site.createRule = site.createRule.replace(NO_OFFLINE, "");
    site.updateRule = site.updateRule.replace(NO_OFFLINE, "");
    app.save(site);

    const users = app.findCollectionByNameOrId("users");
    users.fields.removeByName("suspended");
    users.fields.removeByName("suspended_reason");
    users.authRule = "";
    users.updateRule = users.updateRule.replace(NO_SUSPEND + " && @request.body.suspended_reason:isset = false", "");
    app.save(users);

    for (const name of ["usage_stats", "admin_audit", "staff"]) app.delete(app.findCollectionByNameOrId(name));
  },
);
