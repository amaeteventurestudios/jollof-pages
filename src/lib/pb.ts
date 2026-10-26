import PocketBase, { type RecordModel } from "pocketbase";

/** Public URL of PocketBase, used by the browser and for file links. */
export const PB_URL = (process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090").replace(/\/$/, "");

let client: PocketBase | null = null;

/** Browser client. Auth lives in localStorage via the SDK's default auth store. */
export function pb(): PocketBase {
  if (!client) {
    client = new PocketBase(PB_URL);
    client.autoCancellation(false);
  }
  return client;
}

export function fileUrl(record: Pick<RecordModel, "id" | "collectionId"> | null | undefined, filename: string | null | undefined, thumb?: string): string {
  if (!record || !filename) return "";
  const q = thumb ? `?thumb=${encodeURIComponent(thumb)}` : "";
  return `${PB_URL}/api/files/${record.collectionId}/${record.id}/${encodeURIComponent(filename)}${q}`;
}

export function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "response" in e) {
    const r = (e as { response?: { message?: string; data?: Record<string, { message?: string }> } }).response;
    const field = r?.data && Object.entries(r.data)[0];
    if (field) return `${field[0]}: ${field[1]?.message ?? "invalid"}`;
    if (r?.message) return r.message;
  }
  return e instanceof Error ? e.message : String(e);
}
