# Agent Settings — `.claude/`

> Configuration directory for the Claude Code agent running inside `src/claude/`.

## File: `settings.json`

This file configures **permissions** and **hooks** for the agent's Claude Code session.

### Permissions

```jsonc
"permissions": {
  "allow": [],  // Tool patterns always allowed (e.g. "Bash(bun *)")
  "deny": []    // Tool patterns always denied
}
```

- Use glob patterns to match tool names and arguments.
- Empty arrays mean all tool calls follow normal permission prompting.

---

## Hooks

Hooks are shell commands triggered at specific lifecycle events. They run **inside the agent's working directory** (`src/claude/`).

### Common Input Fields

All hooks receive JSON via stdin with these common fields:

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/path/to/working-dir",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse"
}
```

### Exit Codes

| Exit Code | Meaning |
|---|---|
| `0` | Success — allow the action to proceed |
| `2` | Block — prevent the action (only for blockable events) |
| Other non-zero | Error — behavior varies by event |

### Communication Channels

| Channel | Purpose |
|---|---|
| **stdin** | Receives event JSON from Claude Code |
| **stdout** | Output injected into Claude's context (as system message) |
| **stderr** | Shown to user (or to Claude for PostToolUse); used for block reasons |

---

## All Hook Events

### Overview

| Event | When it fires | Can block? | Event-specific stdin fields |
|---|---|---|---|
| `SessionStart` | Session begins | No | `source` |
| `SessionEnd` | Session ends | No | (common fields only) |
| `UserPromptSubmit` | User submits a prompt | Yes | `prompt` |
| `PreToolUse` | Before a tool call | Yes | `tool_name`, `tool_input` |
| `PostToolUse` | After a tool call succeeds | No | `tool_name`, `tool_input`, `tool_result` |
| `PreCompact` | Before context compaction | No | (common fields only) |
| `Stop` | Claude is about to stop | Yes | `stop_response`, `reason` |
| `SubagentStop` | A subagent is about to stop | Yes | `stop_response`, `reason` |
| `Notification` | A notification is emitted | No | `message` |

---

### SessionStart

Fires when the session begins. Use it to inject context into Claude's initial prompt.

**Stdin:**
```json
{
  "session_id": "abc123",
  "hook_event_name": "SessionStart",
  "source": "startup"
}
```

`source` can be: `"startup"`, `"resume"`, `"clear"`, or `"compact"`.

**Registration:**
```json
"SessionStart": [
  {
    "hooks": ["bun hooks/on-session-start.ts"]
  }
]
```

**Example — inject current time and git branch:**
```ts
#!/usr/bin/env bun
const now = new Date().toLocaleString("en-US", {
  timeZone: process.env.TZ || "UTC",
  weekday: "long", year: "numeric", month: "long",
  day: "numeric", hour: "2-digit", minute: "2-digit",
});

const branch = await Bun.$`git branch --show-current`.text();
console.log(`[Session] Started: ${now}`);
console.log(`[Session] Branch: ${branch.trim()}`);
```

---

### SessionEnd

Fires when the session ends. Cannot block. Use for cleanup or logging.

**Registration:**
```json
"SessionEnd": [
  {
    "hooks": ["bun hooks/on-session-end.ts"]
  }
]
```

**Example — log session end:**
```ts
#!/usr/bin/env bun
const raw = await Bun.stdin.text();
try {
  const data = JSON.parse(raw);
  console.error(`[SessionEnd] Session ${data.session_id} ended`);
} catch {
  process.exit(0);
}
```

---

### UserPromptSubmit

Fires when the user submits a prompt, before Claude processes it. Exit `2` to block.

**Stdin:**
```json
{
  "hook_event_name": "UserPromptSubmit",
  "prompt": "delete everything in /tmp"
}
```

**Registration:**
```json
"UserPromptSubmit": [
  {
    "matcher": "",
    "hooks": ["bun hooks/check-prompt.ts"]
  }
]
```

**Example — block prompts containing sensitive keywords:**
```ts
#!/usr/bin/env bun
const raw = await Bun.stdin.text();
try {
  const { prompt } = JSON.parse(raw);
  if (/drop\s+database|delete\s+everything/i.test(prompt ?? "")) {
    console.error("[Blocked] Dangerous prompt detected");
    process.exit(2);
  }
} catch {}
process.exit(0);
```

---

### PreToolUse

Fires before every tool call. Exit `2` to block the tool call.

**Stdin:**
```json
{
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "rm -rf /"
  }
}
```

**Registration:**
```json
"PreToolUse": [
  {
    "matcher": "*",
    "hooks": ["bun hooks/pre-tool-use.ts"]
  }
]
```

The `matcher` field supports patterns: `"*"` matches all tools, `"Bash"` matches only Bash, `"Edit|Write"` matches Edit or Write.

**Example — block dangerous commands:**
```ts
#!/usr/bin/env bun
const BLOCKED = [
  /\brm\s+-rf\s+\//,
  /\/etc\/(passwd|shadow)/,
];

const raw = await Bun.stdin.text();
try {
  const data = JSON.parse(raw);
  const input = JSON.stringify(data.tool_input ?? {});
  for (const pattern of BLOCKED) {
    if (pattern.test(input)) {
      console.error(`[Security] Blocked: ${pattern}`);
      process.exit(2);
    }
  }
} catch {}
process.exit(0);
```

**Example — protect specific files from being edited:**
```ts
#!/usr/bin/env bun
const PROTECTED = [".env", "secrets.json", "id_rsa"];

const raw = await Bun.stdin.text();
try {
  const data = JSON.parse(raw);
  if (data.tool_name === "Edit" || data.tool_name === "Write") {
    const filePath: string = data.tool_input?.file_path ?? "";
    if (PROTECTED.some((f) => filePath.includes(f))) {
      console.error(`[Security] Cannot modify protected file: ${filePath}`);
      process.exit(2);
    }
  }
} catch {}
process.exit(0);
```

---

### PostToolUse

Fires after a tool call completes successfully. Cannot block (tool already ran). Stderr output is shown to Claude.

**Stdin:**
```json
{
  "hook_event_name": "PostToolUse",
  "tool_name": "Bash",
  "tool_input": { "command": "npm test" },
  "tool_result": "All 42 tests passed"
}
```

**Registration:**
```json
"PostToolUse": [
  {
    "matcher": "Bash",
    "hooks": ["bun hooks/post-tool-use.ts"]
  }
]
```

**Example — log all Bash commands:**
```ts
#!/usr/bin/env bun
const raw = await Bun.stdin.text();
try {
  const data = JSON.parse(raw);
  if (data.tool_name === "Bash") {
    const cmd = data.tool_input?.command ?? "(unknown)";
    console.error(`[Audit] Ran: ${cmd}`);
  }
} catch {}
process.exit(0);
```

**Example — auto-format after file writes:**
```ts
#!/usr/bin/env bun
const raw = await Bun.stdin.text();
try {
  const data = JSON.parse(raw);
  if (data.tool_name === "Write" || data.tool_name === "Edit") {
    const filePath: string = data.tool_input?.file_path ?? "";
    if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
      await Bun.$`bunx prettier --write ${filePath}`.quiet();
      console.error(`[PostToolUse] Formatted: ${filePath}`);
    }
  }
} catch {}
process.exit(0);
```

---

### PreCompact

Fires before context compaction. Cannot block. Use to inject important context that should survive compaction.

**Registration:**
```json
"PreCompact": [
  {
    "hooks": ["bun hooks/pre-compact.ts"]
  }
]
```

**Example — remind Claude of critical rules before compaction:**
```ts
#!/usr/bin/env bun
console.log("[Important] Always run tests before committing.");
console.log("[Important] Never modify files in /production.");
```

**Example — re-inject current task status:**
```ts
#!/usr/bin/env bun
const todoFile = `${process.cwd()}/TODO.md`;
const file = Bun.file(todoFile);
if (await file.exists()) {
  const content = await file.text();
  console.log(`[PreCompact] Current TODO:\n${content}`);
}
```

---

### Stop

Fires when Claude is about to stop responding. Exit `2` to prevent Claude from stopping (forces it to continue).

**Stdin:**
```json
{
  "hook_event_name": "Stop",
  "stop_response": "I've completed the task...",
  "reason": "end_turn"
}
```

**Registration:**
```json
"Stop": [
  {
    "hooks": ["bun hooks/on-stop.ts"]
  }
]
```

**Example — send desktop notification:**
```ts
#!/usr/bin/env bun
const raw = await Bun.stdin.text();
try {
  const data = JSON.parse(raw);
  const charCount = (data.stop_response ?? "").length;
  const title = "Claude Agent";
  const message = `Session completed (${charCount} chars)`;

  if (process.platform === "darwin") {
    await Bun.$`osascript -e 'display notification "${message}" with title "${title}" sound name "Glass"'`.quiet();
  } else if (process.platform === "linux") {
    await Bun.$`notify-send "${title}" "${message}"`.quiet();
  }
  console.error(`[Stop] ${message}`);
} catch {}
process.exit(0);
```

**Example — force continue if response is too short:**
```ts
#!/usr/bin/env bun
const raw = await Bun.stdin.text();
try {
  const data = JSON.parse(raw);
  if ((data.stop_response ?? "").length < 50) {
    console.error("[Stop] Response too short, continuing...");
    process.exit(2); // prevents stopping
  }
} catch {}
process.exit(0);
```

---

### SubagentStop

Fires when a subagent (spawned via the Agent tool) is about to stop. Exit `2` to prevent it from stopping.

**Stdin:**
```json
{
  "hook_event_name": "SubagentStop",
  "stop_response": "Research complete...",
  "reason": "end_turn"
}
```

**Registration:**
```json
"SubagentStop": [
  {
    "hooks": ["bun hooks/on-subagent-stop.ts"]
  }
]
```

**Example — log subagent completions:**
```ts
#!/usr/bin/env bun
const raw = await Bun.stdin.text();
try {
  const data = JSON.parse(raw);
  console.error(`[SubagentStop] Subagent finished (${(data.stop_response ?? "").length} chars)`);
} catch {}
process.exit(0);
```

**Example — force subagent to continue if it stopped with an error:**
```ts
#!/usr/bin/env bun
const raw = await Bun.stdin.text();
try {
  const data = JSON.parse(raw);
  const response: string = data.stop_response ?? "";
  if (/error|failed|exception/i.test(response) && data.reason === "end_turn") {
    console.error("[SubagentStop] Subagent stopped with error, forcing retry...");
    process.exit(2);
  }
} catch {}
process.exit(0);
```

---

### Notification

Fires when Claude emits a notification. Cannot block.

**Stdin:**
```json
{
  "hook_event_name": "Notification",
  "message": "Task completed successfully"
}
```

**Registration:**
```json
"Notification": [
  {
    "hooks": ["bun hooks/on-notification.ts"]
  }
]
```

**Example — forward notifications to a webhook:**
```ts
#!/usr/bin/env bun
const raw = await Bun.stdin.text();
try {
  const data = JSON.parse(raw);
  const webhookUrl = process.env.WEBHOOK_URL;
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: data.message }),
    });
  }
} catch {}
process.exit(0);
```

**Example — play a sound on notification (macOS):**
```ts
#!/usr/bin/env bun
const raw = await Bun.stdin.text();
try {
  const data = JSON.parse(raw);
  if (process.platform === "darwin") {
    await Bun.$`afplay /System/Library/Sounds/Ping.aiff`.quiet();
  }
  console.error(`[Notification] ${data.message}`);
} catch {}
process.exit(0);
```

---

## Hook Development Rules

1. Read input from `Bun.stdin.text()` and parse as JSON.
2. Handle JSON parse failures gracefully — call `process.exit(0)` as fallback.
3. Never write to stdout unless you intend to inject context into Claude.
4. Never throw unhandled exceptions — catch all errors and exit `0`.
5. Use exit `2` (not `1`) to block actions on blockable events.

## Adding a New Hook

1. Create a `.ts` file in `hooks/`.
2. Register it in `settings.json` under the appropriate event.
3. Follow the conventions above.

See the [Claude Code Hooks documentation](https://code.claude.com/docs/en/hooks) for full reference.
