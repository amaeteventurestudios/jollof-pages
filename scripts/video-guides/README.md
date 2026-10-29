# Video guides

The short videos on the studio's Learn page (`/studio/learn#videos`) are recorded from the real
studio by a script, so they can be recorded again whenever a screen changes.

- `src/lib/video-guides.ts` lists the videos: title, summary, group and the written guide each belongs to.
- `scenes.ts` says what each video shows: which page it opens, what it clicks and types, and the captions.
- `director.ts` drives the page with Playwright and draws the cursor, click ripples, highlight ring,
  caption bar and title card into it. It records with the Chrome screencast, which keeps text sharp.
- `record.ts` runs the scenes and writes `public/learn/videos/<id>.mp4` (1920 x 1200, H.264),
  `<id>.jpg` (poster) and `<id>.vtt` (captions), and each length to `src/lib/video-guides.json`.

Nothing here runs in production. The videos are plain files served from `public/`.

## Recording

You need FFmpeg, and Chromium for Playwright (`npx playwright install chromium`).

1. Run a local studio with the demo books, a stand-in AI and some made-up activity. Use a local
   PocketBase, never the live one.

   ```bash
   npm run videos:mock-ai &                       # stand-in for the Anthropic API on :3999
   # in .env.local: ASSISTANT_ANTHROPIC_URL=http://127.0.0.1:3999 and COVER_AI_FREE_EMAILS=<owner email>
   npm run seed -- --demo
   npm run videos:demo-data                       # writing days, readers and site visits
   npm run build && npm start                     # a production build: no dev badge in the videos
   ```

   `ASSISTANT_ANTHROPIC_URL` must be set before `npm run build`, because the build bakes it in.

2. Record every video, or just the ones you name:

   ```bash
   npm run videos
   npm run videos -- export format
   ```

   Some videos change the demo book (typing, accepting changes). Set `VIDEO_RESET` to a command
   that restores the seeded PocketBase data and it runs before each video, so no video shows
   another one's edits.

3. Watch the new files, then commit them.

## Adding a video

Add an entry to `VIDEO_GUIDES` in `src/lib/video-guides.ts` and a scene with the same id in
`scenes.ts`. Keep captions to one idea each, in plain words. `d.say()` holds each caption long
enough to read; `d.click()`, `d.type()` and `d.point()` move the visible cursor first.
