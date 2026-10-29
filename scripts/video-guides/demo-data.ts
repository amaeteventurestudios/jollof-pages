/**
 * Fills a LOCAL demo studio with made-up activity so the Progress, Readers and Analytics videos
 * have something to show: 90 days of writing, a reader list and site visits. Run after
 * `npm run seed -- --demo`, never against the live server.
 */
import PocketBase from "pocketbase";

const env = (k: string, d?: string) => {
  const v = process.env[k] ?? d;
  if (!v) throw new Error(`Set ${k}`);
  return v;
};

async function main() {
  const url = env("PB_URL", "http://127.0.0.1:8090");
  if (!/127\.0\.0\.1|localhost/.test(url)) throw new Error("demo-data only runs against a local PocketBase");
  const pb = new PocketBase(url);
  await pb.collection("_superusers").authWithPassword(env("PB_SUPERUSER_EMAIL"), env("PB_SUPERUSER_PASSWORD"));
  const owner = await pb.collection("users").getFirstListItem(pb.filter("email = {:e}", { e: env("OWNER_EMAIL") }));
  const book = await pb.collection("books").getFirstListItem(pb.filter("owner = {:o} && title = 'The Long Table'", { o: owner.id }));

  // a steady-ish run of writing days, with a current streak
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const day = (ago: number) => new Date(Date.now() - ago * 86400000).toISOString().slice(0, 10);
  for (let ago = 89; ago >= 0; ago--) {
    if (ago > 12 && rand() < 0.3) continue;
    await pb.collection("writing_log").create({ owner: owner.id, book: book.id, date: day(ago), words: Math.round(300 + rand() * 1400), minutes: Math.round(20 + rand() * 70) });
  }

  const names = ["ada", "kemi", "tunde", "ngozi", "femi", "zainab", "chidi", "amaka", "segun", "yemi", "efosa", "ifeoma", "bola", "uche", "dami", "temi", "kunle", "sade"];
  for (const [i, n] of names.entries()) {
    await pb.collection("subscribers").create({ owner: owner.id, email: `${n}${i}@example.com`, source: i % 3 ? "/books/the-long-table" : "/" });
  }

  const pages = ["/", "/books/the-long-table", "/books/small-pot-big-fire", "/books", "/about", "/books/owning-your-words"];
  const refs = ["google.com", "instagram.com", "x.com", "facebook.com", "goodreads.com"];
  const stores = ["Amazon", "Apple Books", "Kobo"];
  const rows: { date: string; kind: string; key: string; count: number }[] = [];
  for (let ago = 89; ago >= 0; ago--) {
    const base = 40 + Math.round((89 - ago) * 0.9 + rand() * 30);
    rows.push({ date: day(ago), kind: "visitor", key: "", count: base });
    pages.forEach((p, i) => rows.push({ date: day(ago), kind: "view", key: p, count: Math.round((base * 1.6) / (i + 1) + rand() * 6) }));
    refs.forEach((r, i) => rows.push({ date: day(ago), kind: "ref", key: r, count: Math.round(base / (i + 2) / 2 + rand() * 3) }));
    stores.forEach((s, i) => rows.push({ date: day(ago), kind: "buy_click", key: s, count: Math.round(base / (i + 3) / 3 + rand() * 2) }));
    rows.push({ date: day(ago), kind: "signup", key: "/books/the-long-table", count: Math.round(rand() * 3) });
  }
  // a few at a time keeps it quick without flooding PocketBase
  for (let i = 0; i < rows.length; i += 25) await Promise.all(rows.slice(i, i + 25).map((r) => pb.collection("site_stats").create({ owner: owner.id, ...r }, { requestKey: null })));
  console.log(`Demo activity added: ${rows.length} stats rows, ${names.length} readers`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
