/// <reference path="../pb_data/types.d.ts" />

/**
 * Books an author deleted sit in Trash for 30 days so a slip can be undone. Every night at 03:15
 * the ones older than that are deleted for good (their chapters and files go with them).
 */
cronAdd("jp_trash_purge", "15 3 * * *", () => {
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().replace("T", " ");
  const old = $app.findRecordsByFilter("books", "trashed != '' && trashed < {:cut}", "", 500, 0, { cut: cutoff });
  for (const r of old) {
    try {
      $app.delete(r);
    } catch (e) {
      console.log("trash purge: could not delete book " + r.id + ": " + e);
    }
  }
});
