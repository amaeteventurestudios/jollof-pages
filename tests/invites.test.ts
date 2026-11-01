import { describe, expect, it } from "vitest";
import { expiryFor, inviteProblem, inviteState, inviteUrl, isInviteCode, newInviteCode } from "@/lib/invites";
import { writers, type AdminData } from "@/lib/admin";

const now = Date.parse("2026-11-01T12:00:00Z");

describe("tester invites", () => {
  it("says whether a link still lets people in", () => {
    expect(inviteState({}, now)).toBe("active");
    expect(inviteState({ revoked: true }, now)).toBe("revoked");
    expect(inviteState({ expires: "2026-11-01 11:59:59.000Z" }, now)).toBe("expired");
    expect(inviteState({ expires: "2026-11-02 00:00:00.000Z" }, now)).toBe("active");
    expect(inviteState({ max_uses: 3, uses: 3 }, now)).toBe("full");
    expect(inviteState({ max_uses: 0, uses: 500 }, now)).toBe("active");
    expect(inviteProblem(null, now)).toMatch(/not valid/);
    expect(inviteProblem({ max_uses: 1, uses: 2 }, now)).toMatch(/taken/);
    expect(inviteProblem({ max_uses: 2, uses: 1 }, now)).toBe("");
  });

  it("makes codes that are safe in a link and hard to guess", () => {
    const a = newInviteCode();
    expect(a).toHaveLength(16);
    expect(isInviteCode(a)).toBe(true);
    expect(a).not.toMatch(/[0O1lI]/);
    expect(new Set(Array.from({ length: 200 }, () => newInviteCode())).size).toBe(200);
    expect(isInviteCode("../../etc")).toBe(false);
    expect(isInviteCode("short")).toBe(false);
  });

  it("dates and links", () => {
    expect(expiryFor(0, now)).toBe("");
    expect(expiryFor(30, now)).toBe("2026-12-01 12:00:00.000Z");
    expect(inviteUrl("https://jollofpages.com/", "abcDEF234567")).toBe("https://jollofpages.com/join/abcDEF234567");
  });

  it("flags testers and counts their feedback in the writer list", () => {
    const d: AdminData = {
      users: [
        { id: "t", email: "t@x.com", access: "comp", tester_invite: "inv1", created: "2026-10-31 09:00:00.000Z" },
        { id: "p", email: "p@x.com", access: "paid", created: "2026-10-30 09:00:00.000Z" },
      ],
      books: [],
      log: [],
      sites: [],
      ledger: [],
      orders: [],
      billing: [],
      tickets: [
        { status: "open", owner: "t" },
        { status: "closed", owner: "t" },
      ],
      ideas: [
        { status: "new", owner: "t" },
        { status: "new", owner: "p" },
      ],
    };
    const [t, p] = writers(d, 12900);
    expect(t).toMatchObject({ tester: "inv1", tickets: 2, ideas: 1 });
    expect(p).toMatchObject({ tester: "", tickets: 0, ideas: 1 });
  });
});
