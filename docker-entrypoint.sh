#!/bin/sh
set -e

# Configure Claude Code OAuth if token is provided.
# Get your token by running: claude setup-token
if [ -n "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
  mkdir -p /root/.claude
  # Skip onboarding prompts (theme, auth choice) when token is present
  echo '{"hasCompletedOnboarding": true}' > /root/.claude.json
  echo "[Auth] Claude Code OAuth token configured"
else
  echo "[Auth] WARNING: CLAUDE_CODE_OAUTH_TOKEN not set."
  echo "[Auth] Run: claude setup-token   (on your host machine)"
  echo "[Auth] Then add the token to your .env file."
fi

exec "$@"
