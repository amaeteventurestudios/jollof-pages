import { describe, expect, it } from "vitest";
import { getSchema } from "@tiptap/core";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { suggestionModePlugin } from "prosemirror-suggestion-mode";
import { manuscriptExtensions } from "@/components/studio/editor-extensions";
import { listChanges, resolveChangesIn } from "@/components/studio/track-changes";
import { withoutSuggestions } from "@/lib/doc/suggestions";
import { plainText, type DocNode } from "@/lib/doc/types";

const schema = getSchema(manuscriptExtensions());
const doc = (...paras: string[]) => schema.nodeFromJSON({ type: "doc", content: paras.map((t) => ({ type: "paragraph", content: [{ type: "text", text: t }] })) });

function editing(...paras: string[]) {
  let state = EditorState.create({ doc: doc(...paras), plugins: [suggestionModePlugin({ inSuggestionMode: true, username: "Ada", data: { userId: "u1" }, hoverMenuOptions: { disabled: true } })] });
  return {
    get state() {
      return state;
    },
    run(fn: (s: EditorState) => import("@tiptap/pm/state").Transaction) {
      state = state.apply(fn(state));
      // appendTransaction runs through applyTransaction
      return state;
    },
    apply(tr: import("@tiptap/pm/state").Transaction) {
      state = state.applyTransaction(tr).state;
    },
    text: () => state.doc.textBetween(0, state.doc.content.size, "|"),
  };
}

describe("track changes", () => {
  it("records a deletion and an insertion, then accepts them", () => {
    const e = editing("Small pot big fire");
    // replace "big" (positions 11..14) with "huge"
    e.apply(e.state.tr.insertText("huge", 11, 14));
    const changes = listChanges(e.state.doc);
    expect(changes.map((c) => [c.type, c.text, c.username, c.userId])).toEqual([
      ["delete", "big", "Ada", "u1"],
      ["insert", "huge", "Ada", "u1"],
    ]);
    // the book still reads as before until the change is accepted
    expect(plainText(withoutSuggestions(e.state.doc.toJSON() as DocNode)).trim()).toBe("Small pot big fire");
    const tr = e.state.tr;
    resolveChangesIn(tr, changes, true);
    e.apply(tr);
    expect(e.text()).toBe("Small pot huge fire");
    expect(listChanges(e.state.doc)).toEqual([]);
  });

  it("rejects a change and puts the text back", () => {
    const e = editing("Small pot big fire");
    e.apply(e.state.tr.insertText("huge", 11, 14));
    const tr = e.state.tr;
    resolveChangesIn(tr, listChanges(e.state.doc), false);
    e.apply(tr);
    expect(e.text()).toBe("Small pot big fire");
  });

  it("handles a deletion across paragraphs both ways", () => {
    const start = () => {
      const e = editing("First line", "Second line");
      // delete from "line" in the first paragraph to "Second " in the next
      const tr = e.state.tr.delete(7, 20);
      tr.setSelection(TextSelection.create(tr.doc, 7));
      e.apply(tr);
      return e;
    };
    const a = start();
    expect(listChanges(a.state.doc).length).toBe(1);
    expect(plainText(withoutSuggestions(a.state.doc.toJSON() as DocNode), "|")).toBe("First line|Second line|");
    const acc = a.state.tr;
    resolveChangesIn(acc, listChanges(a.state.doc), true);
    a.apply(acc);
    expect(a.text()).toBe("First line");

    const r = start();
    const rej = r.state.tr;
    resolveChangesIn(rej, listChanges(r.state.doc), false);
    r.apply(rej);
    expect(r.text()).toBe("First line|Second line");
  });
});
