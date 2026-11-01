import { describe, expect, it } from "vitest";
import { formatLabel, marketplace, signV4, splitTitle } from "@/lib/server/amazon";

describe("Amazon Product Advertising API helpers", () => {
  it("signs requests like AWS's own Signature V4 test suite (get-vanilla)", () => {
    const auth = signV4({
      method: "GET",
      path: "/",
      headers: { host: "example.amazonaws.com", "x-amz-date": "20150830T123600Z" },
      body: "",
      region: "us-east-1",
      service: "service",
      accessKey: "AKIDEXAMPLE",
      secretKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
    });
    expect(auth).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, SignedHeaders=host;x-amz-date, Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31",
    );
  });

  it("picks the right host and region for each Amazon store", () => {
    expect(marketplace()).toEqual({ marketplace: "www.amazon.com", host: "webservices.amazon.com", region: "us-east-1" });
    expect(marketplace("www.amazon.co.uk")).toEqual({ marketplace: "www.amazon.co.uk", host: "webservices.amazon.co.uk", region: "eu-west-1" });
    expect(marketplace("www.amazon.co.jp").region).toBe("us-west-2");
  });

  it("keeps the title apart from the subtitle", () => {
    expect(splitTitle("Venture Studio Blueprint: Building the Ultimate Startup Factory")).toEqual({ title: "Venture Studio Blueprint", subtitle: "Building the Ultimate Startup Factory" });
    expect(splitTitle("Small Pot, Big Fire (Kindle Edition)")).toEqual({ title: "Small Pot, Big Fire", subtitle: "" });
    expect(splitTitle("Owning Your Words")).toEqual({ title: "Owning Your Words", subtitle: "" });
  });

  it("names the formats readers buy", () => {
    expect(formatLabel("Kindle Edition")).toBe("Kindle");
    expect(formatLabel("Audible Audiobook")).toBe("Audiobook");
    expect(formatLabel("Hardcover")).toBe("Hardcover");
    expect(formatLabel("Paperback")).toBe("Paperback");
    expect(formatLabel("Calendar")).toBe("");
  });
});
