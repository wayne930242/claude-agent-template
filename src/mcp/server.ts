#!/usr/bin/env bun
/**
 * MCP Server
 *
 * Exposes tools to Claude Code via the Model Context Protocol.
 * Claude Code reads .mcp.json and starts this server automatically.
 *
 * Rules:
 * - Use console.error() for logs (stdout is reserved for the MCP protocol)
 * - Register all your tools before calling server.connect()
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerHelloTools } from "./tools/hello";

const log = {
  info: (msg: string) => console.error(`[MCP] ${msg}`),
  error: (msg: string) => console.error(`[MCP ERROR] ${msg}`),
};

log.info("Starting MCP server...");

const server = new McpServer({
  name: "my-agent",
  version: "1.0.0",
});

// Register tools
registerHelloTools(server);

// Connect to Claude Code via stdio
const transport = new StdioServerTransport();
await server.connect(transport);

log.info("MCP server ready");
