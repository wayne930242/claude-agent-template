#!/usr/bin/env bun
/**
 * Stop Hook
 *
 * Runs when a Claude Code session ends.
 * Sends a system notification to alert the user.
 */

const isMac = process.platform === "darwin";
const isLinux = process.platform === "linux";

async function main() {
  const raw = await Bun.stdin.text();
  let stopResponse = "";
  try {
    const data = JSON.parse(raw);
    stopResponse = data.stop_response ?? "";
  } catch {
    // no-op
  }

  const charCount = stopResponse.length;
  const title = "Claude Agent";
  const message = `Session completed (${charCount} chars)`;

  if (isMac) {
    await Bun.$`osascript -e 'display notification "${message}" with title "${title}" sound name "Glass"'`.quiet();
  } else if (isLinux) {
    await Bun.$`notify-send "${title}" "${message}"`.quiet();
  }

  console.error(`[Stop] ${message}`);
}

main().catch(() => process.exit(0));
