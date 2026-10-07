#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT=5116

echo "=== Concept Model ==="

# In the monorepo, app/package.json uses `workspace:` deps, which only pnpm
# understands (npm stops with EUNSUPPORTEDPROTOCOL). In the public repo,
# scripts/publish-app.sh has removed those deps, so plain npm works.
if grep -q '"workspace:' "$SCRIPT_DIR/app/package.json"; then
  if ! command -v pnpm >/dev/null 2>&1; then
    echo "This app is part of the Context Plane pnpm workspace, so it needs pnpm." >&2
    echo "Install it with: npm install -g pnpm" >&2
    exit 1
  fi
  cd "$SCRIPT_DIR/../.."
  echo "Installing dependencies (pnpm workspace)..."
  pnpm install
  echo "Starting dev server on http://localhost:$PORT ..."
  exec pnpm dev:concept-model
else
  cd "$SCRIPT_DIR/app"
  echo "Installing dependencies..."
  npm install --silent 2>/dev/null || npm install
  echo "Starting dev server on http://localhost:$PORT ..."
  exec npx vite dev --port "$PORT"
fi
