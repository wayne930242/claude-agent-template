---
globs: src/claude/hooks/**/*.ts
description: Conventions for Claude Code lifecycle hook scripts (stdin/stdout protocol, exit codes)
alwaysApply: false
---

# Hook Conventions

- MUST read input from `Bun.stdin.text()` as JSON
- MUST exit 0 to allow, exit 1 to block a tool call (pre-tool-use hooks only)
- MUST write block reason to `console.error` (stderr), never stdout
- MUST handle JSON parse failures gracefully by calling `process.exit(0)`
- NEVER write to stdout — it is reserved for hook output protocol
- NEVER throw unhandled exceptions — catch all errors and exit 0 as fallback
