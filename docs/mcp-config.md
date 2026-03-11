# MCP Configuration — `.mcp.json`

> Located at `src/claude/.mcp.json`. Defines MCP servers available to the agent.

## File: `.mcp.json`

This file tells Claude Code which MCP (Model Context Protocol) servers the agent can use. It sits in the agent's working directory (`src/claude/`).

### Current Configuration

```json
{
  "mcpServers": {
    "my-agent": {
      "type": "stdio",
      "command": "bash",
      "args": ["start-mcp.sh"]
    }
  }
}
```

### Fields

| Field | Description |
|---|---|
| `mcpServers` | Map of server name -> server config |
| `type` | Transport type. Use `"stdio"` for local processes |
| `command` | The executable to run |
| `args` | Arguments passed to the command |

### How It Works

1. When the agent starts, Claude Code reads `.mcp.json` and launches each MCP server.
2. `start-mcp.sh` resolves the correct path and runs `bun run ../mcp/server.ts`.
3. The MCP server exposes tools (defined in `src/mcp/tools/`) over stdio.
4. The agent can then call these tools during its session.

### Adding a New MCP Server

Add an entry under `mcpServers`:

```json
{
  "mcpServers": {
    "my-agent": {
      "type": "stdio",
      "command": "bash",
      "args": ["start-mcp.sh"]
    },
    "another-server": {
      "type": "stdio",
      "command": "bun",
      "args": ["run", "path/to/server.ts"]
    }
  }
}
```

### Adding a New Tool

To add tools to the existing `my-agent` MCP server:

1. Create a file in `src/mcp/tools/` (e.g., `my-tool.ts`).
2. Export a `registerMyToolTools(server: McpServer)` function.
3. Register it in `src/mcp/server.ts`.

See `src/mcp/tools/hello.ts` for an example, or see [`src/mcp/README.md`](../src/mcp/README.md) for the full development guide.
