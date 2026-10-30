import { describe, expect, it } from "vitest";
import { coverGeometry } from "@/lib/kdp";
import { artPrompts, artSpec, effectiveDpi, preflight } from "@/lib/cover-kit";

const g = coverGeometry("6x9", 200, "white");
const base = { g, pagesEstimated: false, front: null, back: null, frontText: true, title: { x: 0.09, y: 0.1 }, author: { x: 0.09, y: 0.88 }, centered: false, blurb: true, description: "A book." };

describe("cover kit", () => {
  it("sizes each panel with its three outer bleeds at 300 dpi", () => {
    const s = artSpec(g);
    expect(s.front.px).toEqual({ width: 1838, height: 2775 });
    expect(s.front.ratio).toBe("2:3");
    expect(s.wrap.px.width).toBe(Math.ceil(g.width * 300));
  });
  it("reads print resolution from the picture", () => {
    expect(effectiveDpi({ width: 1024, height: 1536 }, artSpec(g).front)).toBe(166);
  });
  it("fails an estimated page count and a small picture, passes a large one", () => {
    const est = preflight({ ...base, pagesEstimated: true });
    expect(est.find((c) => c.label === "Page count")?.state).toBe("fail");
    expect(preflight({ ...base, front: { width: 1024, height: 1536 } }).find((c) => c.label === "Front artwork")?.state).toBe("fail");
    expect(preflight({ ...base, front: { width: 2000, height: 3000 } }).find((c) => c.label === "Front artwork")?.state).toBe("ok");
  });
  it("catches text dragged outside the safe area", () => {
    expect(preflight(base).find((c) => c.label === "Safe area")?.state).toBe("ok");
    expect(preflight({ ...base, author: { x: 0.01, y: 0.99 } }).find((c) => c.label === "Safe area")?.state).toBe("fail");
  });
  it("asks for no lettering unless the art carries the title", () => {
    const b = { title: "Slow Money", author: "A. Writer" };
    expect(artPrompts(artSpec(g), b, false).front).toContain("Do not include any text");
    expect(artPrompts(artSpec(g), b, true).front).toContain('"Slow Money"');
  });
});

describe("hardcover cover kit", () => {
  const h = coverGeometry("6x9", 200, "white", "hardcover");
  const hb = { ...base, g: h };
  it("sizes each panel with the board and the wrap that folds inside", () => {
    const s = artSpec(h);
    expect(s.front.width).toBeCloseTo(6 + 0.197 + 0.591, 3);
    expect(s.front.height).toBeCloseTo(9 + 0.236 + 2 * 0.591, 3);
    expect(s.wrap.px.width).toBe(Math.ceil(h.width * 300));
  });
  it("checks hardcover page limits", () => {
    const thin = coverGeometry("6x9", 60, "white", "hardcover");
    expect(preflight({ ...hb, g: thin }).find((c) => c.label === "Page count")?.state).toBe("fail");
    expect(preflight(hb).find((c) => c.label === "Page count")?.state).toBe("ok");
  });
  it("keeps text off the wrap and away from the hinge", () => {
    expect(preflight(hb).find((c) => c.label === "Safe area")?.state).toBe("ok");
    // positions are fractions of the board: 0.03 is inside the hinge clearance, 0.02 from the top too close to the edge
    expect(preflight({ ...hb, title: { x: 0.03, y: 0.15 } }).find((c) => c.label === "Safe area")?.state).toBe("fail");
    expect(preflight({ ...hb, title: { x: 0.15, y: 0.02 } }).find((c) => c.label === "Safe area")?.state).toBe("fail");
  });
});
