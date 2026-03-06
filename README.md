# Claude Code Agent Template

A starting point for building a Claude Code agent with HTTP/WebSocket API, MCP tools, and hooks.

## Quick Start

### Docker (recommended)

```bash
git clone https://github.com/wayne930242/claude-agent-template
cd claude-agent-template

# Get your OAuth token (run on host, not in Docker)
claude setup-token
# Copy the sk-ant-oat01-... token

cp .env.example .env
# Edit .env: CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...

docker compose up                          # production
docker compose -f docker-compose.dev.yml up  # dev (hot reload)
```

### Local

```bash
# Requires: bun + Claude Code CLI
cp .env.example .env
# Edit .env: CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...

bun install
bun run dev
```

Test:
```bash
curl http://localhost:3000/health
```

---

## Project Structure

```
src/
├── index.ts              ← Entry point
├── config.ts             ← Env-based config
├── api/server.ts         ← HTTP + WebSocket server
├── mcp/
│   ├── server.ts         ← MCP server entry
│   └── tools/hello.ts   ← Example tool — add new tools here
└── claude/               ← Agent workspace (CLAUDE_PROJECT_DIR)
    ├── CLAUDE.md         ← Agent constitution (laws + context)
    ├── client.ts         ← Headless runner (spawns `claude -p`)
    ├── .mcp.json         ← Registers MCP server with Claude Code
    ├── .claude/
    │   └── settings.json ← Agent hooks & permissions
    └── hooks/
        ├── on-session-start.ts  ← Injects context at session start
        └── pre-tool-use.ts      ← Safety gate (can block dangerous calls)
```

**Key separation:** `src/` is the bot server; `src/claude/` is the agent workspace where Claude Code runs.

---

## How It Works

```
User (HTTP or WebSocket)
        ↓
  src/api/server.ts
        ↓
  src/claude/client.ts   — spawns: claude -p "..." --output-format stream-json
        ↓
  Claude Code process    — reads CLAUDE.md, runs hooks, calls MCP tools
        ↓
  src/mcp/server.ts      — your custom tools (started via src/claude/.mcp.json)
```

---

## Customising

### 1. Agent behaviour — `src/claude/CLAUDE.md`

Edit the `<law>` block to define your agent's rules:
```markdown
<law>
**Law 1: Focus** — Only help with tasks related to [your domain]
**Law 2: Style** — Always respond in [your preferred language]
</law>
```

### 2. Add MCP tools — `src/mcp/tools/`

```typescript
// src/mcp/tools/my-tool.ts
export function registerMyTools(server: McpServer): void {
  server.registerTool("my_tool", {
    title: "My Tool",
    description: "What it does",
    inputSchema: { query: z.string().describe("Search query") },
  }, async ({ query }) => {
    return { content: [{ type: "text", text: `Result: ${query}` }] };
  });
}
```

Then register in `src/mcp/server.ts`:
```typescript
import { registerMyTools } from "./tools/my-tool";
registerMyTools(server);
```

### 3. Add hooks — `src/claude/hooks/`

```typescript
// src/claude/hooks/on-stop.ts
const input = JSON.parse(await Bun.stdin.text());
console.error("[Session ended]", input.stop_response?.length, "chars");
```

Register in `src/claude/.claude/settings.json`:
```json
{ "hooks": { "Stop": [{ "hooks": ["bun hooks/on-stop.ts"] }] } }
```

---

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/chat` | One-shot chat: `{"message": "..."}` |
| `WS` | `/ws` | Streaming chat |

WebSocket example:
```javascript
const ws = new WebSocket("ws://localhost:3000/ws");
ws.send(JSON.stringify({ type: "chat", content: "hello" }));
ws.onmessage = ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.type === "chat:text") process.stdout.write(msg.content);
  if (msg.type === "chat:done") console.log("\n[done]");
};
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAUDE_CODE_OAUTH_TOKEN` | — | **Required** — get via `claude setup-token` |
| `API_PORT` | `3000` | HTTP server port |
| `API_KEY` | — | Optional API auth key |
| `CLAUDE_BIN` | `claude` | Path to Claude Code CLI |
| `CLAUDE_PROJECT_DIR` | `src/claude` | Agent workspace directory |
| `API_BASE` | `http://127.0.0.1:3000` | Base URL for internal calls |
