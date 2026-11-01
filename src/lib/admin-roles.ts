/**
 * Who may do what in the admin. The owner (OWNER_EMAIL / ADMIN_EMAILS on the server) can do
 * everything; everyone else is added on the Team page with one of these roles.
 */
export type Role = "owner" | "admin" | "support" | "finance" | "viewer";
export type StaffRole = Exclude<Role, "owner">;

export const ROLES: { id: Role; label: string; about: string }[] = [
  {
    id: "owner",
    label: "Owner",
    about: "Everything, including the team, brands and the audit log.",
  },
  {
    id: "admin",
    label: "Admin",
    about: "Runs the platform: writers, websites, testers, support and money.",
  },
  {
    id: "support",
    label: "Support",
    about:
      "Answers tickets and ideas, helps writers with their accounts and sites.",
  },
  {
    id: "finance",
    label: "Finance",
    about: "Sees money and payments and downloads reports.",
  },
  {
    id: "viewer",
    label: "Viewer",
    about: "Read only: the overview and insights.",
  },
];
export const STAFF_ROLES = ROLES.filter((r) => r.id !== "owner").map(
  (r) => r.id as StaffRole,
);
export const roleLabel = (r: Role) => ROLES.find((x) => x.id === r)?.label ?? r;

export type Section =
  | "overview"
  | "insights"
  | "writers"
  | "testers"
  | "websites"
  | "books"
  | "money"
  | "support"
  | "team"
  | "brands"
  | "switches"
  | "audit";

const SEES: Record<Role, Section[]> = {
  owner: [
    "overview",
    "insights",
    "writers",
    "testers",
    "websites",
    "books",
    "money",
    "support",
    "team",
    "brands",
    "switches",
    "audit",
  ],
  admin: [
    "overview",
    "insights",
    "writers",
    "testers",
    "websites",
    "books",
    "money",
    "support",
    "switches",
  ],
  support: ["overview", "writers", "websites", "support"],
  finance: ["overview", "insights", "money"],
  viewer: ["overview", "insights"],
};

export function canSee(role: Role, s: Section): boolean {
  return SEES[role].includes(s);
}
export const sectionsFor = (role: Role) => SEES[role];

export type Action =
  | "writer.access" // give or take back free access
  | "writer.apps" // switch Jollof Studio and the AI writer on or off
  | "writer.credits"
  | "writer.password" // set a temporary password
  | "writer.suspend"
  | "writer.delete"
  | "site.offline"
  | "testers.manage"
  | "team.manage"
  | "brands.manage"
  | "flags.manage"; // switch site-wide features such as the free .com on or off

const DOES: Record<Role, Action[]> = {
  owner: [
    "writer.access",
    "writer.apps",
    "writer.credits",
    "writer.password",
    "writer.suspend",
    "writer.delete",
    "site.offline",
    "testers.manage",
    "team.manage",
    "brands.manage",
    "flags.manage",
  ],
  admin: [
    "writer.access",
    "writer.apps",
    "writer.credits",
    "writer.password",
    "writer.suspend",
    "site.offline",
    "testers.manage",
  ],
  support: ["writer.credits", "writer.password"],
  finance: [],
  viewer: [],
};

export function can(role: Role, a: Action): boolean {
  return DOES[role].includes(a);
}

/** Support can hand out a few credits to make up for a problem, not stock an account. */
export const SUPPORT_CREDIT_LIMIT = 100;
