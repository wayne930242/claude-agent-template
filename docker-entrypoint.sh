#!/bin/sh
set -e

# Configure Claude Code OAuth if token is provided.
# Get your token by running: claude setup-token
if [ -n "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
  mkdir -p "$HOME/.claude"
  # Skip onboarding prompts (theme, auth choice) when token is present
  echo '{"hasCompletedOnboarding": true}' > "$HOME/.claude.json"
  echo "[Auth] Claude Code OAuth token configured"
else
  echo "[Auth] WARNING: CLAUDE_CODE_OAUTH_TOKEN not set."
  echo "[Auth] Run: claude setup-token   (on your host machine)"
  echo "[Auth] Then add the token to your .env file."
fi

# Build frontend if out/ doesn't exist (e.g. after volume mount in dev mode)
if [ ! -d "/app/src/web/out" ] && [ -f "/app/src/web/package.json" ]; then
  echo "[Web] Building frontend..."
  cd /app/src/web && bun install --frozen-lockfile && bun run build
  cd /app
  echo "[Web] Frontend built"
fi

exec "$@"
