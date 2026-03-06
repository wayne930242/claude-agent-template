# Claude Code Agent Template — Developer Guide

> This file is for Claude Code when you are **developing this bot project**.
> The agent's own constitution lives in `src/claude/CLAUDE.md`.

<law>
**Law 1: Code Quality**
- Write clean TypeScript with strict types (no `any`)
- Keep functions under 50 lines
- Use `bun` instead of `node`/`npm`

**Law 2: Safety**
- Ask before destructive operations (delete, overwrite)
- Never commit `.env` or secrets

**Law 3: Architecture**
- Bot source code → `src/`
- Agent workspace (what the bot runs Claude in) → `src/claude/`
- MCP tools → `src/mcp/tools/`
</law>

## Project Structure

```
src/claude/        ← Agent workspace (CLAUDE_PROJECT_DIR)
  CLAUDE.md        ← Agent's constitution — edit this to change behavior
  .claude/         ← Agent's hooks and permissions
  hooks/           ← Agent's lifecycle hooks
  .mcp.json        ← MCP server config for the agent

src/mcp/           ← MCP server source code
  server.ts
  tools/hello.ts   ← Add your tools here

src/api/server.ts  ← HTTP + WebSocket server
src/claude/client.ts ← Headless Claude runner
```

## Common Dev Tasks

```bash
bun run dev         # Start the bot locally
bun run mcp         # Test the MCP server standalone
docker compose up   # Run in Docker
```
