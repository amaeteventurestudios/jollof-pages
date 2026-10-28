import "server-only";
import { adminPb } from "./credits";

/** Takes a reader off an author's list by the token in their newsletter. Returns the author's site name. */
export async function unsubscribe(token: string): Promise<string | null> {
  if (!/^[A-Za-z0-9]{20,64}$/.test(token)) return null;
  const pb = await adminPb();
  const row = await pb
    .collection("subscribers")
    .getFirstListItem<{ id: string; owner: string }>(pb.filter("token = {:t}", { t: token }))
    .catch(() => null);
  if (!row) return null;
  await pb.collection("subscribers").update(row.id, { unsubscribed: true });
  const site = await pb
    .collection("site_settings")
    .getFirstListItem<{ publisher_name: string }>(pb.filter("owner = {:o}", { o: row.owner }))
    .catch(() => null);
  return site?.publisher_name || "this author";
}
