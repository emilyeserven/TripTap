#!/bin/bash
# Bootstraps the workspace so typecheck / lint / test work immediately in a fresh
# Claude Code on the web session, where the container starts with no node_modules
# and the shared @sentence-bank/types package unbuilt.
#
# Runs on the web only. Idempotent: pnpm install is a no-op when up to date, and
# rebuilding types is cheap. Tests need no database — the middleware suite uses
# Fastify `inject` + JSON-schema validation (see packages/middleware/src/tests).
set -euo pipefail

# Web-only: local machines are assumed already set up.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# CLAUDE_PROJECT_DIR is set by the hook harness; fall back to the repo root
# derived from this script's location (.claude/hooks/) so it also runs standalone.
cd "${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

# Install workspace dependencies (respects the committed lockfile, like CI).
corepack enable >/dev/null 2>&1 || true
pnpm install --frozen-lockfile

# Build the shared types package. middleware/client resolve @sentence-bank/types
# to its dist/ output, so tests and typecheck fail until it is built once.
pnpm --filter=@sentence-bank/types build
