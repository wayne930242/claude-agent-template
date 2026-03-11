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
  type: "thinking" | "text" | "tool_use" | "tool_result" | "done" | "error";
  content: string;
  toolId?: string;
  toolName?: string;
  toolInput?: string;
  /** Conversation ID returned by Claude (available on "done" events) */
  conversationId?: string;
}

interface ClaudeOptions {
  /** Signal to abort the Claude process */
  signal?: AbortSignal;
  /** Session ID passed to hooks via env */
  sessionId?: string;
  /** Resume a previous conversation by ID */
  resumeConversationId?: string;
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
  const projectDir = resolve(process.cwd(), config.claude.projectDir);
  const sessionId = options?.sessionId ?? crypto.randomUUID();

  const cmd = [config.claude.bin];
  if (options?.resumeConversationId) {
    cmd.push("--resume", options.resumeConversationId, "-p", prompt);
  } else {
    cmd.push("-p", prompt);
  }
  cmd.push(
    "--dangerously-skip-permissions",
    "--output-format",
    "stream-json",
    "--verbose",
  );

  const proc = spawn({
    cmd,
    cwd: projectDir,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      CLAUDE_SESSION_ID: sessionId,
      CLAUDECODE: "", // Allow nested Claude spawning
    },
  });

  // Kill on abort signal
  if (options?.signal) {
    options.signal.addEventListener("abort", () => proc.kill());
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let lastText = "";

  // Log stderr for debugging
  (async () => {
    const stderrDecoder = new TextDecoder();
    for await (const chunk of proc.stderr) {
      const text = stderrDecoder.decode(chunk, { stream: true });
      if (text.trim()) console.error("[Claude stderr]", text.trim());
    }
  })().catch(() => {});

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
              } else if (block.type === "tool_use") {
                yield {
                  type: "tool_use",
                  content: "",
                  toolId: block.id,
                  toolName: block.name,
                  toolInput: JSON.stringify(block.input ?? {}),
                };
              } else if (block.type === "tool_result") {
                const text = (block.content ?? [])
                  .filter((c: { type: string }) => c.type === "text")
                  .map((c: { text: string }) => c.text)
                  .join("\n");
                yield {
                  type: "tool_result",
                  content: text,
                  toolId: block.tool_use_id,
                };
              }
            }
          } else if (event.type === "result") {
            yield {
              type: "done",
              content: event.result ?? lastText,
              conversationId: event.session_id ?? event.conversation_id,
            };
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
