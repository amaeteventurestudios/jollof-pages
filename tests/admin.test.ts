import { describe, expect, it } from "vitest";
import { overview, payments, writers, type AdminData } from "@/lib/admin";

const now = new Date("2026-10-28T12:00:00Z");
const data: AdminData = {
  users: [
    { id: "a", email: "a@x.com", access: "paid", paid_cents: 11900, paid_at: "2026-10-20 10:00:00.000Z", created: "2026-10-20 09:00:00.000Z" },
    { id: "b", email: "b@x.com", access: "paid", created: "2026-09-01 09:00:00.000Z" },
    { id: "c", email: "c@x.com", access: "comp", created: "2026-10-27 09:00:00.000Z" },
    { id: "d", email: "d@x.com", access: "pending", created: "2026-10-28 09:00:00.000Z" },
  ],
  books: [
    { owner: "a", updated: "2026-10-25 00:00:00.000Z" },
    { owner: "a", updated: "2026-10-21 00:00:00.000Z" },
  ],
  log: [{ owner: "a", date: "2026-10-27" }],
  sites: [{ owner: "a", subdomain: "ann" }],
  ledger: [
    { id: "l1", owner: "a", delta: 100, reason: "topup", amount_cents: 1000, created: "2026-10-22 00:00:00.000Z" },
    { id: "l2", owner: "a", delta: -4, reason: "generation", created: "2026-10-22 01:00:00.000Z" },
    { id: "l3", owner: "c", delta: 20, reason: "grant", created: "2026-10-27 01:00:00.000Z" },
  ],
  orders: [{ id: "o1", owner: "a", amount_cents: 999, fee_cents: 60, email: "r@y.com", created: "2026-10-26 00:00:00.000Z" }],
  billing: [
    { owner: "a", status: "active", interval: "year" },
    { owner: "b", status: "canceled", interval: "month" },
  ],
  tickets: [{ status: "open" }, { status: "answered" }, { status: "closed" }],
  ideas: [{ status: "new" }, { status: "shipped" }],
};

describe("admin sums", () => {
  it("adds up writers, money and support", () => {
    const o = overview(data, 11900, now);
    expect(o.writers).toEqual({ total: 4, paid: 2, comp: 1, pending: 1, collaborator: 0, new7: 2, new30: 3 });
    // b paid before amounts were recorded, so counts at the list price
    expect(o.money.studioCents).toBe(23800);
    expect(o.money.studioCount).toBe(2);
    expect(o.money.creditCents).toBe(1000);
    expect(o.money.creditsUsed).toBe(4);
    expect(o.money.ebookFeeCents).toBe(60);
    expect(o.money.thisMonthCents).toBe(11900 + 1000 + 60);
    expect(o.money.proYearly).toBe(1);
    expect(o.money.proMonthly).toBe(0);
    expect(o.tickets).toEqual({ open: 1, answered: 1 });
    expect(o.ideas).toEqual({ new: 1, total: 2 });
    expect(o.signups).toHaveLength(30);
    expect(o.signups.at(-1)).toEqual({ date: "2026-10-28", count: 1 });
  });

  it("lists writers with books, activity, credits and spend", () => {
    const list = writers(data, 11900);
    expect(list.map((w) => w.id)).toEqual(["d", "c", "a", "b"]);
    const a = list.find((w) => w.id === "a")!;
    expect(a).toMatchObject({ books: 2, credits: 96, spentCents: 12900, pro: true, lastActive: "2026-10-27" });
    expect(a.site?.subdomain).toBe("ann");
    expect(list.find((w) => w.id === "c")).toMatchObject({ credits: 20, spentCents: 0, books: 0 });
  });

  it("lists payments newest first, keeping only the fee on ebooks", () => {
    const p = payments(data, 11900);
    expect(p.map((x) => x.kind)).toEqual(["ebook", "credits", "studio", "studio"]);
    expect(p[0]).toMatchObject({ cents: 999, keepCents: 60, email: "a@x.com" });
  });
});
