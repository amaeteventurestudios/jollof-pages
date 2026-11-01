#!/usr/bin/env bash
# Downloads the local tools Jollof Pages needs (all permissively licensed) into ./tools, ./fonts
# and ./pocketbase. Safe to re-run. Linux x86_64/arm64 and macOS.
#   PocketBase (MIT)      database, auth and file storage
#   Typst (Apache-2.0)    print PDF typesetting
#   EPUBCheck (BSD-3)     EPUB validation (needs Java 11+)
#   Fonts (SIL OFL 1.1)   interior typefaces, from Google Fonts
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PB_VERSION="${PB_VERSION:-0.40.6}"
TYPST_VERSION="${TYPST_VERSION:-0.15.1}"
EPUBCHECK_VERSION="${EPUBCHECK_VERSION:-5.4.0}"
mkdir -p "$ROOT/tools" "$ROOT/fonts" "$ROOT/pocketbase"

os="$(uname -s | tr '[:upper:]' '[:lower:]')"
arch="$(uname -m)"
case "$arch" in x86_64|amd64) pb_arch=amd64; ty_arch=x86_64 ;; aarch64|arm64) pb_arch=arm64; ty_arch=aarch64 ;; *) echo "unsupported arch $arch"; exit 1 ;; esac

if [ ! -x "$ROOT/pocketbase/pocketbase" ]; then
  echo "PocketBase $PB_VERSION"
  curl -fsSL -o /tmp/pb.zip "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_${os}_${pb_arch}.zip"
  unzip -oq /tmp/pb.zip pocketbase -d "$ROOT/pocketbase" && rm /tmp/pb.zip
fi

if [ ! -x "$ROOT/tools/typst" ]; then
  echo "Typst $TYPST_VERSION"
  if [ "$os" = "darwin" ]; then target="${ty_arch}-apple-darwin"; else target="${ty_arch}-unknown-linux-musl"; fi
  curl -fsSL "https://github.com/typst/typst/releases/download/v${TYPST_VERSION}/typst-${target}.tar.xz" | tar xJ -C /tmp
  mv "/tmp/typst-${target}/typst" "$ROOT/tools/typst" && rm -rf "/tmp/typst-${target}"
fi

if [ ! -f "$ROOT/tools/epubcheck/epubcheck.jar" ]; then
  echo "EPUBCheck $EPUBCHECK_VERSION"
  curl -fsSL -o /tmp/epubcheck.zip "https://github.com/w3c/epubcheck/releases/download/v${EPUBCHECK_VERSION}/epubcheck-${EPUBCHECK_VERSION}.zip"
  unzip -oq /tmp/epubcheck.zip -d /tmp && rm -rf "$ROOT/tools/epubcheck" && mv "/tmp/epubcheck-${EPUBCHECK_VERSION}" "$ROOT/tools/epubcheck" && rm /tmp/epubcheck.zip
fi

# Google Fonts serves TTF to old user agents; Typst needs TTF/OTF.
fetch_family() {
  local family="$1" spec="$2" file="$3"
  if ls "$ROOT/fonts/${file}"-[0-9]*.ttf >/dev/null 2>&1; then return; fi
  echo "Font: $family"
  local css i=0
  css="$(curl -fsSL -A "Mozilla/4.0" "https://fonts.googleapis.com/css2?family=${spec}")"
  echo "$css" | awk '/font-style/{style=$2} /font-weight/{w=$2} /src:/{match($0,/https:[^)]+\.ttf/); print substr($0,RSTART,RLENGTH), style, w}' | tr -d ';' |
    while read -r url style weight; do
      curl -fsSL -o "$ROOT/fonts/${file}-${weight}-${style}.ttf" "$url"
    done
}
while IFS='|' read -r family axes file; do
  case "$family" in ''|'#'*) continue ;; esac
  fetch_family "$family" "${family// /+}:${axes}" "$file"
done < "$ROOT/scripts/fonts.txt"
echo "Tools ready."
