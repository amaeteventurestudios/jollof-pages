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

describe("KDP case laminate hardcover", () => {
  it("binds only KDP's five hardcover trims and maps the others to the nearest", async () => {
    const { HARDCOVER_TRIMS, hardcoverTrim } = await import("@/lib/kdp");
    expect(HARDCOVER_TRIMS.map((t) => t.id)).toEqual(["5.5x8.5", "6x9", "6.14x9.21", "7x10", "8.25x11"]);
    expect(hardcoverTrim("6x9").id).toBe("6x9");
    expect(hardcoverTrim("5x8").id).toBe("5.5x8.5");
    expect(hardcoverTrim("8.5x11").id).toBe("8.25x11");
  });

  it("adds the boards to the spine and the wrap to the cover", () => {
    // 6 x 9 in, 200 pages on white: 0.4504 in of paper + 0.189 in of board
    const c = coverGeometry("6x9", 200, "white", "hardcover");
    expect(c.spine).toBeCloseTo(0.6394, 4);
    expect(c.width).toBeCloseTo(2 * 6 + 0.6394 + 2 * 0.591 + 2 * 0.197, 3);
    expect(c.height).toBeCloseTo(9 + 0.236 + 2 * 0.591, 3);
    expect(c.width).toBeCloseTo(14.215, 3);
    expect(c.height).toBeCloseTo(10.418, 3);
    expect(c.frontX).toBeCloseTo(c.spineX + c.spine, 4);
    expect(c.width - c.frontX).toBeCloseTo(c.panelWidth + c.edge, 4);
    expect(c.spineTextAllowed).toBe(true);
    // safe area stays 0.4 in clear of the spine hinge
    expect(c.safeFront.x - c.frontX).toBeCloseTo(0.4, 4);
    expect(c.safeBack.x + c.safeBack.width).toBeLessThanOrEqual(c.spineX - 0.4 + 1e-9);
    // the barcode stays on the back board, clear of the hinge
    expect(c.barcode.x).toBeGreaterThanOrEqual(c.edge);
    expect(c.barcode.x + c.barcode.width).toBeLessThanOrEqual(c.spineX - 0.4);
    expect(c.barcode.y + c.barcode.height).toBeLessThanOrEqual(c.height - c.edge);
  });

  it("uses the hardcover trim when the paperback size is not bound in hardcover", () => {
    expect(coverGeometry("5x8", 200, "cream", "hardcover").trim.id).toBe("5.5x8.5");
    expect(coverGeometry("5x8", 200, "cream").trim.id).toBe("5x8");
  });

  it("gives the hardcover a wider gutter than the paperback", () => {
    for (const pages of [100, 300, 500]) {
      const soft = pageGeometry("6x9", pages, false);
      const hard = pageGeometry("6x9", pages, false, "hardcover");
      expect(hard.margins.inside).toBeCloseTo(soft.margins.inside + 0.125, 3);
      expect(hard.margins.outside).toBe(soft.margins.outside);
    }
  });

  it("keeps the paperback cover exactly as before", () => {
    const c = coverGeometry("6x9", 200, "cream");
    expect(c.edge).toBe(0.125);
    expect(c.panelWidth).toBe(6);
    expect(c.safeFront).toEqual({ x: c.frontX + 0.125, y: 0.25, width: 5.75, height: 8.75 });
    expect(c.barcode).toEqual({ x: c.spineX - 2.25, y: 9.25 - 0.125 - 0.25 - 1.2, width: 2, height: 1.2 });
  });

  it("limits hardcovers to 75 to 550 pages on every paper", async () => {
    const { maxPages, minPages, getTrim } = await import("@/lib/kdp");
    expect(minPages("hardcover")).toBe(75);
    for (const paper of ["white", "cream", "color-premium"] as const) expect(maxPages(getTrim("6x9"), paper, "hardcover")).toBe(550);
  });
});
