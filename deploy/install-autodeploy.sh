#!/usr/bin/env bash
# One-time setup: the server checks GitHub every two minutes and rebuilds itself after a push.
#   sudo bash deploy/install-autodeploy.sh
# See what it has done:  journalctl -u jollof-autodeploy -n 50
# Turn it off:           systemctl disable --now jollof-autodeploy.timer
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cat > /etc/systemd/system/jollof-autodeploy.service <<UNIT
[Unit]
Description=Update Jollof Pages from GitHub when there are new commits
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=oneshot
Environment=APP_DIR=$APP_DIR
ExecStart=/usr/bin/env bash $APP_DIR/deploy/autodeploy.sh
TimeoutStartSec=30min
UNIT

cat > /etc/systemd/system/jollof-autodeploy.timer <<UNIT
[Unit]
Description=Check GitHub for Jollof Pages updates every two minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=2min
Unit=jollof-autodeploy.service

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now jollof-autodeploy.timer
echo "Auto-update is on. The site rebuilds itself within a few minutes of every push."
echo "Check it with: journalctl -u jollof-autodeploy -n 50"
