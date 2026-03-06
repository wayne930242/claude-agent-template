#!/bin/bash
# Starts the MCP server from the correct path.
# This script lives in src/claude/, MCP server lives in src/mcp/.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bun run "$SCRIPT_DIR/../mcp/server.ts"
