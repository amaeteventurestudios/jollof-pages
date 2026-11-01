import { describe, expect, it } from "vitest";
import { DEFAULT_MONTHLY_EMAILS, emailsLeft, monthBounds, monthlyAllowance, planSend, type EmailQuota } from "@/lib/email-quota";

const q = (o: Partial<EmailQuota> = {}): EmailQuota => ({ allowance: 5000, used: 0, extra: 0, resets: "2026-11-01", ...o });

describe("newsletter allowance", () => {
  it("uses the monthly allowance first, then bought emails", () => {
    expect(planSend(q({ used: 4000, extra: 2000 }), 1500)).toEqual({ ok: true, fromAllowance: 1000, fromExtra: 500, short: 0 });
    expect(planSend(q(), 300)).toEqual({ ok: true, fromAllowance: 300, fromExtra: 0, short: 0 });
  });

  it("refuses a send that does not fit", () => {
    const p = planSend(q({ used: 4900, extra: 50 }), 200);
    expect(p.ok).toBe(false);
    expect(p.short).toBe(50);
  });

  it("an allowance used past its size leaves only bought emails", () => {
    expect(planSend(q({ used: 6000, extra: 10 }), 10)).toEqual({ ok: true, fromAllowance: 0, fromExtra: 10, short: 0 });
    expect(emailsLeft(q({ used: 6000, extra: 10 }))).toBe(10);
  });

  it("unlimited accounts always fit", () => {
    expect(planSend(q({ unlimited: true, used: 99999 }), 50000).ok).toBe(true);
  });

  it("reads the allowance from the environment", () => {
    expect(monthlyAllowance(undefined)).toBe(DEFAULT_MONTHLY_EMAILS);
    expect(monthlyAllowance("")).toBe(DEFAULT_MONTHLY_EMAILS);
    expect(monthlyAllowance("12000")).toBe(12000);
    expect(DEFAULT_MONTHLY_EMAILS).toBeLessThanOrEqual(3000);
    expect(monthlyAllowance("lots")).toBe(DEFAULT_MONTHLY_EMAILS);
  });

  it("refills on the first of next month (UTC)", () => {
    const { start, next } = monthBounds(new Date("2026-12-31T23:30:00Z"));
    expect(start.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(next.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});
