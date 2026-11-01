import { describe, expect, it } from "vitest";
import { amazonHost, amazonLink, cleanIsbn, parseBookCode, tidyStoreLink, titleFromAmazonLink } from "../src/lib/isbn";

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

describe("Amazon links", () => {
  const long =
    "https://www.amazon.com/Venture-Studio-Blueprint-Building-Ultimate-ebook/dp/B0C7G8NHC2/ref=sr_1_1?crid=DBDSZKS7U0BN&dib=eyJ2IjoiMSJ9.5Uk&keywords=venture+studio+blueprint&qid=1793561249&sr=8-1";
  it("reads the title Amazon puts in the link", () => {
    expect(titleFromAmazonLink(long)).toBe("Venture Studio Blueprint Building Ultimate");
    expect(titleFromAmazonLink("https://www.amazon.co.uk/Small-Pot-Big-Fire-paperback/dp/0306406152")).toBe("Small Pot Big Fire");
    expect(titleFromAmazonLink("https://www.amazon.com/dp/B0C7G8NHC2")).toBe("");
    expect(titleFromAmazonLink("B0C7G8NHC2")).toBe("");
  });
  it("tidies a long link to the short one, keeping the store", () => {
    expect(tidyStoreLink(long)).toBe("https://www.amazon.com/dp/B0C7G8NHC2");
    expect(tidyStoreLink("https://www.amazon.co.uk/x/dp/B0C7G8NHC2?tag=1")).toBe("https://www.amazon.co.uk/dp/B0C7G8NHC2");
    expect(tidyStoreLink("https://books2read.com/u/abc")).toBe("https://books2read.com/u/abc");
    expect(amazonHost(long)).toBe("www.amazon.com");
  });
});

import { isbn10 } from "@/lib/isbn";
describe("isbn10", () => {
  it("turns a 978 ISBN-13 into the ISBN-10 Amazon uses as the ASIN", () => {
    expect(isbn10("9780306406157")).toBe("0306406152");
    expect(isbn10("9780804429573")).toBe("080442957X");
    expect(isbn10("9791234567896")).toBe("");
    expect(isbn10("0306406152")).toBe("0306406152");
  });
});
