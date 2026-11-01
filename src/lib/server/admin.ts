import "server-only";
import { adminConfigured, adminPb, caller, type Caller } from "./credits";
import { bearer } from "./load-book";
import { studioPriceCents } from "./stripe";
import type { AdminData, InsightData } from "../admin";
import { can, canSee, type Action, type Role, type Section } from "../admin-roles";

/** The owner: ADMIN_EMAILS (comma separated), or OWNER_EMAIL. They can always open the admin. */
export function ownerEmails(): string[] {
  return (process.env.ADMIN_EMAILS || process.env.OWNER_EMAIL || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isOwner(email: string): boolean {
  return ownerEmails().includes(email.toLowerCase());
}

let staffCache: { at: number; rows: Map<string, Role> } | null = null;

/** Staff added on the Team page, by email. Read at most once a minute. */
async function staff(): Promise<Map<string, Role>> {
  if (staffCache && Date.now() - staffCache.at < 60_000) return staffCache.rows;
  const rows = new Map<string, Role>();
  if (adminConfigured()) {
    const pb = await adminPb().catch(() => null);
    const list = pb
      ? await pb
          .collection("staff")
          .getFullList<{ email: string; role: Role }>({ fields: "email,role" })
          .catch(() => [])
      : [];
    for (const s of list) rows.set(s.email.toLowerCase(), s.role);
  }
  staffCache = { at: Date.now(), rows };
  return rows;
}

export function forgetStaff() {
  staffCache = null;
}

/** Someone's role in the admin, or null when they have none. */
export async function roleOf(email: string): Promise<Role | null> {
  if (!email) return null;
  if (isOwner(email)) return "owner";
  return (await staff()).get(email.toLowerCase()) ?? null;
}

export async function isAdmin(email: string): Promise<boolean> {
  return (await roleOf(email)) !== null;
}

export type AdminCaller = Caller & { role: Role };

/**
 * The signed-in staff member, if they may open `need` (a section) or do it (an action);
 * otherwise the status and sentence to answer with.
 */
export async function requireAdmin(req: Request, need: Section | Action = "overview"): Promise<AdminCaller | { status: number; error: string }> {
  const me = await caller(bearer(req));
  if (!me) return { status: 401, error: "Sign in first." };
  if (!adminConfigured()) return { status: 503, error: "PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD are not set on the web server." };
  const role = await roleOf(me.email);
  if (!role) return { status: 403, error: "This page is for the Jollof Pages team only." };
  const ok = need.includes(".") ? can(role, need as Action) : canSee(role, need as Section);
  if (!ok) return { status: 403, error: "Your role on the team doesn't allow that. Ask the owner." };
  return { ...me, role };
}

/** Writes one line to the audit log. Never fails the action it records. */
export async function audit(me: AdminCaller, action: string, target: { id?: string; label?: string } = {}, detail = ""): Promise<void> {
  const pb = await adminPb().catch(() => null);
  await pb
    ?.collection("admin_audit")
    .create({ actor: me.email, role: me.role, action, target: target.id ?? "", target_label: (target.label ?? "").slice(0, 300), detail: detail.slice(0, 1000) })
    .catch(() => undefined);
}

export const listPrice = () => studioPriceCents();

const all = async <T>(name: string, fields: string, filter?: string): Promise<T[]> => {
  const pb = await adminPb();
  return pb
    .collection(name)
    .getFullList<T>({ fields, batch: 1000, ...(filter ? { filter } : {}) })
    .catch(() => [] as T[]);
};

/** Every row the admin adds up. Fine for thousands of writers; past that, move the sums into the database. */
export async function loadAdminData(): Promise<AdminData> {
  const [users, books, log, sites, ledger, orders, billing, tickets, ideas] = await Promise.all([
    all<AdminData["users"][number]>("users", "id,email,name,access,paid_cents,paid_at,tester_invite,suspended,created"),
    all<AdminData["books"][number]>("books", "owner,updated"),
    all<AdminData["log"][number]>("writing_log", "owner,date,words"),
    all<AdminData["sites"][number]>("site_settings", "id,owner,subdomain,home,custom_domain,pro_until,offline,publisher_name,updated"),
    all<AdminData["ledger"][number]>("credit_ledger", "id,owner,delta,reason,amount_cents,note,created"),
    all<AdminData["orders"][number]>("orders", "id,owner,amount_cents,fee_cents,email,created"),
    all<AdminData["billing"][number]>("billing", "owner,status,interval"),
    all<{ status: string; owner: string }>("support_requests", "status,owner"),
    all<{ status: string; owner: string }>("feature_requests", "status,owner"),
  ]);
  return { users, books, log, sites, ledger, orders, billing, tickets, ideas };
}

/**
 * The counts behind Insights, Websites and Books. Only numbers, dates and titles: no chapter
 * text, notes or AI chats are ever read.
 */
export async function loadInsightData(statsSince: string): Promise<InsightData> {
  const [books, chapters, generations, usage, assistant, comments, collab, siteStats, subscribers, domains] = await Promise.all([
    all<InsightData["books"][number]>("books", "id,owner,title,status,published,language,categories,format,word_count,page_count,created,updated"),
    all<InsightData["chapters"][number]>("chapters", "owner,book,word_count"),
    all<InsightData["generations"][number]>("cover_generations", "owner,status,created"),
    all<InsightData["usage"][number]>("usage_stats", "owner,date,kind,key,count"),
    all<InsightData["assistant"][number]>("assistant_messages", "owner,role,created"),
    all<{ created: string }>("comments", "created"),
    all<{ status: string }>("collab_invites", "status"),
    all<InsightData["siteStats"][number]>(
      "site_stats",
      "owner,date,kind,count",
      `date >= "${statsSince}" && (kind = "view" || kind = "visitor" || kind = "signup" || kind = "buy_click" || kind = "sale")`,
    ),
    all<InsightData["subscribers"][number]>("subscribers", "owner,unsubscribed"),
    all<InsightData["domains"][number]>("domains", "owner,domain,status,error,updated"),
  ]);
  return { books, chapters, generations, usage, assistant, comments: comments.length, collaborations: collab.filter((c) => c.status === "accepted").length, siteStats, subscribers, domains };
}
