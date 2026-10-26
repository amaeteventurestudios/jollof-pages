# Self-hosting Jollof Pages

One small Linux server runs everything: PocketBase (data, logins and files) and the Next.js app
in Docker, behind the host's Caddy for HTTPS. The production server is the Contabo box at
169.58.77.98, which also hosts AuthorNX; both apps share one Caddy, one file per site in
`/etc/caddy/sites/`. A 2 vCPU / 4 GB machine is plenty. Any of your providers works:

- **Hetzner**: a CX22 or CAX11 (Arm) in the Cloud Console.
- **Contabo**: the smallest Cloud VPS.
- **Oracle Cloud**: the Always Free Ampere A1 shape (Arm). Open ports 80 and 443 in both the
  VCN security list and the instance firewall (`sudo iptables -I INPUT -p tcp -m multiport --dports 80,443 -j ACCEPT`).

The images build for x86 and Arm.

## 1. DNS

Point two records at the server's IP:

| Name | Type | Value |
| --- | --- | --- |
| `jollofpages.com` | A | server IP |
| `pb.jollofpages.com` | A | server IP |

`pb.` serves PocketBase. The browser talks to it directly for the studio, and Caddy gets
certificates for both names automatically.

## Ports on the shared server

| Service | Listens on | Public name |
| --- | --- | --- |
| Jollof Pages web | 127.0.0.1:3100 | jollofpages.com |
| Jollof Pages PocketBase | 127.0.0.1:8096 | pb.jollofpages.com |
| AuthorNX PocketBase | 127.0.0.1:8097 | db.authornx.jollofpages.com |

Nothing but Caddy listens on 80 and 443.

## 2. Install Docker and Caddy, start the stack

```bash
curl -fsSL https://get.docker.com | sh
apt install -y caddy                       # skip if AuthorNX already installed it
mkdir -p /etc/caddy/sites
grep -q 'import /etc/caddy/sites/\*' /etc/caddy/Caddyfile || echo 'import /etc/caddy/sites/*' >> /etc/caddy/Caddyfile

git clone https://github.com/amaeteventurestudios/jollof-pages.git /opt/jollof-pages && cd /opt/jollof-pages
cp .env.example .env        # set SITE_DOMAIN and PB_DOMAIN
docker compose up -d --build
cp deploy/jollofpages.caddy /etc/caddy/sites/ && systemctl reload caddy
```

## 3. Create the admin and your studio login

```bash
docker compose exec pocketbase /pb/pocketbase superuser upsert admin@example.com 'a-long-password' --dir /pb/pb_data
```

Then, from your own computer (with the repo checked out and `npm install` done):

```bash
PB_URL=https://pb.jollofpages.com \
PB_SUPERUSER_EMAIL=admin@example.com PB_SUPERUSER_PASSWORD='a-long-password' \
OWNER_EMAIL=you@example.com OWNER_PASSWORD='another-long-password' OWNER_NAME="Amaete Umanah" \
npm run seed
```

Sign in at `https://jollofpages.com/studio`. Public sign-up is closed; only the accounts you
create can use the studio.

The PocketBase dashboard is at `https://pb.jollofpages.com/_/` for backups and settings. In
**Settings > Backups** turn on daily backups, and ideally send them to S3-compatible storage
(Hetzner and Oracle both offer it).

## Updating

```bash
git pull && docker compose up -d --build
```

Schema changes ship as migrations in `pocketbase/pb_migrations` and apply when PocketBase starts.

## AuthorNX

AuthorNX is a separate product on the same server. Its PocketBase runs as the systemd service
`authornx-pocketbase` on 127.0.0.1:8097 with its own file in `/etc/caddy/sites/`; its web app is
on Vercel at `authornx.jollofpages.com`. Keep the two apps' ports and site files separate.
