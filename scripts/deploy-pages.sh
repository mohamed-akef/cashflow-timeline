#!/usr/bin/env sh
# Publish the production build to the gh-pages branch, which GitHub Pages
# serves at https://mohamed-akef.github.io/cashflow-timeline/.
# Run from any checkout: pnpm deploy:pages
# (Deploys are local rather than a GitHub Actions workflow because the
# repository token lacks the `workflow` scope.)
set -eu
cd "$(dirname "$0")/.."
pnpm build
origin=$(git remote get-url origin)
source_sha=$(git rev-parse --short HEAD)
stage=$(mktemp -d)
cp -R dist/. "$stage"
git -C "$stage" init -q -b gh-pages
git -C "$stage" add -A
git -C "$stage" commit -qm "deploy: $source_sha"
# gh-pages holds build output only, so each deploy replaces its history.
git -C "$stage" push -f "$origin" gh-pages
rm -rf "$stage"
echo "Published $source_sha to gh-pages"
