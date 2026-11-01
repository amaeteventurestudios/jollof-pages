import { describe, expect, it } from "vitest";
import { amazonLink, cleanIsbn, parseBookCode } from "../src/lib/isbn";

describe("parseBookCode", () => {
  it("takes ISBN-13 and ISBN-10, with dashes", () => {
    expect(parseBookCode("978-0-306-40615-7")).toEqual({ isbn: "9780306406157" });
    expect(parseBookCode("0-306-40615-2")).toEqual({ isbn: "0306406152" });
  });
  it("reads a Kindle ASIN, in any case", () => {
    expect(parseBookCode("B0C7G8NHC2")).toEqual({ asin: "B0C7G8NHC2" });
    expect(parseBookCode(" b0c7g8nhc2 ")).toEqual({ asin: "B0C7G8NHC2" });
  });
  it("picks the code out of Amazon links", () => {
    expect(parseBookCode("https://www.amazon.com/Some-Title-ebook/dp/B0C7G8NHC2/ref=sr_1_1?keywords=x")).toEqual({ asin: "B0C7G8NHC2" });
    expect(parseBookCode("https://www.amazon.co.uk/gp/product/B0C7G8NHC2")).toEqual({ asin: "B0C7G8NHC2" });
    expect(parseBookCode("https://amazon.com/dp/0306406152?tag=x")).toEqual({ isbn: "0306406152" });
  });
  it("treats a print ASIN as its ISBN-10", () => {
    expect(parseBookCode("0306406152")).toEqual({ isbn: "0306406152" });
  });
  it("refuses anything else", () => {
    expect(parseBookCode("hello")).toBeNull();
    expect(parseBookCode("9780306406158")).toBeNull();
    expect(parseBookCode("https://www.amazon.com/s?k=books")).toBeNull();
    expect(cleanIsbn("B0C7G8NHC2")).toBe("");
  });
  it("links straight to the Amazon page", () => {
    expect(amazonLink("B0C7G8NHC2")).toBe("https://www.amazon.com/dp/B0C7G8NHC2");
  });
});
