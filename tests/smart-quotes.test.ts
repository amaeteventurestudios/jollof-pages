import { describe, expect, it } from "vitest";
import { getSchema } from "@tiptap/core";
import { manuscriptExtensions } from "@/components/studio/editor-extensions";
import { countStraightQuotes, curlQuotes, curlQuotesTransform, straightQuotesIn } from "@/lib/smart-quotes";

describe("smart quotes", () => {
  it("curls double and single quotes by context", () => {
    expect(curlQuotes(`He said "it's done" and left.`)).toBe("He said “it’s done” and left.");
    expect(curlQuotes(`'Hello,' she said.`)).toBe("‘Hello,’ she said.");
    expect(curlQuotes(`("quoted")`)).toBe("(“quoted”)");
    expect(curlQuotes(`the '90s`)).toBe("the ’90s");
    expect(curlQuotes(`the authors' notes`)).toBe("the authors’ notes");
  });

  it("keeps the length so positions never move", () => {
    const s = `"A" 'b' c's "d"`;
    expect(curlQuotes(s)).toHaveLength(s.length);
    expect(countStraightQuotes(curlQuotes(s))).toBe(0);
  });

  it("curls a document and keeps its formatting", () => {
    const schema = getSchema(manuscriptExtensions());
    const doc = schema.nodeFromJSON({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: 'She said "' }, { type: "text", text: "never", marks: [{ type: "italic" }] }, { type: "text", text: '" twice.' }] }],
    });
    expect(straightQuotesIn(doc)).toBe(2);
    const { tr, changed } = curlQuotesTransform(doc, schema);
    expect(changed).toBe(2);
    expect(tr.doc.textContent).toBe("She said “never” twice.");
    expect(straightQuotesIn(tr.doc)).toBe(0);
    let italic = "";
    tr.doc.descendants((n) => {
      if (n.isText && n.marks.some((m) => m.type.name === "italic")) italic += n.text;
    });
    expect(italic).toBe("never");
  });
});
