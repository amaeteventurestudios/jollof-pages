# AI cover art

Writers make cover artwork from the **Cover** tab ("Make artwork with AI"). The studio writes
the prompt from the book (title, description, the writer's idea, a style) and the cover
colours picked in the designer. The writer can edit it, and the result drops onto the front or
back of the cover designer.

## Pricing

Pay as you go, no subscription. Credits never expire, and failed pictures are refunded.

| Pack | Credits | Drafts (2 cr) | Print-ready 4K (4 cr) |
| --- | --- | --- | --- |
| $10 | 100 | 50 | 25 |
| $25 | 250 | 125 | 62 |
| $50 | 500 | 250 | 125 |

One credit is $0.04 of model spend, so $4 of every $10 goes to the image model. Stripe's fee
(about $0.59 on $10) comes out of the remaining $6. Model prices are in `src/lib/cover-ai.ts`
(`QUALITY`): Nano Banana 2 on fal.ai costs $0.08 at 1K and $0.16 at 4K. If fal.ai changes
its prices, change them there and the credit costs follow.

A 4K picture at 2:3 is large enough for a 6 x 9 in KDP front (1838 x 2775 px at 300 dpi).
A draft (about 1000 px) is for trying ideas. "Make 4K" remakes a draft at print size.

## Test mode

With no `FAL_KEY` the studio draws labelled sample pictures. With no `STRIPE_SECRET_KEY` the
top-up buttons add free test credits, but only while pictures are also samples, so nothing real
is ever free.

## Setting it up on the server

Add these lines to `/opt/jollof-pages/.env`, then run
`cd /opt/jollof-pages && docker compose -f docker-compose.yml -f docker-compose.override.yml up -d`.

| Variable | Value |
| --- | --- |
| `PB_SUPERUSER_EMAIL` | the PocketBase admin login (in `/root/jollof-pages-credentials.txt`) |
| `PB_SUPERUSER_PASSWORD` | its password |
| `FAL_KEY` | fal.ai key, from fal.ai → Dashboard → Keys → Add key (scope: API) |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → Secret key (`sk_test_…` first, `sk_live_…` to sell) |
| `STRIPE_WEBHOOK_SECRET` | the endpoint's signing secret (`whsec_…`), see below |
| `COVER_AI_FREE_EMAILS` | logins that never pay, comma separated, such as the publisher's own |

Stripe webhook: Stripe → Developers → Webhooks → Add endpoint.

| Field | Value |
| --- | --- |
| Endpoint URL | `https://jollofpages.com/api/credits/webhook` |
| Events | `checkout.session.completed`, `checkout.session.async_payment_succeeded` |

The webhook is a backstop: the studio also confirms the payment when the writer returns from
Stripe. A payment is credited once, whichever arrives first.

## How it is built

- `pocketbase/pb_migrations/1761470000_cover_ai.js`: `credit_ledger` (balance = sum of
  `delta`) and `cover_generations`. Writers can read their rows and never write them.
- `src/app/api/credits/*`: balance, Stripe Checkout, return-page confirm, webhook.
- `src/app/api/covers/generate`: charges, calls fal.ai's queue API, stores the picture in
  PocketBase, and refunds on failure.
- `src/components/studio/book/ai-cover-panel.tsx`: the panel on the Cover tab.
