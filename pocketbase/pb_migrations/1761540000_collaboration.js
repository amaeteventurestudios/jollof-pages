/// <reference path="../pb_data/types.d.ts" />
/**
 * Collaboration: an author invites people to a book as
 *  - co-writers, who write and edit alongside them live,
 *  - editors, whose edits arrive as tracked changes for the author to accept or reject,
 *  - commenters, who read and leave comments.
 * Invited people get a free "collaborator" account if they have none; it opens only shared books.
 * Live editing goes through the collab server, which keeps its working copy in collab_docs.
 */
// "members" holds everyone in the three role lists. PocketBase 0.40 does not match an OR of "?="
// across several multi-relations, nor a bare "field ?=" in create rules, so rules test this one list.
const MEMBER = (p) => `${p}members.id ?= @request.auth.id`;
const or = (rule, extra) => (rule ? `(${rule}) || (${extra})` : extra);

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.fields.getByName("access").values = ["pending", "paid", "comp", "collaborator"];
    app.save(users);

    const books = app.findCollectionByNameOrId("books");
    for (const name of ["cowriters", "editors", "commenters", "members"]) {
      books.fields.add(new Field({ name, type: "relation", collectionId: users.id, maxSelect: 50, cascadeDelete: false }));
    }
    books.listRule = or(books.listRule, MEMBER(""));
    books.viewRule = or(books.viewRule, MEMBER(""));
    app.save(books);

    const chapters = app.findCollectionByNameOrId("chapters");
    // which working copy of the live document is current (see collab/server.ts)
    chapters.fields.add(new Field({ name: "collab_gen", type: "text", max: 40 }));
    chapters.listRule = or(chapters.listRule, MEMBER("book."));
    chapters.viewRule = or(chapters.viewRule, MEMBER("book."));
    // co-writers add, rename and remove sections; a new section belongs to the book's owner
    chapters.createRule = or(chapters.createRule, "book.cowriters.id ?= @request.auth.id && owner = book.owner");
    chapters.updateRule = or(
      chapters.updateRule,
      "book.cowriters.id ?= @request.auth.id && @request.body.owner:isset = false && @request.body.book:isset = false && @request.body.collab_gen:isset = false",
    );
    chapters.deleteRule = or(chapters.deleteRule, "book.cowriters.id ?= @request.auth.id");
    app.save(chapters);

    const assets = app.findCollectionByNameOrId("assets");
    assets.createRule = or(assets.createRule, "@request.auth.id != '' && owner = @request.auth.id && book.cowriters.id ?= @request.auth.id");
    app.save(assets);

    const invites = new Collection({
      type: "base",
      name: "collab_invites",
      // the author sees their invitations; the invited person sees theirs once accepted
      listRule: "owner = @request.auth.id || user = @request.auth.id",
      viewRule: "owner = @request.auth.id || user = @request.auth.id",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "book", type: "relation", collectionId: books.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "owner", type: "relation", collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "email", type: "email", required: true },
        { name: "name", type: "text", max: 120 },
        { name: "role", type: "select", required: true, maxSelect: 1, values: ["cowriter", "editor", "commenter"] },
        { name: "status", type: "select", required: true, maxSelect: 1, values: ["pending", "accepted", "revoked"] },
        { name: "token", type: "text", max: 64, hidden: true },
        { name: "user", type: "relation", collectionId: users.id, maxSelect: 1, cascadeDelete: false },
        { name: "message", type: "text", max: 1000 },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE INDEX idx_invites_book ON collab_invites (book)", "CREATE UNIQUE INDEX idx_invites_token ON collab_invites (token)"],
    });
    app.save(invites);

    const CAN_SEE = `book.owner = @request.auth.id || ${MEMBER("book.")}`;
    const comments = new Collection({
      type: "base",
      name: "comments",
      listRule: CAN_SEE,
      viewRule: CAN_SEE,
      createRule: `@request.auth.id != '' && author = @request.auth.id && (${CAN_SEE})`,
      // anyone on the book can reply or resolve; only the author of a comment may rewrite it
      updateRule: `(${CAN_SEE}) && @request.body.book:isset = false && @request.body.author:isset = false && (author = @request.auth.id || @request.body.body:isset = false)`,
      deleteRule: "author = @request.auth.id || book.owner = @request.auth.id",
      fields: [
        { name: "book", type: "relation", collectionId: books.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "chapter", type: "relation", collectionId: chapters.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "author", type: "relation", collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: false },
        { name: "author_name", type: "text", max: 120 },
        // where it points: the exact words, with a little text either side to find them again after edits
        { name: "quote", type: "text", max: 2000 },
        { name: "prefix", type: "text", max: 64 },
        { name: "suffix", type: "text", max: 64 },
        { name: "body", type: "text", required: true, max: 5000 },
        // [{ author, author_name, body, at }]
        { name: "replies", type: "json", maxSize: 100000 },
        { name: "resolved", type: "bool" },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE INDEX idx_comments_chapter ON comments (chapter)", "CREATE INDEX idx_comments_book ON comments (book)"],
    });
    app.save(comments);

    const docs = new Collection({
      type: "base",
      name: "collab_docs",
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "chapter", type: "relation", collectionId: chapters.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "gen", type: "text", max: 40 },
        // hash of the chapter content this state was last saved with
        { name: "hash", type: "text", max: 80 },
        // Yjs document state, base64
        { name: "state", type: "json", maxSize: 50000000 },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_collab_docs_chapter ON collab_docs (chapter)"],
    });
    app.save(docs);
  },
  (app) => {
    for (const name of ["collab_docs", "comments", "collab_invites"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (_) {}
    }
    const strip = (rule) => (rule && rule.startsWith("(") && rule.includes(") || (") ? rule.slice(1, rule.lastIndexOf(") || (")) : rule);
    const assets = app.findCollectionByNameOrId("assets");
    assets.createRule = strip(assets.createRule);
    app.save(assets);
    const chapters = app.findCollectionByNameOrId("chapters");
    for (const k of ["listRule", "viewRule", "createRule", "updateRule", "deleteRule"]) chapters[k] = strip(chapters[k]);
    chapters.fields.removeByName("collab_gen");
    app.save(chapters);
    const books = app.findCollectionByNameOrId("books");
    books.listRule = strip(books.listRule);
    books.viewRule = strip(books.viewRule);
    for (const name of ["cowriters", "editors", "commenters", "members"]) books.fields.removeByName(name);
    app.save(books);
    const users = app.findCollectionByNameOrId("users");
    users.fields.getByName("access").values = ["pending", "paid", "comp"];
    app.save(users);
  },
);
