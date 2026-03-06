# Claude Code Agent Template

A complete starting point for building your own Claude Code agent.

## What's Included

| Component | Description |
|-----------|-------------|
| `src/index.ts` | Entry point — starts the web server |
| `src/claude/client.ts` | Headless Claude runner (`claude -p`) |
| `src/api/server.ts` | HTTP + WebSocket API |
| `src/mcp/server.ts` | MCP server (tools for Claude Code) |
| `src/mcp/tools/hello.ts` | Example MCP tool |
| `.mcp.json` | Tells Claude Code to load your MCP server |
| `CLAUDE.md` | Agent constitution (laws + context) |
| `.claude/` | Commands and rules |

## Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Copy env
cp .env.example .env

# 3. Start the bot
bun run dev
```

Then test it:
```bash
# Health check
curl http://localhost:3000/health

# One-shot chat (requires Claude Code installed)
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "hello"}'
```

## How It Works

### Headless Claude Mode

The bot calls Claude Code as a subprocess:

```
User message
    ↓
src/api/server.ts         (receives via HTTP or WebSocket)
    ↓
src/claude/client.ts      (runs: claude -p "message" --output-format stream-json)
    ↓
Claude Code process       (reads CLAUDE.md, uses MCP tools, generates response)
    ↓
Streamed back to user
```

### MCP Tools

Claude Code automatically starts your MCP server (from `.mcp.json`) and the tools you register become available to Claude during a session.

```
Claude Code session
    ↓  (reads .mcp.json)
src/mcp/server.ts         (stdio transport)
    ↓  (registers tools)
src/mcp/tools/hello.ts    (your custom tools)
```

### WebSocket Streaming

```javascript
const ws = new WebSocket("ws://localhost:3000/ws");

ws.onopen = () => {
  ws.send(JSON.stringify({ type: "chat", content: "hello" }));
};

ws.onmessage = ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.type === "chat:text") console.log(msg.content);
  if (msg.type === "chat:done") console.log("Done!");
};
```

## Workshop: Design Your Agent

### Step 1: Define Agent Behavior (`CLAUDE.md`)

Edit the `<law>` block to set your agent's core rules:
```markdown
<law>
**Law 1: Focus**
- Only help with tasks related to [your domain]
- Decline off-topic requests politely
</law>
```

### Step 2: Add MCP Tools (`src/mcp/tools/`)

Create a new tool file and register it in `src/mcp/server.ts`:
```typescript
// src/mcp/tools/my-tool.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerMyTools(server: McpServer): void {
  server.registerTool("my_tool", {
    title: "My Tool",
    description: "What this tool does",
    inputSchema: {
      input: z.string().describe("Tool input"),
    },
  }, async ({ input }) => {
    // Your logic here
    return { content: [{ type: "text", text: `Result: ${input}` }] };
  });
}
```

### Step 3: Add Slash Commands (`.claude/commands/`)

Create commands for repetitive tasks:
```markdown
---
name: my-command
description: What this command does
---
# My Command
Steps for Claude to follow...
```

### Step 4: Configure Permissions (`.claude/settings.json`)

Control what Claude can do automatically:
```json
{
  "permissions": {
    "allow": ["Bash(git status:*)", "Bash(bun run:*)"],
    "deny": ["Bash(rm:*)"]
  }
}
```

## Project Structure

```
.
├── .claude/
│   ├── commands/          # Slash commands (/status, /your-command)
│   ├── rules/             # Scoped coding rules
│   └── settings.json      # Permissions
├── .mcp.json              # MCP server config
├── CLAUDE.md              # Agent constitution
└── src/
    ├── index.ts
    ├── config.ts
    ├── claude/
    │   └── client.ts      # ← Headless runner
    ├── api/
    │   └── server.ts      # ← HTTP + WebSocket
    └── mcp/
        ├── server.ts      # ← MCP entry point
        └── tools/
            └── hello.ts   # ← Add your tools here
```
