---
globs: src/mcp/tools/**/*.ts
description: Conventions for MCP tool implementations in src/mcp/tools/
alwaysApply: false
---

# MCP Tool Conventions

- MUST export a registration function named `register<Name>Tools(server: McpServer): void`
- MUST use Zod for every input field with `.describe("...")` on each
- MUST return `{ content: [{ type: "text", text: "..." }] }` shape
- MUST log only to `console.error` — stdout is reserved for the MCP protocol
- MUST import `McpServer` type from `@modelcontextprotocol/sdk/server/mcp.js`
- NEVER use `console.log` (breaks stdio transport)
- NEVER use default exports — use named exports only
