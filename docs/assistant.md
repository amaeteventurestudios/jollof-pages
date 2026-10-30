# Writing assistant

The Write tab's tool rail has a writing assistant. Each writer picks **Claude** (Anthropic), **ChatGPT** (OpenAI) or **OpenRouter** and pastes their own API key, so usage is billed to them.

## What runs where

- `src/lib/server/assistant.ts`: settings, streaming replies from the three providers, and memory.
- `/api/assistant/settings`: provider, model and key. A new key is tried against the provider before it is saved, then sealed with AES-256-GCM (`src/lib/server/secret-box.ts`).
- `/api/assistant/chat`: one message, answered as a text stream. The system prompt carries the book's title and sections, the open chapter (pending tracked changes left out), the selection and recalled memories.
- `/api/assistant/models`: the models the writer's key can use.
- `/api/assistant/memory`: list and delete memories.

## Memory (Mem0)

[Mem0](https://github.com/mem0ai/mem0) (`mem0ai`, Apache-2.0) extracts lasting facts from each exchange with the writer's own model, after the reply is sent. It keeps them in a SQLite vector store in `ASSISTANT_DIR` (`/data/assistant` in Docker).

Embeddings come from FastEmbed (`fast-bge-small-en-v1.5`), which runs on the server. That way memory works with Claude too, since Anthropic has no embeddings API. The model is downloaded from Hugging Face on first use into `/app/local_cache`. Both folders are Docker volumes. Telemetry is off (`MEM0_TELEMETRY=false`).

## Environment

| Variable | Purpose |
| --- | --- |
| `AI_KEYS_SECRET` | Seals writers' keys. If empty, it is derived from `PB_SUPERUSER_PASSWORD`. Changing it means writers re-enter their keys. |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY` | The publisher's own keys, used only for accounts in `COVER_AI_FREE_EMAILS`. Optional. |
| `ASSISTANT_ANTHROPIC_URL`, `ASSISTANT_OPENAI_URL`, `ASSISTANT_OPENROUTER_URL` | Point a provider somewhere else, for a proxy or a local test double. |
