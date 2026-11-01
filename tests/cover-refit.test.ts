import { describe, expect, it } from "vitest";
import { inkOn, readWrap } from "@/lib/cover-refit";

const wrap = (trimW: number, trimH: number, spine: number, dpi = 300, bleed = true) => {
  const e = bleed ? 0.125 : 0;
  return { width: Math.round((2 * trimW + spine + 2 * e) * dpi), height: Math.round((trimH + 2 * e) * dpi) };
};

describe("refit an existing KDP wrap", () => {
  it("finds the back, spine and front of a 6 x 9 wrap at 300 dpi", () => {
    const r = readWrap(wrap(6, 9, 0.45), "6x9")!;
    expect(r.trim.id).toBe("6x9");
    expect(r.bleed).toBe(true);
    expect(Math.round(r.dpi)).toBe(300);
    expect(r.spine).toBeCloseTo(0.45, 2);
    expect(r.pages).toBe(200);
    expect(r.back).toMatchObject({ x: 0, width: 1838 });
    expect(r.spineRect.width).toBe(134);
    expect(r.front.x).toBe(1838 + 134);
    expect(r.notes).toEqual([]);
  });

  it("spots a wrap made for another trim", () => {
    const r = readWrap(wrap(5.5, 8.5, 0.6), "6x9")!;
    expect(r.trim.id).toBe("5.5x8.5");
    expect(r.spine).toBeCloseTo(0.6, 2);
    expect(r.notes[0]).toMatch(/made for/);
  });

  it("reads a wrap without bleed and a wrap at 600 dpi", () => {
    const nb = readWrap(wrap(6, 9, 0.3, 300, false), "6x9")!;
    expect(nb.bleed).toBe(false);
    expect(nb.notes.join(" ")).toMatch(/no bleed/);
    const hi = readWrap(wrap(6, 9, 0.3, 600), "6x9")!;
    expect(Math.round(hi.dpi)).toBe(600);
    expect(hi.spine).toBeCloseTo(0.3, 2);
  });

  it("says no to a front cover on its own", () => {
    expect(readWrap({ width: 1800, height: 2700 }, "6x9")).toBeNull();
  });

  it("picks readable spine text", () => {
    expect(inkOn("#ffffff")).toBe("#1c1a17");
    expect(inkOn("#ad3a17")).toBe("#ffffff");
  });
});
