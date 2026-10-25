#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
variant="${1:-release}"
if [[ "$variant" != release && "$variant" != dev ]]; then
	echo "Usage: bash scripts/build.sh [release|dev]" >&2
	exit 2
fi
version="$(node -e 'process.stdout.write(JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8")).version)' "$project_dir/manifest.json")"
stage_dir="$(mktemp -d)"
trap 'rm -rf "$stage_dir"' EXIT
cp "$project_dir/manifest.json" "$project_dir/bootstrap.js" "$project_dir/LICENSE" "$stage_dir/"
cp -R "$project_dir/src" "$stage_dir/src"
suffix=""
if [[ "$variant" == dev ]]; then
	suffix="-dev"
	node -e '
		const fs = require("node:fs");
		const manifestPath = process.argv[1];
		const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
		manifest.name = `${manifest.name} (Development)`;
		manifest.applications.zotero.id = "zotpush-md-dev@local";
		fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
	' "$stage_dir/manifest.json"
fi
mkdir -p "$project_dir/dist"
output="$project_dir/dist/zotpush-md-${version}${suffix}.xpi"
if command -v zip >/dev/null 2>&1; then
	(cd "$stage_dir" && zip -q -r "$output" manifest.json bootstrap.js src LICENSE)
elif [[ -n "${WINDIR:-}" ]] && command -v cygpath >/dev/null 2>&1; then
	windows_tar="$(cygpath -u "$WINDIR/System32/tar.exe")"
	if [[ -x "$windows_tar" ]]; then
		(cd "$stage_dir" && "$windows_tar" --format zip -cf "$output" manifest.json bootstrap.js src LICENSE)
	else
		echo "A zip command is required (or Windows tar.exe on Windows)." >&2
		exit 1
	fi
else
	echo "A zip command is required (or tar.exe on Windows)." >&2
	exit 1
fi
echo "dist/zotpush-md-${version}${suffix}.xpi"
