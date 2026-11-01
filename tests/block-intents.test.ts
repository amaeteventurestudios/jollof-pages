import { describe, expect, it } from "vitest";
import { INTENTS, searchBlocks } from "@/lib/block-intents";
import { BLOCKS } from "@/lib/blocks";

describe("insert menu", () => {
  it("only lists blocks that exist", () => {
    const ids = new Set(BLOCKS.map((b) => b.id));
    for (const i of INTENTS) for (const id of i.blocks) expect(ids.has(id), `${i.id}: ${id}`).toBe(true);
  });

  it("finds blocks by everyday words", () => {
    expect(searchBlocks("reader activity")[0].id).toBe("exercise");
    expect(searchBlocks("quote").map((b) => b.id)).toContain("pull_quote");
    expect(searchBlocks("break")[0].id).toMatch(/break|ornament/);
    expect(searchBlocks("whatsapp")[0].id).toMatch(/chat/);
    expect(searchBlocks("zzzz")).toEqual([]);
    expect(searchBlocks("").length).toBe(INTENTS[0].blocks.length);
  });
});
