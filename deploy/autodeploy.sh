#!/usr/bin/env bash
# Pulls the branch the server is on and rebuilds the site when there is a new commit.
# Run every two minutes by the jollof-autodeploy systemd timer (see install-autodeploy.sh).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/jollof-pages}"
cd "$APP_DIR"

# one run at a time: a build can take longer than the timer interval
exec 9>/run/jollof-autodeploy.lock
flock -n 9 || exit 0

branch="$(git rev-parse --abbrev-ref HEAD)"
git fetch -q origin "$branch"
if [ "$(git rev-parse HEAD)" = "$(git rev-parse "origin/$branch")" ]; then
  exit 0
fi

echo "New commits on $branch: $(git log --oneline HEAD.."origin/$branch" | wc -l). Updating."
git pull -q --ff-only origin "$branch"

files=(-f docker-compose.yml)
[ -f docker-compose.override.yml ] && files+=(-f docker-compose.override.yml)
docker compose "${files[@]}" up -d --build
docker image prune -f >/dev/null

# keep Caddy's copy of the site config in step, putting the old one back if Caddy rejects the new one
site=/etc/caddy/sites/jollofpages.caddy
if [ -d /etc/caddy/sites ] && command -v caddy >/dev/null && ! cmp -s deploy/jollofpages.caddy "$site"; then
  [ -f "$site" ] && cp "$site" "$site.bak"
  cp deploy/jollofpages.caddy "$site"
  if caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 && systemctl reload caddy; then
    echo "Caddy config updated."
  else
    echo "Caddy rejected the new config; keeping the old one."
    if [ -f "$site.bak" ]; then mv "$site.bak" "$site"; else rm -f "$site"; fi
    systemctl reload caddy || true
  fi
fi
echo "Now running $(git log --oneline -1)."
