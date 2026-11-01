/// <reference path="../pb_data/types.d.ts" />
/**
 * Jollof Pages schema.
 *
 * Every private record carries `owner`. The public publisher site reads only what is published:
 * books with published = true, their authors, sample chapters, and the site settings record.
 * Sign-up is closed: the owner account is created with scripts/seed.mjs.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.createRule = null; // no public sign-up
    users.listRule = "id = @request.auth.id";
    users.viewRule = "id = @request.auth.id";
    app.save(users);

    const ts = [
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ];
    const AUTH = "@request.auth.id != ''";
    const OWNER = AUTH + " && owner = @request.auth.id";
    const CREATE_OWNED = AUTH + " && @request.body.owner = @request.auth.id";
    const KEEP_OWNER = OWNER + " && (@request.body.owner:isset = false || @request.body.owner = owner)";

    const authors = new Collection({
      type: "base",
      name: "authors",
      listRule: "",
      viewRule: "",
      createRule: CREATE_OWNED,
      updateRule: KEEP_OWNER,
      deleteRule: OWNER,
      fields: [
        { name: "owner", type: "relation", collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "name", type: "text", required: true, max: 120 },
        { name: "slug", type: "text", required: true, max: 120, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
        { name: "bio", type: "text", max: 5000 },
        { name: "photo", type: "file", maxSelect: 1, maxSize: 5242880, mimeTypes: ["image/jpeg", "image/png", "image/webp"], thumbs: ["400x400"] },
        { name: "website", type: "url" },
        ...ts,
      ],
      indexes: ["CREATE UNIQUE INDEX idx_authors_slug ON authors (slug)"],
    });
    app.save(authors);

    const books = new Collection({
      type: "base",
      name: "books",
      listRule: "published = true || (" + OWNER + ")",
      viewRule: "published = true || (" + OWNER + ")",
      createRule: CREATE_OWNED,
      updateRule: KEEP_OWNER,
      deleteRule: OWNER,
      fields: [
        { name: "owner", type: "relation", collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "title", type: "text", required: true, max: 200 },
        { name: "subtitle", type: "text", max: 300 },
        { name: "slug", type: "text", required: true, max: 160, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
        { name: "author", type: "relation", collectionId: authors.id, maxSelect: 1 },
        { name: "series", type: "text", max: 160 },
        { name: "series_number", type: "number" },
        { name: "description", type: "text", max: 8000 },
        { name: "pitch", type: "text", max: 300 },
        { name: "keywords", type: "json", maxSize: 4000 },
        { name: "categories", type: "json", maxSize: 4000 },
        { name: "language", type: "text", max: 12 },
        { name: "isbn_ebook", type: "text", max: 20 },
        { name: "isbn_paperback", type: "text", max: 20 },
        { name: "imprint", type: "text", max: 120 },
        { name: "publication_date", type: "date" },
        { name: "status", type: "select", maxSelect: 1, values: ["idea", "drafting", "revising", "editing", "ready", "published"] },
        { name: "published", type: "bool" },
        { name: "featured", type: "bool" },
        { name: "cover", type: "file", maxSelect: 1, maxSize: 15728640, mimeTypes: ["image/jpeg", "image/png", "image/webp"], thumbs: ["480x0", "960x0"] },
        { name: "cover_full", type: "file", maxSelect: 1, maxSize: 52428800, mimeTypes: ["image/jpeg", "image/png", "application/pdf"] },
        { name: "cover_design", type: "json", maxSize: 200000 },
        { name: "format", type: "json", maxSize: 4000 },
        { name: "goal", type: "json", maxSize: 2000 },
        { name: "buy_links", type: "json", maxSize: 4000 },
        { name: "accent", type: "text", max: 9 },
        { name: "word_count", type: "number" },
        { name: "page_count", type: "number" },
        ...ts,
      ],
      indexes: ["CREATE UNIQUE INDEX idx_books_slug ON books (slug)", "CREATE INDEX idx_books_owner ON books (owner)"],
    });
    app.save(books);

    const chapters = new Collection({
      type: "base",
      name: "chapters",
      // the public site may read sample chapters of published books, nothing else
      listRule: "(" + OWNER + ") || (is_sample = true && book.published = true)",
      viewRule: "(" + OWNER + ") || (is_sample = true && book.published = true)",
      createRule: CREATE_OWNED + " && @request.body.book.owner = @request.auth.id",
      updateRule: KEEP_OWNER + " && (@request.body.book:isset = false || @request.body.book = book)",
      deleteRule: OWNER,
      fields: [
        { name: "owner", type: "relation", collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "book", type: "relation", collectionId: books.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "title", type: "text", max: 300 },
        { name: "subtitle", type: "text", max: 300 },
        { name: "kind", type: "text", required: true, max: 40 },
        { name: "section", type: "select", required: true, maxSelect: 1, values: ["front", "body", "back"] },
        { name: "order", type: "number" },
        { name: "content", type: "json", maxSize: 5000000 },
        { name: "word_count", type: "number" },
        { name: "status", type: "select", maxSelect: 1, values: ["draft", "revised", "final"] },
        { name: "is_sample", type: "bool" },
        { name: "in_toc", type: "bool" },
        { name: "numbered", type: "bool" },
        ...ts,
      ],
      indexes: ["CREATE INDEX idx_chapters_book ON chapters (book, section, `order`)"],
    });
    app.save(chapters);

    const assets = new Collection({
      type: "base",
      name: "assets",
      // images placed in manuscripts; public only once the book is published
      listRule: OWNER,
      viewRule: "(" + OWNER + ") || book.published = true",
      createRule: CREATE_OWNED,
      updateRule: KEEP_OWNER,
      deleteRule: OWNER,
      fields: [
        { name: "owner", type: "relation", collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "book", type: "relation", collectionId: books.id, maxSelect: 1, cascadeDelete: true },
        { name: "file", type: "file", required: true, maxSelect: 1, maxSize: 20971520, mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
        { name: "alt", type: "text", max: 300 },
        ...ts,
      ],
    });
    app.save(assets);

    const log = new Collection({
      type: "base",
      name: "writing_log",
      listRule: OWNER,
      viewRule: OWNER,
      createRule: CREATE_OWNED + " && @request.body.book.owner = @request.auth.id",
      updateRule: KEEP_OWNER,
      deleteRule: OWNER,
      fields: [
        { name: "owner", type: "relation", collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "book", type: "relation", collectionId: books.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "date", type: "text", required: true, pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        { name: "words", type: "number" },
        { name: "minutes", type: "number" },
        ...ts,
      ],
      indexes: ["CREATE UNIQUE INDEX idx_log_book_date ON writing_log (book, date)"],
    });
    app.save(log);

    const site = new Collection({
      type: "base",
      name: "site_settings",
      listRule: "",
      viewRule: "",
      createRule: CREATE_OWNED,
      updateRule: KEEP_OWNER,
      deleteRule: null,
      fields: [
        { name: "owner", type: "relation", collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "publisher_name", type: "text", max: 120 },
        { name: "tagline", type: "text", max: 200 },
        { name: "intro", type: "text", max: 2000 },
        { name: "about", type: "text", max: 10000 },
        { name: "email", type: "email" },
        { name: "logo", type: "file", maxSelect: 1, maxSize: 2097152, mimeTypes: ["image/png", "image/svg+xml", "image/webp", "image/jpeg"] },
        { name: "socials", type: "json", maxSize: 4000 },
        { name: "hero_book", type: "relation", collectionId: books.id, maxSelect: 1 },
        ...ts,
      ],
    });
    app.save(site);

    const subscribers = new Collection({
      type: "base",
      name: "subscribers",
      listRule: AUTH,
      viewRule: AUTH,
      // anyone may join the reader list; they cannot read it back
      createRule: "@request.body.email:isset = true",
      updateRule: null,
      deleteRule: AUTH,
      fields: [
        { name: "email", type: "email", required: true },
        { name: "source", type: "text", max: 120 },
        ...ts,
      ],
      indexes: ["CREATE UNIQUE INDEX idx_subscribers_email ON subscribers (email)"],
    });
    app.save(subscribers);
  },
  (app) => {
    for (const name of ["subscribers", "site_settings", "writing_log", "assets", "chapters", "books", "authors"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (_) {}
    }
  },
);
