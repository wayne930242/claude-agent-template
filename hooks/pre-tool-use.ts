#!/usr/bin/env bun
/**
 * PreToolUse Hook
 *
 * Runs before every tool execution. Reads JSON from stdin.
 * Exit 0 = allow, Exit 1 = block (with reason on stderr).
 *
 * Input format:
 *   { "tool_name": "Bash", "tool_input": { "command": "ls" } }
 *
 * Docs: https://docs.anthropic.com/en/docs/claude-code/hooks
 */

interface ToolInput {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
}

const BLOCKED_PATTERNS = [
  // Destructive filesystem
  /\brm\s+-rf\s+\//, // rm -rf /
  /\bformat\b/,
  /\bmkfs\b/,
  // Credential theft
  /\/etc\/(passwd|shadow|sudoers)/,
  /~\/\.ssh\/(id_|authorized_keys)/,
  // Prompt injection in tool input
  /ignore\s+(previous|above|all)\s+instructions/i,
  /you\s+are\s+now\s+/i,
];

async function main() {
  const raw = await Bun.stdin.text();
  if (!raw.trim()) process.exit(0);

  let data: ToolInput;
  try {
    data = JSON.parse(raw);
  } catch {
    process.exit(0); // Can't parse, let it through
  }

  const inputStr = JSON.stringify(data.tool_input ?? {});

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(inputStr)) {
      console.error(`[Security] Blocked: pattern matched: ${pattern}`);
      process.exit(1);
    }
  }

  // TODO: Add your own security checks here.
  // For example: block access to specific files, require confirmation, etc.

  process.exit(0);
}

main().catch(() => process.exit(0));
