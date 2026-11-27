#!/usr/bin/env bash
# Builds the "Why is the Sky Blue?" explainer (the blue-sky-why repo) into
# public/why-is-the-sky-blue/, where Create React App copies it into the site
# build: served at /why-is-the-sky-blue/. The output is committed (like
# public/huebrew), so Vercel needs no access to the blue-sky-why repo.
#
#   npm run build:sky                          # uses ../blue-sky-why
#   SKY_DIR=/path/to/blue-sky-why npm run build:sky
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${SKY_DIR:-$ROOT/../blue-sky-why}"

if [ ! -x "$SRC/scripts/build.sh" ]; then
  echo "blue-sky-why repo not found at $SRC" >&2
  echo "Set SKY_DIR to its path." >&2
  exit 1
fi

"$SRC/scripts/build.sh" "$ROOT/public/why-is-the-sky-blue"
echo "blue-sky-why: from $(git -C "$SRC" rev-parse --short HEAD) on $(git -C "$SRC" branch --show-current)$(git -C "$SRC" diff --quiet HEAD -- || echo ' + uncommitted changes')"
