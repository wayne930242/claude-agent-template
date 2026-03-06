#!/usr/bin/env bun
/**
 * SessionStart Hook
 *
 * Runs every time a Claude Code session begins.
 * Output (stdout) is injected into Claude's context.
 * Use this to provide Claude with relevant session info.
 *
 * Hook event data: none (no stdin for SessionStart)
 *
 * Docs: https://docs.anthropic.com/en/docs/claude-code/hooks
 */

const now = new Date();
const timeStr = now.toLocaleString("en-US", {
  timeZone: process.env.TZ || "UTC",
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

console.log(`[Session] Started: ${timeStr}`);

// TODO: Add anything useful Claude should know at the start of each session.
// For example:
//   - Current git branch
//   - Project status from an API
//   - Pending tasks from a database
