import { describe, expect, it } from "vitest";
import { buckets, insights, looksRandom, needsYou, overview, spamSigns, toCsv, websites, weekOf, writers, type AdminData, type InsightData } from "@/lib/admin";
import { can, canSee } from "@/lib/admin-roles";

const now = new Date("2026-11-01T12:00:00Z");
const base: AdminData = {
  users: [
    { id: "u1", email: "ada@example.com", name: "Ada Okafor", access: "paid", created: "2026-10-01 10:00:00.000Z" },
    { id: "u2", email: "o.l.o.n.ige.h1.73@gmail.com", name: "kBnoeNrcwKEYVyfFBc", access: "pending", created: "2026-10-31 10:00:00.000Z" },
    { id: "u3", email: "tola@example.com", name: "Tola", access: "comp", tester_invite: "inv1", created: "2026-10-20 10:00:00.000Z" },
  ],
  books: [{ owner: "u1", updated: "2026-10-30 10:00:00.000Z" }],
  log: [
    { owner: "u1", date: "2026-10-30", words: 1200 },
    { owner: "u1", date: "2026-10-31", words: 800 },
    { owner: "u1", date: "2026-11-01", words: -100 },
  ],
  sites: [
    { id: "s1", owner: "u1", subdomain: "ada", custom_domain: "adaokafor.com", pro_until: "2027-10-01 00:00:00.000Z" },
    { id: "s2", owner: "u2", subdomain: "kbnoenrcwkeyvyffbc" },
  ],
  ledger: [],
  orders: [],
  billing: [],
  tickets: [{ status: "open", owner: "u3" }],
  ideas: [],
};
const x: InsightData = {
  books: [
    {
      id: "b1",
      owner: "u1",
      title: "The Book",
      status: "drafting",
      published: true,
      language: "en",
      categories: ["BUSINESS / Leadership"],
      format: { trim: "6x9" },
      word_count: 2000,
      page_count: 40,
      created: "2026-10-29 10:00:00.000Z",
      updated: "2026-10-31 10:00:00.000Z",
    },
  ],
  chapters: [
    { owner: "u1", book: "b1", word_count: 1500 },
    { owner: "u1", book: "b1", word_count: 500 },
  ],
  generations: [{ owner: "u1", status: "done", created: "2026-10-31 10:00:00.000Z" }],
  usage: [
    { owner: "u1", date: "2026-10-31", kind: "export", key: "pdf-paperback", count: 2 },
    { owner: "u1", date: "2026-10-31", kind: "translate", key: "pt", count: 1 },
  ],
  assistant: [{ owner: "u1", role: "assistant", created: "2026-10-31 10:00:00.000Z" }],
  comments: 0,
  collaborations: 0,
  siteStats: [
    { owner: "u1", date: "2026-10-31", kind: "visitor", count: 7 },
    { owner: "u1", date: "2026-10-31", kind: "view", count: 20 },
  ],
  subscribers: [{ owner: "u1" }, { owner: "u1", unsubscribed: true }],
  domains: [],
};

describe("spam sign-ups", () => {
  it("flags keyboard-mash names and dotted emails, not real names", () => {
    expect(looksRandom("kBnoeNrcwKEYVyfFBc")).toBe(true);
    for (const real of ["Ada Okafor", "Chris Schmidt", "McDonald", "Oluwaseun Adeyemi", "Nkechi"]) expect(looksRandom(real)).toBe(false);
    expect(spamSigns(base.users[1], base.sites[1], 0)).toEqual(["Random-letter name", "Email full of dots", "Nothing written"]);
    expect(spamSigns(base.users[0], base.sites[0], 0)).toEqual([]);
  });
});

describe("insights", () => {
  it("adds up words, books and usage without reading text", () => {
    const i = insights(base, x, 7, now);
    expect(i.totals.wordsWritten).toBe(2000);
    expect(i.totals.wordsOnPlatform).toBe(2000);
    expect(i.totals.exports).toBe(2);
    expect(i.totals.translations).toBe(1);
    expect(i.totals.covers).toBe(1);
    expect(i.totals.activeWriters7).toBe(1);
    expect(i.words).toHaveLength(7);
    expect(i.words.at(-2)).toEqual({ date: "2026-10-31", value: 800 });
    expect(i.trims).toEqual([["6x9", 1]]);
    expect(i.categories).toEqual([["BUSINESS", 1]]);
    expect(i.notStarted.map((w) => w.id)).toEqual(["u3"]);
    expect(i.streaks[0]).toMatchObject({ id: "u1", days: 2 });
  });
  it("uses weeks for long ranges", () => {
    const b = buckets(365, now);
    expect(b[0].date).toBe(weekOf(b[0].date));
    expect(b.length).toBeGreaterThan(50);
    expect(weekOf("2026-11-01")).toBe("2026-10-26");
  });
});

describe("websites and needs", () => {
  it("lists sites with traffic and domain state", () => {
    const w = websites(base, x);
    expect(w[0]).toMatchObject({ subdomain: "ada", domain: "connected", visitors: 7, views: 20, books: 1, subscribers: 1, pro: true });
    expect(w[1]).toMatchObject({ spam: true, books: 0 });
    const needs = needsYou(overview(base, 12900, now), writers(base, 12900), w);
    expect(needs.map((n) => n.kind)).toEqual(["ticket", "spam", "nosite"]);
  });
  it("writes CSV safely", () => {
    expect(toCsv([{ a: 'say "hi", ok', b: 2 }])).toBe('a,b\n"say ""hi"", ok",2');
  });
});

describe("roles", () => {
  it("keeps each role to its pages and actions", () => {
    expect(canSee("support", "money")).toBe(false);
    expect(canSee("finance", "money")).toBe(true);
    expect(can("admin", "writer.delete")).toBe(false);
    expect(can("owner", "writer.delete")).toBe(true);
    expect(can("support", "writer.credits")).toBe(true);
    expect(can("viewer", "writer.credits")).toBe(false);
    expect(canSee("admin", "team")).toBe(false);
  });
});
