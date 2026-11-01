import { describe, expect, it } from "vitest";
import { goalPlan, lastDays, streak, wordsByDay } from "@/lib/progress";

describe("writing progress", () => {
  const now = new Date("2026-10-26T12:00:00");
  const days = lastDays(5, now);

  it("lists the last n days ending today", () => {
    expect(days).toHaveLength(5);
    expect(days[4]).toBe("2026-10-26");
  });

  it("counts a streak that may end yesterday", () => {
    const m = wordsByDay([
      { date: "2026-10-23", words: 300 },
      { date: "2026-10-24", words: 200 },
      { date: "2026-10-25", words: 100 },
      { date: "2026-10-25", words: 50 },
    ]);
    expect(m.get("2026-10-25")).toBe(150);
    expect(streak(m, 1, now)).toBe(3);
    expect(streak(m, 200, now)).toBe(0);
  });

  it("plans words per day to a deadline", () => {
    const p = goalPlan({ targetWords: 50000, deadline: "2026-11-04", dailyWords: 500 }, 45000, now);
    expect(p.remaining).toBe(5000);
    expect(p.daysLeft).toBe(10);
    expect(p.perDay).toBe(500);
    expect(p.onTrack).toBe(true);
    expect(p.percent).toBe(90);
  });
});
