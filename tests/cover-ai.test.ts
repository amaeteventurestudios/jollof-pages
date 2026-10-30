import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { CREDIT_PACKS, buildCoverPrompt, creditsFor, nearestAspect, packReach, type PromptInput } from "@/lib/cover-ai";
import { verifyWebhook } from "@/lib/server/stripe";

const base: PromptInput = {
  target: "front",
  style: "photo",
  idea: "a lone baobab at dusk",
  book: { title: "Slow Money", subtitle: "Wealth that lasts", author: "A. Writer", description: "A calm guide to saving. It covers budgets, debt and investing." },
  palette: { bg: "#ad3a17", fg: "#ffffff", accent: "#f2c14e" },
  usePalette: true,
  lettering: false,
  aspect: "2:3",
  edgePercent: 5,
  matchReference: false,
};

describe("AI cover pricing", () => {
  it("keeps model spend at $4 for every $10 of credits", () => {
    expect(creditsFor("draft")).toBe(2); // $0.08
    expect(creditsFor("print")).toBe(4); // $0.16
    expect(creditsFor("draft", 3)).toBe(6);
    const ten = CREDIT_PACKS[0];
    expect(ten.cents).toBe(1000);
    expect(packReach(ten)).toEqual({ drafts: 50, prints: 25 });
    for (const p of CREDIT_PACKS) expect(p.credits / (p.cents / 100)).toBe(10);
  });
  it("picks the nearest portrait ratio for a panel", () => {
    expect(nearestAspect(6.125, 9.25)).toBe("2:3");
    expect(nearestAspect(8.625, 11.25)).toBe("3:4");
    expect(nearestAspect(1600, 2560)).toBe("2:3");
  });
});

describe("AI cover prompt", () => {
  it("carries the book, the idea and the cover colours", () => {
    const p = buildCoverPrompt(base);
    expect(p).toContain('"Slow Money"');
    expect(p).toContain("baobab");
    expect(p).toContain("#ad3a17");
    expect(p).toContain("#f2c14e");
    expect(p).toContain("Do not include any text");
    expect(p).toContain("2:3");
  });
  it("leaves colours out when asked and sets lettering when asked", () => {
    const p = buildCoverPrompt({ ...base, usePalette: false, lettering: true });
    expect(p).not.toContain("#ad3a17");
    expect(p).toContain('author name "A. Writer"');
  });
  it("keeps the back cover quiet and clear for the barcode", () => {
    const p = buildCoverPrompt({ ...base, target: "back", matchReference: true });
    expect(p).toContain("barcode");
    expect(p).toContain("reference picture");
    expect(p).toContain("No text");
  });
});

describe("Stripe webhook signature", () => {
  const secret = "whsec_test";
  const body = '{"type":"checkout.session.completed"}';
  const t = 1_800_000_000;
  const sig = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  it("accepts a correct signature and rejects tampering or old events", () => {
    expect(verifyWebhook(body, `t=${t},v1=${sig}`, secret, 300, t * 1000)).toBe(true);
    expect(verifyWebhook(body + " ", `t=${t},v1=${sig}`, secret, 300, t * 1000)).toBe(false);
    expect(verifyWebhook(body, `t=${t},v1=${sig}`, secret, 300, (t + 3600) * 1000)).toBe(false);
    expect(verifyWebhook(body, null, secret)).toBe(false);
  });
});
