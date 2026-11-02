#!/usr/bin/env bash
# (Re)link node_modules/@earendil-works/* to the locally installed pi
# packages so tsc can typecheck against real pi types.
# bunfig.toml keeps bun from installing these from the registry (pi hosts
# them at runtime; a physical copy would break pi's module mapping).
set -euo pipefail
cd "$(dirname "$0")/.."

find_pkg() {
	local name="$1" d
	d=$(
		{
			ls -d /opt/homebrew/Cellar/pi-coding-agent/*/libexec/lib/node_modules/@earendil-works/"$name" 2>/dev/null
			ls -d /opt/homebrew/Cellar/pi-coding-agent/*/libexec/lib/node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/"$name" 2>/dev/null
		} | sort -Vu | tail -1
	)
	if [ -z "$d" ]; then
		echo "error: @earendil-works/$name not found under Homebrew pi-coding-agent" >&2
		exit 1
	fi
	printf '%s\n' "$d"
}

mkdir -p node_modules/@earendil-works
for pkg in pi-coding-agent pi-tui; do
	ln -sfn "$(find_pkg "$pkg")" "node_modules/@earendil-works/$pkg"
done

echo "Linked dev packages:"
ls -l node_modules/@earendil-works
