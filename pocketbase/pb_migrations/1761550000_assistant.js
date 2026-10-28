/// <reference path="../pb_data/types.d.ts" />
/**
 * Writing assistant: each person picks Claude, ChatGPT or OpenRouter and brings their own key.
 * ai_settings is written only by the server, because it holds the keys (encrypted).
 * assistant_messages keeps one conversation per person and book.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    const books = app.findCollectionByNameOrId("books");

    const settings = new Collection({
      type: "base",
      name: "ai_settings",
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "owner", type: "relation", collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "provider", type: "select", maxSelect: 1, values: ["anthropic", "openai", "openrouter"] },
        // the model chosen for each provider, as JSON { anthropic, openai, openrouter }
        { name: "models", type: "json", maxSize: 4000 },
        // { anthropic, openai, openrouter }: AES-GCM sealed keys
        { name: "keys", type: "json", maxSize: 8000, hidden: true },
        { name: "memory", type: "bool" },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_ai_settings_owner ON ai_settings (owner)"],
    });
    app.save(settings);

    const messages = new Collection({
      type: "base",
      name: "assistant_messages",
      listRule: "owner = @request.auth.id",
      viewRule: "owner = @request.auth.id",
      createRule: null,
      updateRule: null,
      deleteRule: "owner = @request.auth.id",
      fields: [
        { name: "owner", type: "relation", collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "book", type: "relation", collectionId: books.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "role", type: "select", required: true, maxSelect: 1, values: ["user", "assistant"] },
        { name: "content", type: "text", max: 60000 },
        // which provider and model answered
        { name: "model", type: "text", max: 200 },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      ],
      indexes: ["CREATE INDEX idx_assistant_messages_owner_book ON assistant_messages (owner, book)"],
    });
    app.save(messages);
  },
  (app) => {
    for (const name of ["assistant_messages", "ai_settings"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (_) {}
    }
  },
);
