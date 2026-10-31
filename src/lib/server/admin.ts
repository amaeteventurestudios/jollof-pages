import "server-only";
import { adminConfigured, adminPb, caller, type Caller } from "./credits";
import { bearer } from "./load-book";
import { studioPriceCents } from "./stripe";
import type { AdminData } from "../admin";

/** Who may open the admin: ADMIN_EMAILS (comma separated), or OWNER_EMAIL. */
export function isAdmin(email: string): boolean {
  return (process.env.ADMIN_EMAILS || process.env.OWNER_EMAIL || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

/** The signed-in admin, or the status and sentence to answer with. */
export async function requireAdmin(req: Request): Promise<Caller | { status: number; error: string }> {
  const me = await caller(bearer(req));
  if (!me) return { status: 401, error: "Sign in first." };
  if (!isAdmin(me.email)) return { status: 403, error: "This page is for the owner only." };
  if (!adminConfigured()) return { status: 503, error: "PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD are not set on the web server." };
  return me;
}

export const listPrice = () => studioPriceCents();

/** Every row the admin adds up. Fine for thousands of writers; past that, move the sums into the database. */
export async function loadAdminData(): Promise<AdminData> {
  const pb = await adminPb();
  const all = <T>(name: string, fields: string, filter?: string) =>
    pb
      .collection(name)
      .getFullList<T>({ fields, batch: 1000, ...(filter ? { filter } : {}) })
      .catch(() => [] as T[]);
  const [users, books, log, sites, ledger, orders, billing, tickets, ideas] = await Promise.all([
    all<AdminData["users"][number]>("users", "id,email,name,access,paid_cents,paid_at,tester_invite,created"),
    all<AdminData["books"][number]>("books", "owner,updated"),
    all<AdminData["log"][number]>("writing_log", "owner,date"),
    all<AdminData["sites"][number]>("site_settings", "owner,subdomain,home,custom_domain,pro_until"),
    all<AdminData["ledger"][number]>("credit_ledger", "id,owner,delta,reason,amount_cents,note,created"),
    all<AdminData["orders"][number]>("orders", "id,owner,amount_cents,fee_cents,email,created"),
    all<AdminData["billing"][number]>("billing", "owner,status,interval"),
    all<{ status: string; owner: string }>("support_requests", "status,owner"),
    all<{ status: string; owner: string }>("feature_requests", "status,owner"),
  ]);
  return { users, books, log, sites, ledger, orders, billing, tickets, ideas };
}
