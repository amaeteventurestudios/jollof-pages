# Author accounts and author sites

Every studio buyer gets a private studio and a public website, filled in from the studio:

- `ada.jollofpages.com`: free with the studio, chosen at sign-up, changeable under Studio > Website.
- `adaokafor.com`: optional, any domain the author owns, connected under Studio > Website.
- `jollofpages.com` stays the publisher's own site: the account whose site is marked `home`
  (the owner's, set by the `1761480000_author_accounts` migration).

## How it fits together

| Piece | Where |
| --- | --- |
| Accounts, paid/comp access, per-author rules | `pocketbase/pb_migrations/1761480000_author_accounts.js` |
| Host → site routing (`ada.jollofpages.com/books/x` → `/sites/ada/books/x`) | `src/proxy.ts`, `src/lib/sites.ts` |
| Author home page | `src/app/(site)/sites/[site]/page.tsx` (book pages reuse `/books/[slug]`) |
| Sign-up and the $129 payment | `/signup`, `src/app/api/accounts/*`, `src/lib/server/accounts.ts` |
| Address, own domain, Caddy's certificate check | `src/app/api/sites/*` |
| Reader lists, one per author | `src/app/api/subscribe/route.ts` |
| Add a published book by ISBN (Open Library) | `src/app/api/books/isbn/route.ts`, `src/components/studio/isbn-dialog.tsx` |

Books, pen names and reader lists belong to one account each. Readers who join on an author's
site land on that author's list, which only that author can read.

## Server settings (`/opt/jollof-pages/.env`)

| Name | Value | What it does |
| --- | --- | --- |
| `STUDIO_SIGNUP` | `paid`, `free` or `closed` | `paid`: sign up, then pay through Stripe. `free`: no payment (beta). `closed`: no sign-up. Unset = `paid` when `STRIPE_SECRET_KEY` is set, else `closed`. |
| `ROOT_DOMAIN` | `jollofpages.com` | Optional; defaults to the host of `SITE_URL`. |
| `PB_SUPERUSER_EMAIL`, `PB_SUPERUSER_PASSWORD` | as for AI covers | Needed: sign-up creates accounts as a superuser. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | as for AI covers | The same webhook (`/api/credits/webhook`) also opens paid studios. |

Give someone a free account: in the PocketBase dashboard, open their user and set `access` to `comp`.

## DNS (Cloudflare)

| Type | Name | Content | Proxy status | TTL |
| --- | --- | --- | --- | --- |
| A | `*` | `169.58.77.98` | DNS only (grey cloud) | Auto |

Cloudflare: dash.cloudflare.com → jollofpages.com → DNS → Records → Add record. Existing records
(`@`, `www`, `pb`, `authornx`, `authornx-db`) win over the wildcard, so nothing else changes.

## Certificates (Caddy on-demand TLS)

Each author name gets its own Let's Encrypt certificate on its first visit, so there is no
Cloudflare API token and no custom Caddy build. Caddy first asks the app whether the name is a
real site (`/api/sites/tls?domain=…` answers 200 or 404), so nobody can make it issue
certificates for made-up names. The same block serves authors' own domains.

In the front door's Caddyfile (`/opt/front-door/config/Caddyfile`), the **global options block
must be the first thing in the file**:

```caddy
{
	on_demand_tls {
		ask http://JOLLOF_WEB/api/sites/tls
	}
}
```

and at the end, after every other site block:

```caddy
https:// {
	tls {
		on_demand
	}
	encode zstd gzip
	reverse_proxy JOLLOF_WEB
}
```

Replace `JOLLOF_WEB` with the address the existing `jollofpages.com` block already proxies to
(on the front door's Docker network that is the web container's name and port 3000). If a
global options block is already there, add the `on_demand_tls` lines inside it. Then reload:
`docker exec <front-door container> caddy reload --config /etc/caddy/Caddyfile`.

Check: `curl -I https://<an author's subdomain>.jollofpages.com` returns 200 after a few seconds.

## Author Site Pro

$10 a month or $96 a year through Stripe (`src/lib/server/pro.ts`, `src/components/studio/pro-panel.tsx`).
Pro sets `site_settings.pro_until` to the end of the paid period plus three days, so an own domain,
newsletters, direct sales and full analytics switch off by themselves if payment stops. The publisher's
home site always has Pro. Each part stays hidden or marked "coming soon" until its keys are set.

| Part | Needs | Code |
| --- | --- | --- |
| Pro billing | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | `api/pro/*`, `lib/server/webhooks.ts` |
| Free .com, year one (yearly plan, once per account) | `NAMECOM_USERNAME`, `NAMECOM_TOKEN` | `lib/server/namecom.ts`, `api/domains/*` |
| Newsletters | `RESEND_API_KEY`, `MAIL_FROM_DOMAIN` | `api/newsletters/send`, `studio/readers` |
| Sell ebooks direct | Stripe Connect turned on | `api/payouts/onboard`, `api/ebooks/*`, `/download` |
| Analytics | nothing | `api/a`, `components/site/beacon.tsx`, `studio/stats` |

### Stripe settings

1. **Webhook** (Developers → Webhooks → your `https://jollofpages.com/api/credits/webhook` endpoint →
   Edit): listen to `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `invoice.paid`, `customer.subscription.updated` and `customer.subscription.deleted`.
2. **Customer portal** (Settings → Billing → Customer portal): allow cancelling and updating the card.
   The studio's "Manage plan" button opens it.
3. **Connect** (Connect → Get started, platform type "Platform or marketplace", Express accounts):
   needed for direct ebook sales. Readers pay on Jollof Pages' Checkout; Stripe sends the price minus
   `EBOOK_FEE_PERCENT` + `EBOOK_FEE_FIXED_CENTS` to the author's own account.

### The free .com

When the yearly plan is paid, the webhook registers the domain at Name.com in the author's name with
WHOIS privacy and auto-renew on, adds `A @ → SERVER_IP` and `CNAME www → domain`, and connects it
to the site; Caddy issues the certificate on the first visit. Only `FREE_DOMAIN_TLDS` under
`FREE_DOMAIN_MAX_CENTS` qualify (no premium names). Auto-renew is turned off if Pro is cancelled,
so the author keeps the domain for the year and can transfer it out. Renewals are billed to the Name.com
account; about $18 a year at current prices. Test first with `NAMECOM_API=https://api.dev.name.com`.

### Newsletters

Sent from `<subdomain>@MAIL_FROM_DOMAIN` with replies going to the author's own email, with a one-click
unsubscribe link and header. In Resend, add `MAIL_FROM_DOMAIN` (Domains → Add) and put the DNS records
it shows into Cloudflare (DNS only).

All authors send through the one Resend account, so each Pro author has a monthly allowance
(`NEWSLETTER_MONTHLY_EMAILS`, default 5,000; one email per reader per send) that refills on the 1st
(UTC). Use is summed from that month's sent newsletters. On top of it authors can buy packs of extra
emails (`EMAIL_PACKS` in `src/lib/email-quota.ts`: 10,000 for $6, 100,000 for $54) through Stripe
Checkout (`kind=email-credits`); bought emails live in `email_ledger`, never expire and are used
after the allowance. A send that does not fit is refused before anything goes out. Accounts in
`COVER_AI_FREE_EMAILS` send without a limit. `RESEND_API_URL` points at a test double locally.

### Analytics

No cookies. Every page of a public site sends one beacon to `/api/a`; the server counts views per
page, referring site, store-button clicks, sign-ups and sales per day in `site_stats`. A visitor is
counted once a day from a salted hash that is never stored. The free plan sees visitors and page views.

## Later

- ASIN lookup needs Amazon's Product Advertising API (an approved Associates account); until then
  authors paste their Amazon link next to the ISBN.
