import { describe, expect, it } from "vitest";
import { coverGeometry, getTrim, minGutter, pageGeometry, spineWidth, TRIM_SIZES } from "@/lib/kdp";

describe("KDP print rules", () => {
  it("offers the common non-fiction trims", () => {
    for (const id of ["5x8", "5.25x8", "5.5x8.5", "6x9", "8.5x11"]) expect(TRIM_SIZES.some((t) => t.id === id)).toBe(true);
    expect(getTrim("nope").id).toBe("6x9");
  });

  it("widens the gutter with the page count", () => {
    expect(minGutter(24)).toBe(0.375);
    expect(minGutter(150)).toBe(0.375);
    expect(minGutter(151)).toBe(0.5);
    expect(minGutter(300)).toBe(0.5);
    expect(minGutter(400)).toBe(0.625);
    expect(minGutter(600)).toBe(0.75);
    expect(minGutter(800)).toBe(0.875);
  });

  it("keeps inside and outside margins above KDP minimums", () => {
    for (const pages of [24, 200, 450, 700]) {
      for (const bleed of [false, true]) {
        const g = pageGeometry("6x9", pages, bleed);
        expect(g.margins.inside).toBeGreaterThanOrEqual(minGutter(pages));
        expect(g.margins.outside).toBeGreaterThanOrEqual(bleed ? 0.375 : 0.25);
      }
    }
  });

  it("adds bleed to the page size only when asked", () => {
    const plain = pageGeometry("6x9", 200, false);
    const bled = pageGeometry("6x9", 200, true);
    expect(plain.pageWidth).toBe(6);
    expect(bled.pageWidth).toBeCloseTo(6.125);
    expect(bled.pageHeight).toBeCloseTo(9.25);
  });

  it("computes spine and full cover like KDP's calculator", () => {
    expect(spineWidth(200, "white")).toBeCloseTo(0.4504, 4);
    expect(spineWidth(200, "cream")).toBeCloseTo(0.5, 4);
    const c = coverGeometry("6x9", 200, "cream");
    expect(c.width).toBeCloseTo(0.125 * 2 + 6 * 2 + 0.5, 4);
    expect(c.height).toBeCloseTo(9.25, 4);
    expect(c.spineTextAllowed).toBe(true);
    expect(coverGeometry("6x9", 60, "cream").spineTextAllowed).toBe(false);
  });
});
