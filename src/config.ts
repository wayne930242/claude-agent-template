/**
 * Configuration
 * All settings come from environment variables with sensible defaults.
 */

export const config = {
  api: {
    port: parseInt(process.env.API_PORT || "3000", 10),
    key: process.env.API_KEY || "",
    base: process.env.API_BASE || "http://127.0.0.1:3000",
  },
  claude: {
    bin: process.env.CLAUDE_BIN || "claude",
    // Agent workspace: where Claude Code runs (reads CLAUDE.md, hooks, .mcp.json)
    projectDir: process.env.CLAUDE_PROJECT_DIR || "src/claude",
  },
} as const;

export function validateConfig(): void {
  console.log("[Config] API port:", config.api.port);
  console.log("[Config] Claude bin:", config.claude.bin);
  console.log("[Config] Agent workspace:", config.claude.projectDir);
}
