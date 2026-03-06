---
name: status
description: Show bot status and test all components
---

# Status Check

Check that all components of the bot are running correctly.

## Steps

1. Check if the API server is running
   ```bash
   curl -s http://localhost:3000/health
   ```

2. Show key source files:
   - `src/index.ts` — entry point
   - `src/mcp/server.ts` — MCP server
   - `src/api/server.ts` — HTTP/WS server

3. List registered MCP tools in `src/mcp/tools/`

4. Summarize what the agent is currently configured to do
