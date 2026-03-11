# MCP Server

> This directory contains the MCP (Model Context Protocol) server that exposes custom tools to the Claude Code agent. The agent connects to this server via stdio transport, as configured in `src/claude/.mcp.json`.

## Architecture

```
src/mcp/
  server.ts          <- MCP server entry point (stdio transport)
  tools/
    hello.ts         <- Example tool — use as template
    your-tool.ts     <- Add new tools here
```

```
src/claude/.mcp.json -> start-mcp.sh -> bun run src/mcp/server.ts
```

## How It Works

1. When the agent starts, Claude Code reads `src/claude/.mcp.json`.
2. It launches `start-mcp.sh`, which runs `bun run src/mcp/server.ts`.
3. The server registers all tools and connects via stdio.
4. The agent can then call these tools during its session.

## Adding a New Tool

### Step 1: Create the tool file

Create a new file in `src/mcp/tools/`, e.g. `weather.ts`:

```ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerWeatherTools(server: McpServer): void {
  server.registerTool(
    "get_weather",
    {
      title: "Get Weather",
      description: "Get the current weather for a given city.",
      inputSchema: {
        city: z.string().describe("City name (e.g. 'Tokyo')"),
        unit: z
          .enum(["celsius", "fahrenheit"])
          .default("celsius")
          .describe("Temperature unit"),
      },
    },
    async ({ city, unit }) => {
      // Your implementation here
      const temp = unit === "celsius" ? "22°C" : "72°F";
      return {
        content: [
          { type: "text", text: `Weather in ${city}: ${temp}, sunny` },
        ],
      };
    },
  );
}
```

### Step 2: Register in `server.ts`

```ts
import { registerHelloTools } from "./tools/hello";
import { registerWeatherTools } from "./tools/weather";

// Register tools
registerHelloTools(server);
registerWeatherTools(server);
```

### Step 3: Run typecheck

```bash
bun run typecheck
```

## Conventions

- **Named exports only** — export `register<Name>Tools(server: McpServer): void`
- **Zod validation** — use `.describe("...")` on every input field
- **Return shape** — always return `{ content: [{ type: "text", text: "..." }] }`
- **Logging** — use `console.error()` only (stdout is reserved for MCP protocol)
- **No `console.log`** — it will break the stdio transport
- **No default exports**

## Return Types

### Text response (most common)

```ts
return {
  content: [{ type: "text", text: "Result here" }],
};
```

### Multiple content blocks

```ts
return {
  content: [
    { type: "text", text: "Summary: ..." },
    { type: "text", text: JSON.stringify(data, null, 2) },
  ],
};
```

### Error response

```ts
return {
  content: [{ type: "text", text: "Error: City not found" }],
  isError: true,
};
```

## Testing

Test the MCP server standalone:

```bash
bun run mcp
```

Or test a specific tool via stdin (JSON-RPC):

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"hello","arguments":{"name":"World"}}}' | bun run src/mcp/server.ts
```

## Full Example: Database Query Tool

```ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerDbTools(server: McpServer): void {
  server.registerTool(
    "query_tasks",
    {
      title: "Query Tasks",
      description: "Query tasks from the database with optional status filter.",
      inputSchema: {
        status: z
          .enum(["pending", "in_progress", "done"])
          .optional()
          .describe("Filter by task status"),
        limit: z
          .number()
          .min(1)
          .max(100)
          .default(10)
          .describe("Maximum number of results"),
      },
    },
    async ({ status, limit }) => {
      try {
        // Replace with your actual database query
        const tasks = await db.query(
          `SELECT * FROM tasks WHERE ($1::text IS NULL OR status = $1) LIMIT $2`,
          [status ?? null, limit],
        );
        return {
          content: [
            { type: "text", text: JSON.stringify(tasks, null, 2) },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[MCP ERROR] query_tasks failed: ${message}`);
        return {
          content: [{ type: "text", text: `Error: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
```
