# Next.js Web UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the single-file `index.html` with a Next.js + shadcn/ui chat frontend that streams text, shows tool use status, and displays thinking process in collapsible blocks.

**Architecture:** Next.js app in `src/web/` with static export (`output: 'export'`). The Bun API server serves the built `out/` directory. Backend `client.ts` is extended to forward `tool_use` and `tool_result` events from Claude's stream-json output. A Stop hook is added for session-end notification.

**Tech Stack:** Next.js 15, React 19, shadcn/ui, Tailwind CSS 4, react-markdown, bun

---

### Task 1: Add Stop Hook

**Files:**
- Create: `src/claude/hooks/on-stop.ts`
- Modify: `src/claude/.claude/settings.json`

**Step 1: Create the Stop hook script**

Create `src/claude/hooks/on-stop.ts`:

```typescript
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
```

**Step 2: Register the hook in settings.json**

Update `src/claude/.claude/settings.json` to add the Stop hook:

```json
{
  "permissions": {
    "allow": [],
    "deny": []
  },
  "hooks": {
    "SessionStart": [
      {
        "hooks": ["bun hooks/on-session-start.ts"]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": ["bun hooks/pre-tool-use.ts"]
      }
    ],
    "Stop": [
      {
        "hooks": ["bun hooks/on-stop.ts"]
      }
    ]
  }
}
```

**Step 3: Commit**

```bash
git add src/claude/hooks/on-stop.ts src/claude/.claude/settings.json
git commit -m "feat: add Stop hook for session-end notification"
```

---

### Task 2: Extend Backend — StreamEvent Types for Tool Use

**Files:**
- Modify: `src/claude/client.ts`

**Step 1: Extend StreamEvent type and parsing**

Update `src/claude/client.ts`. The `StreamEvent` type needs `tool_use` and `tool_result`:

```typescript
export interface StreamEvent {
  type: "thinking" | "text" | "tool_use" | "tool_result" | "done" | "error";
  content: string;
  /** Tool use ID (for tool_use and tool_result events) */
  toolId?: string;
  /** Tool name (for tool_use events) */
  toolName?: string;
  /** Tool input as JSON string (for tool_use events) */
  toolInput?: string;
}
```

In the stream parsing loop, add handling for `tool_use` and `tool_result` blocks alongside the existing `thinking` and `text` handlers:

```typescript
// Inside the block loop:
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
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/claude/client.ts
git commit -m "feat: extend StreamEvent to forward tool_use and tool_result"
```

---

### Task 3: Extend Backend — WebSocket Protocol

**Files:**
- Modify: `src/api/server.ts`

**Step 1: Update WebSocket message handler**

In the `for await` loop inside the WebSocket `message` handler, add forwarding for the new event types:

```typescript
for await (const event of streamClaude(msg.content, { signal: controller.signal })) {
  if (event.type === "text") {
    ws.send(JSON.stringify({ type: "chat:text", content: event.content }));
  } else if (event.type === "thinking") {
    ws.send(JSON.stringify({ type: "chat:thinking", content: event.content }));
  } else if (event.type === "tool_use") {
    ws.send(JSON.stringify({
      type: "chat:tool_use",
      id: event.toolId,
      name: event.toolName,
      input: event.toolInput,
    }));
  } else if (event.type === "tool_result") {
    ws.send(JSON.stringify({
      type: "chat:tool_result",
      id: event.toolId,
      content: event.content,
    }));
  } else if (event.type === "error") {
    ws.send(JSON.stringify({ type: "chat:error", error: event.content }));
    return;
  }
}
```

**Step 2: Update the file header comment to document new event types**

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/api/server.ts
git commit -m "feat: forward thinking, tool_use, tool_result via WebSocket"
```

---

### Task 4: Scaffold Next.js App in `src/web/`

**Files:**
- Delete: `src/web/index.html` (replaced by Next.js)
- Create: `src/web/package.json`
- Create: `src/web/next.config.ts`
- Create: `src/web/tsconfig.json`
- Create: `src/web/postcss.config.mjs`
- Create: `src/web/app/globals.css`
- Create: `src/web/app/layout.tsx`
- Create: `src/web/app/page.tsx`
- Create: `src/web/lib/utils.ts`
- Create: `src/web/components/ui/` (shadcn components)
- Create: `src/web/tailwind.config.ts` (if needed for shadcn)

**Step 1: Delete old index.html**

```bash
rm src/web/index.html
```

**Step 2: Initialize Next.js app**

```bash
cd src/web
bun init -y
```

Then overwrite `package.json`:

```json
{
  "name": "claude-agent-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^15",
    "react": "^19",
    "react-dom": "^19",
    "react-markdown": "^9",
    "class-variance-authority": "^0.7",
    "clsx": "^2",
    "tailwind-merge": "^3",
    "lucide-react": "^0.460"
  },
  "devDependencies": {
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@tailwindcss/postcss": "^4",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

**Step 3: Create config files**

`src/web/next.config.ts`:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: "out",
};

export default nextConfig;
```

`src/web/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "out"]
}
```

`src/web/postcss.config.mjs`:
```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

**Step 4: Install dependencies**

```bash
cd src/web && bun install
```

**Step 5: Create app layout and globals**

`src/web/app/globals.css`:
```css
@import "tailwindcss";

:root {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 224.3 76.3% 48%;
  --radius: 0.5rem;
}

body {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

`src/web/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claude Agent",
  description: "Claude Code Agent Chat UI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
```

`src/web/app/page.tsx` (placeholder):
```tsx
export default function Home() {
  return <div className="p-8 text-center text-muted-foreground">Loading chat...</div>;
}
```

**Step 6: Create lib/utils.ts** (needed by shadcn):

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Step 7: Verify it builds**

```bash
cd src/web && bun run build
```
Expected: Static files generated in `src/web/out/`

**Step 8: Commit**

```bash
git add -A src/web/
git commit -m "feat: scaffold Next.js app with Tailwind CSS and shadcn utils"
```

---

### Task 5: Update API Server to Serve Next.js Static Output

**Files:**
- Modify: `src/api/server.ts`
- Modify: `tsconfig.json` (exclude `src/web` from root typecheck)

**Step 1: Update server.ts to serve static files from `src/web/out/`**

Replace the current `/` route with a static file server that serves from `out/`:

```typescript
const webDir = resolve(import.meta.dir, "../web/out");
```

Update the Web UI route to try serving any path from the static output:

```typescript
// ── Web UI (static) ─────────────────────────────────────────────────────
if (method === "GET" && !path.startsWith("/api") && path !== "/ws" && path !== "/health") {
  const filePath = path === "/" ? "/index.html" : path;
  const file = Bun.file(resolve(webDir, filePath.slice(1)));
  if (await file.exists()) {
    return new Response(file, { headers: cors });
  }
}
```

**Step 2: Exclude `src/web` from root tsconfig**

In root `tsconfig.json`, add `src/web` to exclude:

```json
"exclude": ["node_modules", "src/web"]
```

**Step 3: Add root-level web scripts to package.json**

```json
"scripts": {
  "dev": "bun run --watch src/index.ts",
  "start": "bun run src/index.ts",
  "mcp": "bun run src/mcp/server.ts",
  "typecheck": "tsc --noEmit",
  "web:dev": "cd src/web && bun run dev",
  "web:build": "cd src/web && bun run build"
}
```

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/api/server.ts tsconfig.json package.json
git commit -m "feat: serve Next.js static output and add web scripts"
```

---

### Task 6: Shared Types

**Files:**
- Create: `src/web/lib/types.ts`

**Step 1: Create types**

```typescript
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  blocks: MessageBlock[];
  streaming?: boolean;
}

export type MessageBlock =
  | ThinkingBlock
  | TextBlock
  | ToolUseBlock
  | ToolResultBlock;

export interface ThinkingBlock {
  type: "thinking";
  content: string;
}

export interface TextBlock {
  type: "text";
  content: string;
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: string;
  status: "running" | "done" | "error";
}

export interface ToolResultBlock {
  type: "tool_result";
  id: string;
  content: string;
}

export type WsIncoming =
  | { type: "connected"; id: string }
  | { type: "chat:start" }
  | { type: "chat:thinking"; content: string }
  | { type: "chat:text"; content: string }
  | { type: "chat:tool_use"; id: string; name: string; input: string }
  | { type: "chat:tool_result"; id: string; content: string }
  | { type: "chat:done" }
  | { type: "chat:error"; error: string }
  | { type: "stopped" };
```

**Step 2: Commit**

```bash
git add src/web/lib/types.ts
git commit -m "feat: add shared frontend types for chat messages"
```

---

### Task 7: WebSocket Hook

**Files:**
- Create: `src/web/hooks/use-websocket.ts`

**Step 1: Create the hook**

This hook manages WebSocket connection, auto-reconnect, and parses incoming events into `ChatMessage` state updates. It exposes: `messages`, `isConnected`, `isStreaming`, `sendMessage`, `stopStreaming`.

The hook:
- Connects to `ws://host/ws` on mount
- Auto-reconnects on close with 2s delay
- On `chat:start`: appends a new assistant message with `streaming: true`
- On `chat:text`: appends text to the last block or creates a new text block
- On `chat:thinking`: appends to thinking block or creates one
- On `chat:tool_use`: adds a tool_use block with `status: "running"`
- On `chat:tool_result`: finds matching tool_use block, sets `status: "done"`, adds tool_result block
- On `chat:done`: sets `streaming: false`
- On `chat:error`: adds error text block

**Step 2: Commit**

```bash
git add src/web/hooks/use-websocket.ts
git commit -m "feat: add useWebSocket hook for chat state management"
```

---

### Task 8: UI Components — shadcn Primitives

**Files:**
- Create: `src/web/components/ui/button.tsx`
- Create: `src/web/components/ui/badge.tsx`
- Create: `src/web/components/ui/card.tsx`
- Create: `src/web/components/ui/collapsible.tsx`
- Create: `src/web/components/ui/textarea.tsx`

**Step 1: Install shadcn dependencies**

```bash
cd src/web && bun add @radix-ui/react-collapsible
```

**Step 2: Create each shadcn component**

Standard shadcn component implementations using CVA + Tailwind.

**Step 3: Commit**

```bash
git add src/web/components/ui/
git commit -m "feat: add shadcn UI primitives"
```

---

### Task 9: Chat Components

**Files:**
- Create: `src/web/components/connection-status.tsx`
- Create: `src/web/components/thinking-block.tsx`
- Create: `src/web/components/tool-use-block.tsx`
- Create: `src/web/components/message-bubble.tsx`
- Create: `src/web/components/chat-messages.tsx`
- Create: `src/web/components/chat-input.tsx`

**Step 1: Build each component**

- `connection-status`: Badge showing green/red dot + "Connected"/"Disconnected"
- `thinking-block`: Collapsible, header "Thinking..." with animation while streaming, shows content when expanded
- `tool-use-block`: Collapsible, header shows tool name + spinner/check/error badge, expanded shows JSON input + result
- `message-bubble`: Renders a ChatMessage — user messages right-aligned, assistant messages render blocks in order
- `chat-messages`: Scrollable list of message-bubble, auto-scrolls to bottom
- `chat-input`: Textarea + Send button, Enter to send, Shift+Enter for newline, disabled during streaming

**Step 2: Commit**

```bash
git add src/web/components/
git commit -m "feat: add chat UI components with tool use and thinking blocks"
```

---

### Task 10: Assemble Page + Integration Test

**Files:**
- Modify: `src/web/app/page.tsx`

**Step 1: Wire up page.tsx**

```tsx
"use client";

import { ChatMessages } from "@/components/chat-messages";
import { ChatInput } from "@/components/chat-input";
import { ConnectionStatus } from "@/components/connection-status";
import { useWebSocket } from "@/hooks/use-websocket";

export default function Home() {
  const { messages, isConnected, isStreaming, sendMessage, stopStreaming } = useWebSocket();

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <ConnectionStatus connected={isConnected} />
        <h1 className="text-lg font-semibold">Claude Agent</h1>
      </header>
      <ChatMessages messages={messages} />
      <ChatInput
        onSend={sendMessage}
        onStop={stopStreaming}
        disabled={!isConnected}
        streaming={isStreaming}
      />
    </div>
  );
}
```

**Step 2: Build and test**

```bash
cd src/web && bun run build
```

Then visit `http://localhost:3000/` in Chrome to verify:
- Page loads
- WebSocket connects (green indicator)
- Can type and send messages
- Streaming text appears incrementally
- Tool use blocks show with collapsible detail
- Thinking blocks collapse/expand

**Step 3: Commit**

```bash
git add src/web/app/page.tsx
git commit -m "feat: assemble chat page with all components"
```

---

### Task 11: Update Documentation

**Files:**
- Modify: `README.md`
- Modify: `README.zh-TW.md`
- Modify: `CLAUDE.md` (project structure)

**Step 1: Update project structure in docs**

Add `src/web/` details to all three files. Add new scripts `web:dev` and `web:build` to quick reference.

**Step 2: Commit**

```bash
git add README.md README.zh-TW.md CLAUDE.md
git commit -m "docs: update project structure for Next.js web UI"
```

---

## Task Summary

| # | Task | Files |
|---|------|-------|
| 1 | Stop hook | `hooks/on-stop.ts`, `settings.json` |
| 2 | Backend: StreamEvent types | `client.ts` |
| 3 | Backend: WebSocket protocol | `server.ts` |
| 4 | Scaffold Next.js app | `src/web/*` |
| 5 | Serve static output | `server.ts`, `tsconfig.json`, `package.json` |
| 6 | Shared types | `lib/types.ts` |
| 7 | WebSocket hook | `hooks/use-websocket.ts` |
| 8 | shadcn primitives | `components/ui/*` |
| 9 | Chat components | `components/*.tsx` |
| 10 | Assemble page + test | `app/page.tsx` |
| 11 | Update docs | `README.md`, `README.zh-TW.md`, `CLAUDE.md` |
