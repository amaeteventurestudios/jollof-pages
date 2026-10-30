/**
 * Live collaboration server (Hocuspocus over WebSocket). Each open chapter is a Yjs document named
 * "chapter:<id>:<generation>". The chapter's JSON content in PocketBase stays the source of truth for
 * exports and the website: every change made here is written back to it a moment later.
 *
 * Generations: the Yjs working copy is saved in collab_docs with a hash of the content it produced.
 * If the content was changed some other way since (an import, a book-wide replace done while nobody
 * was editing live), a new generation is built from the content, and clients still holding the old
 * one are turned away so they reload instead of merging stale text back in.
 *
 * Environment: POCKETBASE_INTERNAL_URL, PB_SUPERUSER_EMAIL, PB_SUPERUSER_PASSWORD, COLLAB_PORT.
 */
import { createHash, randomBytes } from "node:crypto";
import { Server } from "@hocuspocus/server";
import { getSchema } from "@tiptap/core";
import { prosemirrorJSONToYDoc, yDocToProsemirrorJSON } from "@tiptap/y-tiptap";
import PocketBase from "pocketbase";
import * as Y from "yjs";
import { manuscriptExtensions } from "../src/components/studio/editor-extensions";
import { canonicalJson, docName, parseDocName, roleOf, type CollabRole } from "../src/lib/collab";
import { countWords, type DocNode } from "../src/lib/doc/types";

const PB_URL = (process.env.POCKETBASE_INTERNAL_URL || "http://127.0.0.1:8090").replace(/\/$/, "");
const FIELD = "default";
const schema = getSchema(manuscriptExtensions());
const EMPTY: DocNode = { type: "doc", content: [{ type: "paragraph" }] };

interface ChapterRec {
  id: string;
  book: string;
  content: DocNode | null;
  collab_gen: string;
  expand?: { book?: { id: string; owner: string; cowriters: string[]; editors: string[]; commenters: string[] } };
}
interface DocRec {
  id: string;
  chapter: string;
  gen: string;
  hash: string;
  state: string;
}
export interface CollabContext {
  user: { id: string; name: string };
  role: CollabRole;
}

/** Turn a connection away; Hocuspocus passes `reason` on to the client. */
function deny(reason: string): Error {
  return Object.assign(new Error(reason), { reason });
}

let adminClient: PocketBase | null = null;
async function admin(): Promise<PocketBase> {
  if (adminClient?.authStore.isValid) return adminClient;
  const pb = new PocketBase(PB_URL);
  pb.autoCancellation(false);
  await pb.collection("_superusers").authWithPassword(process.env.PB_SUPERUSER_EMAIL || "", process.env.PB_SUPERUSER_PASSWORD || "");
  adminClient = pb;
  return pb;
}

async function whoIs(token: string): Promise<{ id: string; name: string } | null> {
  if (!token) return null;
  const pb = new PocketBase(PB_URL);
  pb.autoCancellation(false);
  pb.authStore.save(token, null);
  try {
    const { record } = await pb.collection("users").authRefresh();
    return { id: record.id, name: String(record.name || String(record.email ?? "").split("@")[0] || "Someone") };
  } catch {
    return null;
  }
}

const hashOf = (content: DocNode | null) =>
  createHash("sha256")
    .update(canonicalJson(content ?? EMPTY))
    .digest("hex");
const toB64 = (u: Uint8Array) => Buffer.from(u).toString("base64");
const fromB64 = (s: string) => new Uint8Array(Buffer.from(s, "base64"));

async function docRecord(pb: PocketBase, chapterId: string): Promise<DocRec | null> {
  return pb
    .collection("collab_docs")
    .getFirstListItem<DocRec>(pb.filter("chapter = {:c}", { c: chapterId }))
    .catch(() => null);
}

// one rebuild at a time per chapter
const locks = new Map<string, Promise<unknown>>();
function locked<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(
    key,
    next.catch(() => undefined),
  );
  return next;
}

/** The generation clients should open, building a fresh one if the content moved on without us. */
async function currentGen(pb: PocketBase, ch: ChapterRec, loaded: (name: string) => boolean): Promise<string> {
  return locked(ch.id, async () => {
    const rec = await docRecord(pb, ch.id);
    // a document open right now is the truth; anything written around it is overwritten on the next save
    if (rec?.gen && loaded(docName(ch.id, rec.gen))) return rec.gen;
    if (rec?.gen && rec.state && rec.hash === hashOf(ch.content)) {
      if (ch.collab_gen !== rec.gen) await pb.collection("chapters").update(ch.id, { collab_gen: rec.gen });
      return rec.gen;
    }
    const gen = randomBytes(8).toString("hex");
    const ydoc = prosemirrorJSONToYDoc(schema, ch.content ?? EMPTY, FIELD);
    const data = { chapter: ch.id, gen, hash: hashOf(ch.content), state: toB64(Y.encodeStateAsUpdate(ydoc)) };
    if (rec) await pb.collection("collab_docs").update(rec.id, data);
    else await pb.collection("collab_docs").create(data);
    await pb.collection("chapters").update(ch.id, { collab_gen: gen });
    return gen;
  });
}

const server = new Server<CollabContext>({
  name: "jollof-collab",
  port: Number(process.env.COLLAB_PORT || 3102),
  address: process.env.COLLAB_ADDRESS || "0.0.0.0",
  // write back to PocketBase two seconds after typing stops, and at least every ten seconds
  debounce: 2000,
  maxDebounce: 10000,
  websocketOptions: { maxPayload: 8 * 1024 * 1024 },

  async onAuthenticate({ token, documentName, connectionConfig }) {
    const name = parseDocName(documentName);
    if (!name) throw deny("Unknown document.");
    const user = await whoIs(token);
    if (!user) throw deny("Sign in again.");
    const pb = await admin();
    const ch = await pb
      .collection("chapters")
      .getOne<ChapterRec>(name.chapterId, { expand: "book" })
      .catch(() => null);
    const book = ch?.expand?.book;
    const role = book ? roleOf(book, user.id) : null;
    if (!ch || !role) throw deny("This chapter is not shared with you.");
    const gen = await currentGen(pb, ch, (n) => server.hocuspocus.documents.has(n));
    if (gen !== name.gen) throw deny("stale");
    if (role === "commenter") connectionConfig.readOnly = true;
    return { user, role };
  },

  async onLoadDocument({ documentName, document }) {
    const name = parseDocName(documentName)!;
    const pb = await admin();
    const rec = await docRecord(pb, name.chapterId);
    if (rec?.state && rec.gen === name.gen) Y.applyUpdate(document, fromB64(rec.state));
    return document;
  },

  async onStoreDocument({ documentName, document }) {
    const name = parseDocName(documentName);
    if (!name) return;
    const pb = await admin();
    const rec = await docRecord(pb, name.chapterId);
    // a newer generation replaced this one; its edits must not overwrite the chapter
    if (!rec || rec.gen !== name.gen) return;
    const content = yDocToProsemirrorJSON(document, FIELD) as DocNode;
    const words = countWords(content);
    const ch = await pb.collection("chapters").update<ChapterRec>(name.chapterId, { content, word_count: words });
    await pb.collection("collab_docs").update(rec.id, { state: toB64(Y.encodeStateAsUpdate(document)), hash: hashOf(content) });
    const all = await pb.collection("chapters").getFullList<{ word_count: number }>({ filter: pb.filter("book = {:b}", { b: ch.book }), fields: "word_count" });
    await pb.collection("books").update(ch.book, { word_count: all.reduce((n, c) => n + (c.word_count || 0), 0) });
  },
});

server.listen().then(() => console.log(`Collaboration server on ${server.configuration.address}:${server.configuration.port}`));
