/** What Jollof Studio tells the Jollof Pages admin (its deploy/pb_hooks/jx_admin.pb.js). Counts and names only. */
export type StudioPerson = {
  email: string;
  name: string;
  verified: boolean;
  google: boolean;
  created: string;
  lastActive: string;
  designs: number;
  uploads: number;
  aiRequests: number;
  aiTokens: number;
  aiPictures: number;
};

export type StudioSummary = {
  people: StudioPerson[];
  totals: {
    people: number;
    designs: number;
    versions: number;
    uploads: number;
    brandKits: number;
    shareLinks: number;
    shareVisits: number;
    liveRooms: number;
    agentKeys: number;
    aiRequests: number;
    aiTokens: number;
    aiPictures: number;
  };
  recentDesigns: { title: string; owner: string; pages: number; updated: string }[];
};

/** One person on Admin > Writers > Access: a Jollof Pages writer, a Studio account, or both (same email). */
export type AccessPerson = {
  email: string;
  name: string;
  /** their Jollof Pages user id, when they have an account here */
  writerId: string;
  inStudio: boolean;
  suspended: boolean;
  apps: { studio: boolean; aiWriter: boolean };
};

export const STUDIO_ADMIN_URL = "https://studio.jollofpages.com/admin";
