# Claude Code Agent Template

A complete starting point for building your own Claude Code agent.

## Quick Start (Docker)

```bash
# 1. Clone
git clone https://github.com/wayne930242/claude-agent-template
cd claude-agent-template

# 2. Get your OAuth token (run this on your host, not in Docker)
claude setup-token
# → Copy the sk-ant-oat01-... token

# 3. Set the token
cp .env.example .env
# Edit .env: CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...

# 4. Start
docker compose up
```

Then test:
```bash
curl http://localhost:3000/health
```

## Quick Start (Local)

```bash
# Requires: bun + Claude Code CLI installed
bun install
bun run dev
```

---

## Project Structure

```
.
├── CLAUDE.md                 ← Agent constitution (laws + project context)
├── .mcp.json                 ← Registers the MCP server with Claude Code
│
├── hooks/                    ← Claude Code lifecycle hooks (run by Claude Code)
│   ├── on-session-start.ts   ← Injects context at session start
│   └── pre-tool-use.ts       ← Runs before every tool; can block dangerous calls
│
├── .claude/
│   ├── settings.json         ← Registers hooks + permission rules
│   ├── commands/             ← Slash commands (/status, etc.)
│   └── rules/                ← Scoped coding conventions (by file path)
│
└── src/
    ├── index.ts              ← Entry point — starts the web server
    ├── config.ts             ← Env-based config
    ├── claude/
    │   └── client.ts         ← Headless runner: calls `claude -p` as subprocess
    ├── api/
    │   └── server.ts         ← HTTP + WebSocket server
    └── mcp/
        ├── server.ts         ← MCP server (started by Claude Code via .mcp.json)
        └── tools/
            └── hello.ts      ← Example MCP tool — replace with your own
```

## How It Works

### The Big Picture

```
User (HTTP or WebSocket)
        ↓
  src/api/server.ts
        ↓
  src/claude/client.ts   — spawns: claude -p "..." --output-format stream-json
        ↓
  Claude Code process    — reads CLAUDE.md, runs hooks, calls MCP tools
        ↓
  src/mcp/server.ts      — your custom tools (started automatically from .mcp.json)
```

### Headless Mode

The bot calls `claude -p <prompt>` as a subprocess. Claude Code reads:
- `CLAUDE.md` — agent laws and project context
- `.mcp.json` — which MCP server to start
- `.claude/settings.json` — permissions and hooks

### Hooks

Hooks let you intercept Claude's lifecycle events.

| Hook | When it runs | Stdin | Can block? |
|------|-------------|-------|------------|
| `SessionStart` | Session begins | — | No |
| `PreToolUse` | Before every tool call | Tool JSON | Yes (exit 1) |
| `PostToolUse` | After every tool call | Result JSON | No |
| `Stop` | Session ends | Response JSON | No |
| `UserPromptSubmit` | User sends a message | Prompt JSON | Can modify |

Hooks are registered in `.claude/settings.json`:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": ["bun hooks/pre-tool-use.ts"]
      }
    ]
  }
}
```

### MCP Tools

Tools extend what Claude can do during a session.

```
.mcp.json → src/mcp/server.ts → src/mcp/tools/*.ts
```

Add a new tool in three steps:
1. Create `src/mcp/tools/my-tool.ts`
2. Import and register it in `src/mcp/server.ts`
3. Claude can now call it during any session

### WebSocket API

```javascript
const ws = new WebSocket("ws://localhost:3000/ws");

ws.send(JSON.stringify({ type: "chat", content: "hello" }));

ws.onmessage = ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.type === "chat:text") process.stdout.write(msg.content);
  if (msg.type === "chat:done") console.log("\n[done]");
};
```

---

## Workshop: Design Your Agent

### Step 1 — Define behavior (`CLAUDE.md`)

Edit the `<law>` block:
```markdown
<law>
**Law 1: Focus**
- Only help with tasks related to [your domain]

**Law 2: Style**
- Always respond in [your preferred language]
</law>
```

### Step 2 — Add MCP tools (`src/mcp/tools/`)

```typescript
// src/mcp/tools/my-tool.ts
export function registerMyTools(server: McpServer): void {
  server.registerTool("my_tool", {
    title: "My Tool",
    description: "What it does",
    inputSchema: { query: z.string() },
  }, async ({ query }) => {
    return { content: [{ type: "text", text: `Result: ${query}` }] };
  });
}
```

Then import it in `src/mcp/server.ts`:
```typescript
import { registerMyTools } from "./tools/my-tool";
registerMyTools(server);
```

### Step 3 — Add hooks (`hooks/`)

```typescript
// hooks/on-stop.ts
const input = JSON.parse(await Bun.stdin.text());
console.log("[Session ended] Response length:", input.stop_response?.length);
```

Register in `.claude/settings.json`:
```json
{ "hooks": { "Stop": [{ "hooks": ["bun hooks/on-stop.ts"] }] } }
```

### Step 4 — Add slash commands (`.claude/commands/`)

```markdown
---
name: my-command
description: Does something useful
---
# Steps
1. Check the current state
2. Do the thing
3. Report back
```

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/chat` | One-shot chat: `{"message": "..."}` |
| `WS` | `/ws` | Streaming chat |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | — | **Required** — Anthropic API key |
| `API_PORT` | `3000` | HTTP server port |
| `API_KEY` | — | Optional API auth key |
| `CLAUDE_BIN` | `claude` | Path to Claude Code CLI |
| `CLAUDE_PROJECT_DIR` | `.` | Directory Claude runs in |
