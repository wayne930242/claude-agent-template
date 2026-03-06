/**
 * Entry Point
 *
 * Starts the API server (HTTP + WebSocket).
 * Claude Code reads .mcp.json and starts the MCP server separately.
 */

import { validateConfig } from "./config";
import { startApiServer } from "./api/server";

// Handle unexpected errors
process.on("uncaughtException", (error) => {
  console.error("[Fatal] Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[Fatal] Unhandled rejection:", reason);
});

async function main() {
  validateConfig();

  const port = parseInt(process.env.API_PORT || "3000", 10);
  const server = startApiServer(port);

  // Graceful shutdown
  const shutdown = () => {
    console.log("\n[Shutdown] Stopping server...");
    server.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log("[Ready] Bot running. Press Ctrl+C to stop.");
  console.log("[Ready] API: http://localhost:" + port);
  console.log("[Ready] WebSocket: ws://localhost:" + port + "/ws");
}

main().catch((error) => {
  console.error("[Fatal] Failed to start:", error);
  process.exit(1);
});
