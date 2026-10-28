import { describe, expect, it } from "vitest";
import { parseList } from "@/lib/assistant";

describe("parseList", () => {
  it("reads a JSON array, even with words around it", () => {
    expect(parseList('Here you go:\n["One", "Two", "Three"]\nEnjoy', 2)).toEqual(["One", "Two"]);
  });
  it("falls back to lines and strips numbering, bullets and quotes", () => {
    expect(parseList('1. "Alpha"\n- Beta\n\n* Gamma', 5)).toEqual(["Alpha", "Beta", "Gamma"]);
  });
  it("keeps paragraphs inside one array item", () => {
    expect(parseList('["First para.\\n\\nSecond para."]', 2)).toEqual(["First para.\n\nSecond para."]);
  });
});
