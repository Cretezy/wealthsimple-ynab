#!/usr/bin/env bash
# Regenerates the store screenshots and promo images in store-assets/.
# Requires: pnpm deps installed, python3, agent-browser.
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SRC/../.." && pwd)"
OUT="$(cd "$SRC/.." && pwd)"
SITE="$(mktemp -d)"
PORT="${PORT:-4317}"
SESSION="store-assets"

(cd "$ROOT" && pnpm build >/dev/null)

# Built popup + mock APIs injected before the app bundle loads
cp -r "$ROOT/.output/chrome-mv3" "$SITE/popup"
cp "$SRC/mock.js" "$SITE/popup/mock.js"
sed -i 's|<script type="module"|<script src="/popup/mock.js"></script><script type="module"|' "$SITE/popup/popup.html"
sed -i 's|="/chunks/|="/popup/chunks/|; s|="/assets/|="/popup/assets/|' "$SITE/popup/popup.html"
# Popup bundle references its icons from the extension root
cp -r "$SITE/popup/icon" "$SITE/icon"
cp "$SRC"/*.html "$SRC"/*.css "$SITE/"

python3 -m http.server "$PORT" -d "$SITE" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER; agent-browser --session "$SESSION" close >/dev/null 2>&1 || true; rm -rf "$SITE"' EXIT
sleep 1

ab() { agent-browser --session "$SESSION" "$@" >/dev/null; }

shot() { # width height url output
  ab set viewport "$1" "$2"
  ab open "http://localhost:$PORT/$3"
  ab wait --fn 'document.documentElement.getAttribute("data-ready") === "1"'
  ab wait 300
  ab screenshot "$OUT/$4"
  echo "wrote $4"
}

enc() { python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1]))' "$1"; }

frame() { # state title sub output
  shot 1280 800 "frame.html?state=$1&title=$(enc "$2")&sub=$(enc "$3")" "$4"
}

frame connect \
  'Connect to YNAB <span class="accent">in one click</span>' \
  "Authorize with YNAB OAuth, or paste a personal access token if you prefer." \
  screenshot-1-connect.png
frame dashboard \
  'Select your card, budget, and account &mdash; <span class="accent">then sync</span>' \
  "Your signed-in Wealthsimple session is detected automatically. No exports, no passwords." \
  screenshot-2-settings.png
frame preview \
  'Preview transactions <span class="accent">before they hit your budget</span>' \
  "Dry-run any date range to check payees and amounts before importing." \
  screenshot-3-preview.png
frame result \
  'See exactly what was <span class="accent">created or updated</span>' \
  "Re-syncing is always safe: stable import IDs prevent duplicates, and pending charges clear once they settle." \
  screenshot-4-sync-done.png

shot 440 280 "promo.html?size=small" promo-small-440x280.png
shot 1400 560 "promo.html?size=marquee" promo-marquee-1400x560.png
