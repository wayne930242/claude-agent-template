/**
 * Hello Tool - Example MCP Tool
 *
 * This is a minimal example showing how to register an MCP tool.
 * Replace or add tools here for your agent's specific capabilities.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerHelloTools(server: McpServer): void {
  server.registerTool(
    "hello",
    {
      title: "Hello",
      description: "Say hello to someone. Example tool — replace with your own.",
      inputSchema: {
        name: z.string().describe("Name to greet"),
      },
    },
    async ({ name }) => {
      return {
        content: [{ type: "text", text: `Hello, ${name}! I'm your MCP tool.` }],
      };
    },
  );

  // TODO: Add more tools here
  // server.registerTool("my_tool", { ... }, async (input) => { ... });
}
