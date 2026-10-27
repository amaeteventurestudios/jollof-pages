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
