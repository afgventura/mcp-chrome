#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This installer currently supports macOS only." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20 or newer is required." >&2
  exit 1
fi

node_major="$(node -p 'process.versions.node.split(".")[0]')"
if (( node_major < 20 )); then
  echo "Node.js 20 or newer is required; found $(node --version)." >&2
  exit 1
fi

if ! command -v corepack >/dev/null 2>&1; then
  echo "Corepack is required. Install it with: npm install -g corepack" >&2
  exit 1
fi

pnpm_cmd=(corepack pnpm@8.15.9)

echo "Installing locked dependencies without lifecycle scripts..."
"${pnpm_cmd[@]}" install --frozen-lockfile --ignore-scripts

echo "Building shared package and Chrome extension..."
"${pnpm_cmd[@]}" run build:shared
"${pnpm_cmd[@]}" --filter chrome-mcp-server exec wxt prepare
"${pnpm_cmd[@]}" run build:extension
node scripts/verify-extension-identity.mjs

echo "Building and registering the native bridge..."
"${pnpm_cmd[@]}" run build:native
"${pnpm_cmd[@]}" --filter mcp-chrome-bridge run register:dev

extension_dir="$repo_root/app/chrome-extension/.output/chrome-mv3"
echo
echo "Install complete."
echo "Extension ID: gmolioeebfppjehkofcpiefglimgdbog"
echo "Load this unpacked extension directory in Chrome:"
echo "$extension_dir"
