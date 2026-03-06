# My Claude Code Agent

> Edit this file to define your agent's behavior and project context.

<law>
**Law 1: Communication**
- Be concise and actionable
- Respond in the same language as the user

**Law 2: Safety**
- Always ask before destructive operations (delete, overwrite, rm -rf)
- Never commit secrets or credentials

**Law 3: Code Quality**
- Write clean, readable code
- Prefer simple solutions over clever ones
- Use TypeScript strict mode
</law>

## Project Overview

<!-- Describe what your agent does -->

## Architecture

```
src/
├── index.ts          # Entry point — starts the API server
├── config.ts         # Environment config
├── claude/
│   └── client.ts     # Headless Claude runner (claude -p)
├── api/
│   └── server.ts     # HTTP + WebSocket server
└── mcp/
    ├── server.ts      # MCP server (stdio)
    └── tools/
        └── hello.ts   # Example MCP tool — replace with your own
```

## Common Commands

```bash
# Start the bot (HTTP + WebSocket)
bun run dev

# Test the API
curl http://localhost:3000/health
curl -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"message":"hello"}'

# Test MCP server directly
bun run mcp
```

## Adding MCP Tools

Edit `src/mcp/tools/` to add new tools. Each tool file should export a `register*Tools(server)` function and be imported in `src/mcp/server.ts`.
