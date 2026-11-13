#!/usr/bin/env bash
# Build the site and replace the copy at ../My-web.github.io/test3D (served as www.oneix.ltd/test3D/).
# Commits in the website repo; pushing is left to you.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
site="${SITE_REPO:-$here/../My-web.github.io}"
[ -d "$site/.git" ] || { echo "website repo not found at $site (set SITE_REPO)"; exit 1; }
cd "$here" && npm run build
rm -rf "$site/test3D"
cp -r "$here/dist" "$site/test3D"
cd "$site"
git add test3D
git commit -m "Update 3D portfolio at /test3D/ ($(git -C "$here" rev-parse --short HEAD))" || echo "nothing changed"
echo "Done. Push with: cd \"$site\" && git push origin Main"
