/**
 * Headless Claude Client
 *
 * Runs Claude Code in headless mode (`claude -p`) and streams the output.
 * This is how the bot talks to Claude — no browser, pure CLI subprocess.
 */

import { spawn } from "bun";
import { resolve } from "node:path";
import { config } from "../config";

export interface StreamEvent {
  type: "thinking" | "text" | "done" | "error";
  content: string;
}

interface ClaudeOptions {
  /** Previous conversation to include as context */
  conversationHistory?: string;
  /** Signal to abort the Claude process */
  signal?: AbortSignal;
  /** Session ID passed to hooks via env */
  sessionId?: string;
}

/**
 * Stream Claude responses as events.
 *
 * Usage:
 *   for await (const event of streamClaude("hello")) {
 *     if (event.type === "text") console.log(event.content);
 *   }
 */
export async function* streamClaude(
  prompt: string,
  options?: ClaudeOptions,
): AsyncGenerator<StreamEvent> {
  let fullPrompt = prompt;

  if (options?.conversationHistory) {
    fullPrompt = `[Previous conversation]\n${options.conversationHistory}\n\n[Current message]\n${prompt}`;
  }

  const projectDir = resolve(process.cwd(), config.claude.projectDir);
  const sessionId = options?.sessionId ?? crypto.randomUUID();

  const proc = spawn({
    cmd: [
      config.claude.bin,
      "-p",
      fullPrompt,
      "--dangerously-skip-permissions",
      "--output-format",
      "stream-json",
      "--verbose",
    ],
    cwd: projectDir,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      CLAUDE_SESSION_ID: sessionId,
    },
  });

  // Kill on abort signal
  if (options?.signal) {
    options.signal.addEventListener("abort", () => proc.kill());
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let lastText = "";

  try {
    for await (const chunk of proc.stdout) {
      if (options?.signal?.aborted) {
        yield { type: "error", content: "Aborted" };
        return;
      }

      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);

          // Claude stream-json format
          if (event.type === "assistant") {
            for (const block of event.message?.content ?? []) {
              if (block.type === "thinking") {
                yield { type: "thinking", content: block.thinking };
              } else if (block.type === "text") {
                lastText = block.text;
                yield { type: "text", content: block.text };
              }
            }
          } else if (event.type === "result") {
            yield { type: "done", content: event.result ?? lastText };
            return;
          }
        } catch {
          // Skip non-JSON lines (debug output)
        }
      }
    }
  } catch (error) {
    yield { type: "error", content: String(error) };
  } finally {
    proc.kill();
  }

  yield { type: "done", content: lastText };
}

/**
 * Simple one-shot Claude call (non-streaming).
 */
export async function callClaude(prompt: string): Promise<string> {
  let result = "";
  for await (const event of streamClaude(prompt)) {
    if (event.type === "done") result = event.content;
  }
  return result;
}
