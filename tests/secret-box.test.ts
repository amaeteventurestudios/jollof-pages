import { afterEach, describe, expect, it } from "vitest";
import { seal, unseal } from "@/lib/server/secret-box";

describe("secret box", () => {
  afterEach(() => {
    delete process.env.AI_KEYS_SECRET;
  });

  it("seals a key so it reads back only with the same secret", () => {
    process.env.AI_KEYS_SECRET = "first-secret";
    const sealed = seal("sk-ant-api03-example");
    expect(sealed).not.toContain("sk-ant");
    expect(seal("sk-ant-api03-example")).not.toBe(sealed);
    expect(unseal(sealed)).toBe("sk-ant-api03-example");
    process.env.AI_KEYS_SECRET = "another-secret";
    expect(unseal(sealed)).toBeNull();
  });

  it("refuses damaged values", () => {
    process.env.AI_KEYS_SECRET = "first-secret";
    expect(unseal("v1.bad")).toBeNull();
    expect(unseal("not sealed at all")).toBeNull();
  });
});
