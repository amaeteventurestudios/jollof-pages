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
| Sign-up and the $119 payment | `/signup`, `src/app/api/accounts/*`, `src/lib/server/accounts.ts` |
| Address, own domain, Caddy's certificate check | `src/app/api/sites/*` |
| Reader lists, one per author | `src/app/api/subscribe/route.ts` |
| Add a published book by ISBN (Open Library) | `src/app/api/books/isbn/route.ts`, `src/components/studio/isbn-dialog.tsx` |

Books, pen names and reader lists belong to one account each. Readers who join on an author's
site land on that author's list, which only that author can read.

## Server settings (`/opt/jollof-pages/.env`)

| Name | Value | What it does |
| --- | --- | --- |
| `STUDIO_SIGNUP` | `paid`, `free` or `closed` | `paid`: sign up, then pay through Stripe. `free`: no payment (beta). `closed`: no sign-up. Unset = `paid` when `STRIPE_SECRET_KEY` is set, else `closed`. |
| `STUDIO_PRICE_CENTS` | `11900` | The one-time price. |
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

## Later

- Buying a domain inside the studio (a registrar API, about $20 a year).
- ASIN lookup needs Amazon's Product Advertising API (an approved Associates account); until then
  authors paste their Amazon link next to the ISBN.
