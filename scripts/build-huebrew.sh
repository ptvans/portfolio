#!/usr/bin/env bash
# Builds the ColorBrewer app (github.com/ptvans/huebrew) into public/huebrew/,
# where Create React App copies it into the site build: served at /huebrew/.
# The output is committed (like public/protos), so Vercel needs no access to
# the huebrew repo.
#
#   npm run build:huebrew                      # uses ../huebrew
#   HUEBREW_DIR=/path/to/huebrew npm run build:huebrew
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${HUEBREW_DIR:-$ROOT/../huebrew}"

if [ ! -x "$SRC/scripts/build.sh" ]; then
  echo "huebrew repo not found at $SRC" >&2
  echo "Clone it: git clone https://github.com/ptvans/huebrew.git \"$SRC\"" >&2
  echo "or set HUEBREW_DIR to its path." >&2
  exit 1
fi

"$SRC/scripts/build.sh" "$ROOT/public/huebrew"
echo "huebrew: from $(git -C "$SRC" rev-parse --short HEAD)$(git -C "$SRC" diff --quiet HEAD -- || echo ' + uncommitted changes')"
