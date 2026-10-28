import "server-only";
import type { Idea } from "../support";

/** A feature request as stored; voters never leave the server. */
export interface IdeaRow {
  id: string;
  owner: string;
  title: string;
  details: string;
  status: Idea["status"];
  voters: string[] | null;
  votes: number;
  response: string;
  created: string;
}

export function toIdea(r: IdeaRow, me: string): Idea {
  return {
    id: r.id,
    title: r.title,
    details: r.details,
    status: r.status || "new",
    votes: r.votes || 0,
    voted: (r.voters ?? []).includes(me),
    mine: r.owner === me,
    response: r.response,
    created: r.created,
  };
}
