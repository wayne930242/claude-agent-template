# Agent Workspace — `src/claude/`

> This is the Claude Code agent's working directory. When the bot spawns a Claude Code session, it runs inside this directory with `CLAUDE_PROJECT_DIR=src/claude`.

## Directory Structure

```
src/claude/
  CLAUDE.md              <- Agent constitution (laws, purpose, notes)
  client.ts              <- Headless Claude runner (spawns `claude -p`)
  start-mcp.sh           <- Shell script to launch MCP server
  .mcp.json              <- MCP server config (see docs/mcp-config.md)
  .claude/
    settings.json        <- Permissions & hooks config (see .claude/README.md)
  hooks/
    on-session-start.ts  <- SessionStart hook — injects runtime context
    pre-tool-use.ts      <- PreToolUse hook — safety gate
    on-stop.ts           <- Stop hook — desktop notification
```

## How It Works

1. `client.ts` spawns a headless Claude Code process via `claude -p`.
2. Claude Code reads `CLAUDE.md` as the agent's system instructions.
3. Claude Code reads `.claude/settings.json` for permissions and hooks.
4. Claude Code reads `.mcp.json` and starts the MCP server for custom tools.
5. Hooks fire at lifecycle events (session start, before/after tool calls, stop).

## Key Files

### `CLAUDE.md` — Agent Constitution

This is the agent's personality and rules. Edit this file to define:

- **Laws** — non-negotiable rules (wrapped in `<law>` tags)
- **Purpose** — what the agent is for
- **Available tools** — document MCP tools the agent can use
- **Notes** — runtime context the agent should always know

```markdown
<law>
**Law 1: Communication**
- Be concise and actionable
- Respond in the same language as the user
</law>
```

### `.claude/settings.json` — Hooks & Permissions

Configures lifecycle hooks and tool permissions. See [`.claude/README.md`](.claude/README.md) for the full hook reference with all 9 event types and examples.

### `.mcp.json` — MCP Server Config

Defines which MCP servers the agent can access. See [`docs/mcp-config.md`](../../docs/mcp-config.md) for configuration details.

### `hooks/` — Hook Scripts

Hook scripts that run at specific lifecycle events:

| File | Event | Purpose |
|---|---|---|
| `on-session-start.ts` | `SessionStart` | Injects current time into context |
| `pre-tool-use.ts` | `PreToolUse` | Blocks dangerous patterns (rm -rf, SSH keys, prompt injection) |
| `on-stop.ts` | `Stop` | Sends desktop notification when session ends |

### `client.ts` — Headless Claude Runner

Spawns and manages Claude Code sessions programmatically. Used by the bot's API server to handle user requests.

### `start-mcp.sh` — MCP Launcher

Shell script that resolves the correct path and runs `bun run ../mcp/server.ts`. Referenced by `.mcp.json`.

## Customization Guide

### Change agent behavior

Edit `CLAUDE.md` — add laws, update purpose, document tools.

### Add safety rules

Edit `hooks/pre-tool-use.ts` — add regex patterns to the `BLOCKED` array.

### Add runtime context

Edit `hooks/on-session-start.ts` — add `console.log()` calls to inject info.

### Add new lifecycle hooks

1. Create a hook script in `hooks/`.
2. Register it in `.claude/settings.json`.
3. See [`.claude/README.md`](.claude/README.md) for all 9 hook events.

### Add custom tools

1. Create a tool in `src/mcp/tools/`.
2. Register it in `src/mcp/server.ts`.
3. See [`src/mcp/README.md`](../mcp/README.md) for the development guide.
