import { afterEach, describe, expect, it } from "vitest";
import { amazonTag, isAmazonStore, tagBuyLinks, withAmazonTag } from "../src/lib/affiliate";

describe("amazon affiliate tags", () => {
  afterEach(() => delete process.env.AMAZON_ASSOCIATE_TAG);
  it("uses the writer's tag, else the house tag", () => {
    process.env.AMAZON_ASSOCIATE_TAG = "sevenfc-20";
    expect(amazonTag({ amazon_tag: "ada-21" })).toBe("ada-21");
    expect(amazonTag({ amazon_tag: "" })).toBe("sevenfc-20");
    expect(amazonTag(null)).toBe("sevenfc-20");
    expect(amazonTag({ amazon_tag: "bad tag!" })).toBe("sevenfc-20");
    delete process.env.AMAZON_ASSOCIATE_TAG;
    expect(amazonTag(null)).toBe("");
  });
  it("only tags Amazon store pages", () => {
    expect(isAmazonStore("https://www.amazon.co.uk/dp/B0C7G8NHC2")).toBe(true);
    expect(isAmazonStore("https://kdp.amazon.com/en_US/bookshelf")).toBe(false);
    expect(isAmazonStore("https://bookshop.org/x")).toBe(false);
    expect(withAmazonTag("https://www.amazon.com/dp/B0C7G8NHC2", "sevenfc-20")).toBe("https://www.amazon.com/dp/B0C7G8NHC2?tag=sevenfc-20");
    expect(withAmazonTag("https://www.amazon.com/dp/B0C7G8NHC2?tag=old-20&th=1", "sevenfc-20")).toBe("https://www.amazon.com/dp/B0C7G8NHC2?tag=sevenfc-20&th=1");
    expect(withAmazonTag("https://amzn.to/abc", "sevenfc-20")).toBe("https://amzn.to/abc");
    expect(withAmazonTag("https://bookshop.org/x", "sevenfc-20")).toBe("https://bookshop.org/x");
    expect(withAmazonTag("https://www.amazon.com/dp/X", "")).toBe("https://www.amazon.com/dp/X");
  });
  it("says when the disclosure is needed", () => {
    expect(tagBuyLinks([{ url: "https://www.amazon.com/dp/X" }], "a-20").tagged).toBe(true);
    expect(tagBuyLinks([{ url: "https://bookshop.org/x" }], "a-20").tagged).toBe(false);
    expect(tagBuyLinks([{ url: "https://www.amazon.com/dp/X" }], "").tagged).toBe(false);
  });
});
