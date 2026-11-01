/**
 * A stand-in for the Anthropic API while recording the video guides, so the writing assistant
 * and the Suggest buttons have something to show without a real key or real spend. Answers are
 * written for the demo book "The Long Table". Start the Desk with
 * ASSISTANT_ANTHROPIC_URL=http://127.0.0.1:3999 and save any key starting "sk-ant-" in the
 * assistant's settings.
 */
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_AI_PORT ?? 3999);

const lines = (xs: string[]) => xs.join("\n");
const ANSWERS: [RegExp, string][] = [
  [/book titles/, lines(["Salt and Smoke", "The Pepper Soup Diaries", "What We Cook for Love", "A Pot on Every Fire", "Supper at Six", "Recipes My Mother Never Wrote Down"])],
  [/subtitles/, lines(["Recipes and stories from my mother's kitchen", "Essays on food, family and the meals that hold us together", "A cook's memoir of home, hunger and belonging", "How one family table fed three generations", "Stories of the dishes that made us"])],
  [/pen names/, lines(["Adaeze Okafor", "Kemi Adeyinka", "Tola Ekanem", "Ngozi Bassey", "Ifeoma Duke", "Bisi Etim"])],
  [/hooks/, lines(["Every family has a table. This is the story of ours, and the meals that kept us talking when nothing else could.", "Forty years of Sunday lunches, one stubborn grandmother and the recipes she swore she would never write down.", "A love letter to the cooks who feed us, told one dish at a time.", "What happens to a family when the person who cooked for everyone is gone?"])],
  [/descriptions/, "Some families talk. Ours ate.\n\nIn The Long Table, the author sets a place for every relative who ever crowded around their grandmother's dining table in Calabar, and tells the story of the meals that held them together through weddings, funerals and forty years of Sunday lunches.\n\nPart memoir, part cookbook, these essays move from the smoke of the first morning fire to the last plate of pepper soup, with recipes no one ever wrote down until now.\n\nPull up a chair. There is always room for one more.\n\n\nA table is never just a table.\n\nThese warm, funny essays follow one family's meals across three generations, from market mornings to midnight feasts, and the recipes that carried their history.\n\nFor anyone who has ever been fed by someone who loved them."],
  [/keyword phrases/, lines(["nigerian food memoir", "family recipes and stories", "west african cooking essays", "books about grandmothers cooking", "food writing about home", "calabar recipes", "gifts for people who love cooking"])],
  [/categories/, lines(["Biographies & Memoirs > Memoirs", "Cookbooks, Food & Wine > Regional & International > African", "Literature & Fiction > Essays & Correspondence > Essays"])],
  [/cover picture/, lines(["A long wooden table seen from above at golden hour, crowded with steaming bowls, hands reaching in from every side.", "A single enamel pot on an open wood fire at dusk, smoke curling into an orange sky.", "An empty chair pulled out at the head of a laid table, a folded wrapper on its back, warm window light."])],
  [/chapter outline/, lines(["The First Fire", "Market Mornings", "My Grandmother's Hands", "Pepper Soup for Every Sorrow", "The Sunday Rule", "Recipes Nobody Wrote Down", "Feeding the Wedding", "The Year We Ate Apart", "Learning to Cook Alone", "Small Pots, Big Feasts", "Setting a Place for the Dead", "The Table Goes On"])],
];
const CHAT =
  "Here are three ways to make the opening of this chapter stronger:\n\n1. Start in the scene. Open on your grandmother lifting the lid of the pot, not on the idea of the promise. Readers lean in when they can see something.\n\n2. Name the reader sooner. Your second paragraph says who this book is for. Bring one line of it into the first paragraph.\n\n3. Cut the throat-clearing. The sentence beginning \"Most first-time authors\" can go; the next one says the same thing with more energy.\n\nWould you like me to draft a new opening paragraph using the first idea?";

function answer(body: { messages?: { content: unknown }[] }) {
  const last = JSON.stringify(body.messages?.at(-1)?.content ?? "");
  return ANSWERS.find(([re]) => re.test(last))?.[1] ?? CHAT;
}

createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", async () => {
    if (req.method === "GET" && req.url?.startsWith("/v1/models")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ data: [{ id: "claude-sonnet-5-5", display_name: "Claude Sonnet 5.5" }, { id: "claude-opus-5-5", display_name: "Claude Opus 5.5" }, { id: "claude-haiku-5-5", display_name: "Claude Haiku 5.5" }], has_more: false }));
      return;
    }
    if (req.method !== "POST" || !req.url?.startsWith("/v1/messages")) {
      res.writeHead(404).end();
      return;
    }
    const text = answer(JSON.parse(raw || "{}"));
    res.writeHead(200, { "content-type": "text/event-stream" });
    const send = (j: object) => res.write(`data: ${JSON.stringify(j)}\n\n`);
    send({ type: "message_start" });
    // stream a few words at a time so the reply types out on screen
    for (const chunk of text.match(/\S+\s*/g) ?? []) {
      send({ type: "content_block_delta", delta: { type: "text_delta", text: chunk } });
      await new Promise((r) => setTimeout(r, 35));
    }
    send({ type: "message_stop" });
    res.end();
  });
}).listen(PORT, "127.0.0.1", () => console.log(`mock AI on http://127.0.0.1:${PORT}`));
