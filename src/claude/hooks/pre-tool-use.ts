#!/usr/bin/env bun
/**
 * PreToolUse Hook
 *
 * Runs before every tool execution. Reads JSON from stdin.
 * Exit 0 = allow. Exit 1 = block (put reason on stderr).
 *
 * Stdin format:
 *   { "tool_name": "Bash", "tool_input": { "command": "ls" } }
 *
 * Docs: https://docs.anthropic.com/en/docs/claude-code/hooks
 */

interface ToolEvent {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
}

const BLOCKED: RegExp[] = [
  /\brm\s+-rf\s+\//,                              // rm -rf /
  /\/etc\/(passwd|shadow|sudoers)/,               // sensitive system files
  /~\/\.ssh\/(id_|authorized_keys)/,              // SSH keys
  /ignore\s+(previous|above|all)\s+instructions/i, // prompt injection
];

async function main() {
  const raw = await Bun.stdin.text();
  if (!raw.trim()) process.exit(0);

  let data: ToolEvent;
  try {
    data = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const inputStr = JSON.stringify(data.tool_input ?? {});

  for (const pattern of BLOCKED) {
    if (pattern.test(inputStr)) {
      console.error(`[Security] Blocked: ${pattern}`);
      process.exit(1);
    }
  }

  // TODO: Add your own checks here.
  process.exit(0);
}

main().catch(() => process.exit(0));
