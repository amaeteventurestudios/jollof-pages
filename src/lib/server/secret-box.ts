import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Seals small secrets (writers' AI keys) before they are stored. The key comes from AI_KEYS_SECRET,
 * or failing that from the PocketBase superuser password, so a database copy alone reveals nothing.
 */

function key(): Buffer {
  const secret = process.env.AI_KEYS_SECRET || process.env.PB_SUPERUSER_PASSWORD;
  if (!secret) throw new Error("AI_KEYS_SECRET is not set on the web server.");
  return createHash("sha256").update(`jollof-ai-keys:${secret}`).digest();
}

export function seal(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), body.toString("base64")].join(".");
}

/** The secret, or null when it was sealed with another key or is damaged. */
export function unseal(sealed: string): string | null {
  const [v, iv, tag, body] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || !body) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(body, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
