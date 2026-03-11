# Next.js Web UI Design

## Overview

Replace the current single-file `index.html` with a Next.js + shadcn/ui frontend that supports streaming output, tool use visualization, and thinking process display.

## Architecture

- Next.js app lives in `src/web/` with its own `package.json`
- Uses `output: 'export'` for static build → `src/web/out/`
- API server (`src/api/server.ts`) serves the static output at `/`
- Development: Next.js dev server on port 3001, proxies WebSocket to API server on port 3000

## WebSocket Protocol (extended)

Server → Client:
- `chat:start` — response starting
- `chat:thinking` — thinking block (streaming)
- `chat:text` — response text (streaming)
- `chat:tool_use` — tool call started (id, name, input)
- `chat:tool_result` — tool call result (id, content)
- `chat:done` — response complete
- `chat:error` — error

## Frontend Message Model

```typescript
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  blocks: MessageBlock[];
};

type MessageBlock =
  | { type: "thinking"; content: string }
  | { type: "text"; content: string }
  | { type: "tool_use"; id: string; name: string; input: unknown; status: "running" | "done" | "error" }
  | { type: "tool_result"; id: string; content: string };
```

## UI Components

- `chat-messages.tsx` — message list with auto-scroll
- `chat-input.tsx` — textarea + send button
- `message-bubble.tsx` — single message with blocks
- `tool-use-block.tsx` — collapsible tool call (name + status badge, expandable params/result)
- `thinking-block.tsx` — collapsible thinking process
- `connection-status.tsx` — WebSocket connection indicator

## Display Behavior

- **Thinking**: collapsible, collapsed by default, "Thinking..." animation while streaming
- **Tool use**: collapsible, collapsed by default, shows tool name + spinner/checkmark/error badge
- **Text**: rendered as markdown, blinking cursor during streaming
- **Toggle**: user can expand/collapse individual blocks

## Backend Changes

- `client.ts` — forward `tool_use` and `tool_result` events from stream-json
- `server.ts` — add `chat:tool_use`, `chat:tool_result`, `chat:thinking` WebSocket event types
- `server.ts` — serve Next.js static output from `src/web/out/`

## shadcn Components Used

Card, Collapsible, Button, Textarea, Badge

## Stop Hook

Add Stop hook to `src/claude/.claude/settings.json` for system notification when session ends.
