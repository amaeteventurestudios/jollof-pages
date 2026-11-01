import { describe, expect, it } from "vitest";
import { parseTranslation, planTranslation } from "@/lib/translate";
import type { DocNode } from "@/lib/doc/types";

const doc: DocNode = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "The beginning" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Faith is " },
        { type: "text", text: "not", marks: [{ type: "bold" }] },
        { type: "text", text: " a feeling." },
        { type: "footnote", attrs: { text: "See chapter two." } },
      ],
    },
    { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Pray daily" }] }] }] },
    { type: "paragraph", content: [{ type: "text", text: "123" }] },
    { type: "image", attrs: { src: "x.png", alt: "A church", title: "" } },
  ],
};

describe("translating a chapter", () => {
  it("sends each paragraph once, with tags round styled runs, and puts the answers back", () => {
    const job = planTranslation(doc);
    expect(job.batches).toEqual([["The beginning", "<1>Faith is </1><2>not</2><3> a feeling.</3>", "See chapter two.", "Pray daily", "A church"]]);
    const out = job.finish([["El comienzo", "<1>La fe </1><2>no</2><3> es un sentimiento.</3>", "Ver capítulo dos.", "Ora cada día", "Una iglesia"]]);
    const p = out.content![1].content!;
    expect(p.map((n) => n.text)).toEqual(["La fe ", "no", " es un sentimiento.", undefined]);
    expect(p[1].marks).toEqual([{ type: "bold" }]);
    expect(p[3].attrs!.text).toBe("Ver capítulo dos.");
    expect(out.content![0].content![0].text).toBe("El comienzo");
    expect(out.content![3].content![0].text).toBe("123");
    expect(out.content![4].attrs!.alt).toBe("Una iglesia");
    // the original is untouched
    expect(doc.content![0].content![0].text).toBe("The beginning");
  });

  it("keeps the words when the model drops the tags", () => {
    const job = planTranslation(doc);
    const out = job.finish([["El comienzo", "La fe no es un sentimiento.", "Ver capítulo dos.", "Ora cada día", "Una iglesia"]]);
    const p = out.content![1].content!.filter((n) => n.type === "text");
    expect(p.map((n) => n.text)).toEqual(["La fe no es un sentimiento."]);
  });

  it("splits long chapters into batches", () => {
    const long: DocNode = { type: "doc", content: Array.from({ length: 30 }, (_, i) => ({ type: "paragraph", content: [{ type: "text", text: `Paragraph ${i} `.repeat(30) }] })) };
    const job = planTranslation(long, 2000);
    expect(job.batches.length).toBeGreaterThan(3);
    expect(job.batches.flat()).toHaveLength(30);
  });

  it("reads the model's array, and refuses a wrong count", () => {
    expect(parseTranslation('Here you go:\n["a","b"]', 2)).toEqual(["a", "b"]);
    expect(parseTranslation('```json\n["a"]\n```', 2)).toBeNull();
    expect(parseTranslation("no", 1)).toBeNull();
  });
});
