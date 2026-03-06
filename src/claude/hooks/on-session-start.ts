#!/usr/bin/env bun
/**
 * SessionStart Hook
 *
 * Runs every time a Claude Code session begins.
 * Write to stdout — output is injected into Claude's context.
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

// TODO: Add anything useful Claude should know at session start.
// Examples:
//   - Current git branch: Bun.$`git branch --show-current`
//   - Pending items from a database
//   - System status from an API
