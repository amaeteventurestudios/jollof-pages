import { pb } from "./pb";

/** Tells the platform one export or translation happened, for the admin's totals. Never in the way. */
export function trackUsage(kind: "export" | "translate", key: string): void {
  void fetch("/api/usage", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${pb().authStore.token}` },
    body: JSON.stringify({ kind, key }),
    keepalive: true,
  }).catch(() => undefined);
}
