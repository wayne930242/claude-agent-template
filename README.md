# Claude Code Agent Template

A starting point for building a Claude Code agent with HTTP/WebSocket API, MCP tools, and hooks.

**[繁體中文文件 →](README.zh-TW.md)**

---

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

docker compose up                            # production
docker compose -f docker-compose.dev.yml up  # dev (hot reload)
```

### Local

```bash
# Requires: bun + Claude Code CLI
cp .env.example .env
# Edit .env: CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...

bun install
cd src/web && bun install && bun run build && cd ../..
bun run dev
```

Test:
```bash
curl http://localhost:3000/health
# Open http://localhost:3000 for the chat UI
```

---

## Docker Modes

| Mode | Command | Description |
|---|---|---|
| **Production** | `docker compose up` | Code baked into image, suitable for deployment |
| **Development** | `docker compose -f docker-compose.dev.yml up` | Mounts local `src/`, auto-restarts on changes |

### Development Mode

- **Hot reload** — local `./src` mounted into container, `bun run --watch` restarts on file changes
- **Auth persistence** — `claude_auth` volume preserves Claude login across container rebuilds
- **Env file** — reads from `.env`

```bash
# First time (build image)
docker compose -f docker-compose.dev.yml up --build

# Subsequent runs
docker compose -f docker-compose.dev.yml up

# Background
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose -f docker-compose.dev.yml logs -f
```

---

## Project Structure

```
src/
├── index.ts              ← Entry point
├── config.ts             ← Env-based config
├── api/server.ts         ← HTTP + WebSocket server (serves static UI + API)
├── mcp/
│   ├── server.ts         ← MCP server entry
│   └── tools/hello.ts    ← Example tool — add new tools here
├── web/                  ← Next.js chat UI (static export)
│   ├── app/              ← Next.js app router pages
│   ├── components/       ← Chat UI (messages, input, tool blocks)
│   ├── components/ui/    ← shadcn primitives
│   ├── hooks/            ← useWebSocket hook
│   └── lib/types.ts      ← Shared message types
└── claude/               ← Agent workspace (CLAUDE_PROJECT_DIR)
    ├── CLAUDE.md         ← Agent constitution (laws + context)
    ├── client.ts         ← Headless runner (spawns `claude -p`)
    ├── .mcp.json         ← Registers MCP server with Claude Code
    ├── .claude/
    │   └── settings.json ← Agent hooks & permissions
    └── hooks/
        ├── on-session-start.ts  ← Injects context at session start
        ├── pre-tool-use.ts      ← Safety gate (can block dangerous calls)
        └── on-stop.ts           ← Session-end notification
```

**Key separation:** `src/` is the bot server; `src/claude/` is the agent workspace where Claude Code runs.

---

## How It Works

```
User (HTTP or WebSocket)
        ↓
  src/api/server.ts        ← receives request
        ↓
  src/claude/client.ts     ← spawns: claude -p "..." --output-format stream-json
        ↓
  Claude Code process      ← reads CLAUDE.md, runs hooks, calls MCP tools
        ↓
  src/mcp/server.ts        ← your custom tools (started via src/claude/.mcp.json)
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

### WebSocket Example

```javascript
const ws = new WebSocket("ws://localhost:3000/ws");
ws.send(JSON.stringify({ type: "chat", content: "hello" }));
ws.onmessage = ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.type === "chat:text") process.stdout.write(msg.content);
  if (msg.type === "chat:done") console.log("\n[done]");
};
```

### WebSocket Message Format

Client → Server:
- `{ "type": "chat", "content": "your message" }` — send message
- `{ "type": "stop" }` — abort streaming

Server → Client:
- `{ "type": "connected", "id": "..." }` — connection established
- `{ "type": "chat:start" }` — response starting
- `{ "type": "chat:thinking", "content": "..." }` — thinking process
- `{ "type": "chat:text", "content": "..." }` — streaming text chunk
- `{ "type": "chat:tool_use", "id": "...", "name": "...", "input": "..." }` — tool call started
- `{ "type": "chat:tool_result", "id": "...", "content": "..." }` — tool call result
- `{ "type": "chat:done" }` — response complete
- `{ "type": "chat:error", "error": "..." }` — error

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAUDE_CODE_OAUTH_TOKEN` | — | **Required** — get via `claude setup-token` |
| `API_PORT` | `3000` | HTTP server port |
| `API_KEY` | — | Optional API auth key (unset = open access) |
| `CLAUDE_BIN` | `claude` | Path to Claude Code CLI |
| `CLAUDE_PROJECT_DIR` | `src/claude` | Agent workspace directory |
| `API_BASE` | `http://127.0.0.1:3000` | Base URL for internal calls |

---

## License

MIT
