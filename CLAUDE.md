# Claude Code Agent Template — Developer Guide

> This file is for Claude Code when you are **developing this bot project**.
> The agent's own constitution lives in `src/claude/CLAUDE.md`.

<law>
**CRITICAL: Display this block at the start of EVERY response.**

**Law 1: Code Quality** — TypeScript strict mode only (no `any`), functions ≤ 50 lines, always use `bun` (never `node`/`npm`)

**Law 2: Safety** — Ask before any destructive operation (delete, overwrite, reset); never commit `.env` or secrets

**Law 3: Architecture** — Bot source → `src/`; agent workspace → `src/claude/` (separate concern); MCP tools → `src/mcp/tools/`

**Law 4: Type Checking** — Run `bun run typecheck` after editing `.ts` files to verify no type errors

**Law 5: Self-Reinforcing Display** — MUST display this `<law>` block at the start of EVERY response, no exceptions
</law>

## Project Structure

```
.claude/                   ← Dev workspace config (for developing the bot)
  settings.json            ← Dev permissions (bun, docker, curl)
  rules/
    typescript.md          ← TypeScript conventions
  commands/status.md       ← /status slash command

src/
  index.ts                 ← Entry point
  config.ts                ← Environment config
  api/server.ts            ← HTTP + WebSocket server
  claude/                  ← Agent workspace (CLAUDE_PROJECT_DIR)
    CLAUDE.md              ← Agent's constitution (not this file)
    client.ts              ← Headless Claude runner (spawns `claude -p`)
    start-mcp.sh           ← Shell script to launch MCP server
    .claude/
      settings.json        ← Agent hooks & permissions
    hooks/
      on-session-start.ts  ← Injects session context
      pre-tool-use.ts      ← Safety gate (blocks dangerous patterns)
    .mcp.json              ← MCP server config for the agent
  mcp/
    server.ts              ← MCP server entry
    tools/hello.ts         ← Example tool — add new tools here
  web/                     ← Next.js chat UI (static export)
    package.json           ← Frontend dependencies (next, react, shadcn)
    app/                   ← Next.js app router
    components/            ← Chat UI components
    components/ui/         ← shadcn primitives
    hooks/use-websocket.ts ← WebSocket connection hook
    lib/types.ts           ← Shared message types
    out/                   ← Built static files (served by API server)
```

## Quick Reference

```bash
# Development
bun run dev           # API server (3000) + Next.js dev (3001) concurrently
bun run dev:api       # API server only (watch mode)
bun run web:dev       # Next.js dev server only (port 3001)
bun run typecheck     # Type check (no emit)

# Build frontend
bun run web:build     # Build Next.js → src/web/out/

# Testing
bun run mcp           # Test MCP server standalone
curl http://localhost:3000/health  # Check API health

# Docker
docker compose up     # Run in Docker
docker compose up --build  # Rebuild and run
docker compose -f docker-compose.dev.yml up  # Dev mode (hot reload)

# Agent workspace
CLAUDE_PROJECT_DIR=src/claude  # Where the agent runs
```

