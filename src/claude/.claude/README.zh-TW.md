# 代理設定 — `.claude/`

> Claude Code 代理的設定目錄，位於 `src/claude/` 內。

## 檔案：`settings.json`

此檔案設定代理 Claude Code session 的**權限**與 **hooks**。

### 權限

```jsonc
"permissions": {
  "allow": [],  // 始終允許的工具模式（如 "Bash(bun *)"）
  "deny": []    // 始終拒絕的工具模式
}
```

- 使用 glob 模式匹配工具名稱與參數。
- 空陣列表示所有工具呼叫遵循正常的權限提示流程。

---

## Hooks

Hooks 是在特定生命週期事件觸發的 shell 指令。它們在**代理的工作目錄**（`src/claude/`）內執行。

### 通用輸入欄位

所有 hooks 都會從 stdin 接收 JSON，包含以下通用欄位：

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

| Exit Code | 意義 |
|---|---|
| `0` | 成功 — 允許操作繼續 |
| `2` | 阻止 — 阻止操作執行（僅適用於可阻止的事件） |
| 其他非零值 | 錯誤 — 行為依事件而異 |

### 通訊管道

| 管道 | 用途 |
|---|---|
| **stdin** | 從 Claude Code 接收事件 JSON |
| **stdout** | 輸出注入到 Claude 的上下文（作為系統訊息） |
| **stderr** | 顯示給使用者（或 PostToolUse 時顯示給 Claude）；用於阻止原因 |

---

## 所有 Hook 事件

### 總覽

| 事件 | 觸發時機 | 可阻止？ | 事件特有 stdin 欄位 |
|---|---|---|---|
| `SessionStart` | Session 開始 | 否 | `source` |
| `SessionEnd` | Session 結束 | 否 | （僅通用欄位） |
| `UserPromptSubmit` | 使用者提交 prompt | 是 | `prompt` |
| `PreToolUse` | 工具呼叫前 | 是 | `tool_name`、`tool_input` |
| `PostToolUse` | 工具呼叫成功後 | 否 | `tool_name`、`tool_input`、`tool_result` |
| `PreCompact` | 上下文壓縮前 | 否 | （僅通用欄位） |
| `Stop` | Claude 即將停止 | 是 | `stop_response`、`reason` |
| `SubagentStop` | 子代理即將停止 | 是 | `stop_response`、`reason` |
| `Notification` | 發出通知 | 否 | `message` |

---

### SessionStart

Session 開始時觸發。用於將上下文注入 Claude 的初始 prompt。

**Stdin：**
```json
{
  "session_id": "abc123",
  "hook_event_name": "SessionStart",
  "source": "startup"
}
```

`source` 可為：`"startup"`、`"resume"`、`"clear"` 或 `"compact"`。

**註冊方式：**
```json
"SessionStart": [
  {
    "hooks": ["bun hooks/on-session-start.ts"]
  }
]
```

**範例 — 注入當前時間與 git 分支：**
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

Session 結束時觸發。不可阻止。用於清理或記錄。

**註冊方式：**
```json
"SessionEnd": [
  {
    "hooks": ["bun hooks/on-session-end.ts"]
  }
]
```

**範例 — 記錄 session 結束：**
```ts
#!/usr/bin/env bun
const raw = await Bun.stdin.text();
try {
  const data = JSON.parse(raw);
  console.error(`[SessionEnd] Session ${data.session_id} 已結束`);
} catch {
  process.exit(0);
}
```

---

### UserPromptSubmit

使用者提交 prompt 時觸發，在 Claude 處理前執行。Exit `2` 可阻止。

**Stdin：**
```json
{
  "hook_event_name": "UserPromptSubmit",
  "prompt": "delete everything in /tmp"
}
```

**註冊方式：**
```json
"UserPromptSubmit": [
  {
    "matcher": "",
    "hooks": ["bun hooks/check-prompt.ts"]
  }
]
```

**範例 — 阻止包含危險關鍵字的 prompt：**
```ts
#!/usr/bin/env bun
const raw = await Bun.stdin.text();
try {
  const { prompt } = JSON.parse(raw);
  if (/drop\s+database|delete\s+everything/i.test(prompt ?? "")) {
    console.error("[Blocked] 偵測到危險 prompt");
    process.exit(2);
  }
} catch {}
process.exit(0);
```

---

### PreToolUse

每次工具呼叫前觸發。Exit `2` 可阻止該工具呼叫。

**Stdin：**
```json
{
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "rm -rf /"
  }
}
```

**註冊方式：**
```json
"PreToolUse": [
  {
    "matcher": "*",
    "hooks": ["bun hooks/pre-tool-use.ts"]
  }
]
```

`matcher` 欄位支援模式：`"*"` 匹配所有工具、`"Bash"` 僅匹配 Bash、`"Edit|Write"` 匹配 Edit 或 Write。

**範例 — 阻止危險指令：**
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
      console.error(`[Security] 已阻止: ${pattern}`);
      process.exit(2);
    }
  }
} catch {}
process.exit(0);
```

**範例 — 保護特定檔案不被編輯：**
```ts
#!/usr/bin/env bun
const PROTECTED = [".env", "secrets.json", "id_rsa"];

const raw = await Bun.stdin.text();
try {
  const data = JSON.parse(raw);
  if (data.tool_name === "Edit" || data.tool_name === "Write") {
    const filePath: string = data.tool_input?.file_path ?? "";
    if (PROTECTED.some((f) => filePath.includes(f))) {
      console.error(`[Security] 無法修改受保護的檔案: ${filePath}`);
      process.exit(2);
    }
  }
} catch {}
process.exit(0);
```

---

### PostToolUse

工具呼叫成功完成後觸發。不可阻止（工具已執行完畢）。Stderr 輸出會顯示給 Claude。

**Stdin：**
```json
{
  "hook_event_name": "PostToolUse",
  "tool_name": "Bash",
  "tool_input": { "command": "npm test" },
  "tool_result": "All 42 tests passed"
}
```

**註冊方式：**
```json
"PostToolUse": [
  {
    "matcher": "Bash",
    "hooks": ["bun hooks/post-tool-use.ts"]
  }
]
```

**範例 — 記錄所有 Bash 指令：**
```ts
#!/usr/bin/env bun
const raw = await Bun.stdin.text();
try {
  const data = JSON.parse(raw);
  if (data.tool_name === "Bash") {
    const cmd = data.tool_input?.command ?? "(unknown)";
    console.error(`[Audit] 已執行: ${cmd}`);
  }
} catch {}
process.exit(0);
```

**範例 — 寫入檔案後自動格式化：**
```ts
#!/usr/bin/env bun
const raw = await Bun.stdin.text();
try {
  const data = JSON.parse(raw);
  if (data.tool_name === "Write" || data.tool_name === "Edit") {
    const filePath: string = data.tool_input?.file_path ?? "";
    if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
      await Bun.$`bunx prettier --write ${filePath}`.quiet();
      console.error(`[PostToolUse] 已格式化: ${filePath}`);
    }
  }
} catch {}
process.exit(0);
```

---

### PreCompact

上下文壓縮前觸發。不可阻止。用於注入壓縮後仍需保留的重要上下文。

**註冊方式：**
```json
"PreCompact": [
  {
    "hooks": ["bun hooks/pre-compact.ts"]
  }
]
```

**範例 — 壓縮前提醒 Claude 重要規則：**
```ts
#!/usr/bin/env bun
console.log("[Important] 提交前務必執行測試。");
console.log("[Important] 不可修改 /production 目錄的檔案。");
```

**範例 — 重新注入當前任務狀態：**
```ts
#!/usr/bin/env bun
const todoFile = `${process.cwd()}/TODO.md`;
const file = Bun.file(todoFile);
if (await file.exists()) {
  const content = await file.text();
  console.log(`[PreCompact] 當前 TODO:\n${content}`);
}
```

---

### Stop

Claude 即將停止回應時觸發。Exit `2` 可阻止 Claude 停止（強制繼續）。

**Stdin：**
```json
{
  "hook_event_name": "Stop",
  "stop_response": "I've completed the task...",
  "reason": "end_turn"
}
```

**註冊方式：**
```json
"Stop": [
  {
    "hooks": ["bun hooks/on-stop.ts"]
  }
]
```

**範例 — 傳送桌面通知：**
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

**範例 — 回應太短時強制繼續：**
```ts
#!/usr/bin/env bun
const raw = await Bun.stdin.text();
try {
  const data = JSON.parse(raw);
  if ((data.stop_response ?? "").length < 50) {
    console.error("[Stop] 回應太短，繼續...");
    process.exit(2); // 阻止停止
  }
} catch {}
process.exit(0);
```

---

### SubagentStop

子代理（透過 Agent 工具啟動）即將停止時觸發。Exit `2` 可阻止其停止。

**Stdin：**
```json
{
  "hook_event_name": "SubagentStop",
  "stop_response": "Research complete...",
  "reason": "end_turn"
}
```

**註冊方式：**
```json
"SubagentStop": [
  {
    "hooks": ["bun hooks/on-subagent-stop.ts"]
  }
]
```

**範例 — 記錄子代理完成：**
```ts
#!/usr/bin/env bun
const raw = await Bun.stdin.text();
try {
  const data = JSON.parse(raw);
  console.error(`[SubagentStop] 子代理已完成 (${(data.stop_response ?? "").length} 字元)`);
} catch {}
process.exit(0);
```

**範例 — 子代理發生錯誤時強制繼續：**
```ts
#!/usr/bin/env bun
const raw = await Bun.stdin.text();
try {
  const data = JSON.parse(raw);
  const response: string = data.stop_response ?? "";
  if (/error|failed|exception/i.test(response) && data.reason === "end_turn") {
    console.error("[SubagentStop] 子代理因錯誤停止，強制重試...");
    process.exit(2);
  }
} catch {}
process.exit(0);
```

---

### Notification

Claude 發出通知時觸發。不可阻止。

**Stdin：**
```json
{
  "hook_event_name": "Notification",
  "message": "Task completed successfully"
}
```

**註冊方式：**
```json
"Notification": [
  {
    "hooks": ["bun hooks/on-notification.ts"]
  }
]
```

**範例 — 轉發通知到 webhook：**
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

**範例 — 通知時播放音效（macOS）：**
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

## Hook 開發規則

1. 從 `Bun.stdin.text()` 讀取輸入並解析為 JSON。
2. 優雅處理 JSON 解析失敗 — 以 `process.exit(0)` 作為 fallback。
3. 不可寫入 stdout，除非需要將上下文注入 Claude。
4. 不可拋出未處理的例外 — 捕獲所有錯誤並 exit `0`。
5. 使用 exit `2`（非 `1`）來阻止可阻止事件的操作。

## 新增 Hook

1. 在 `hooks/` 目錄建立 `.ts` 檔案。
2. 在 `settings.json` 的對應事件下註冊。
3. 遵循上述慣例。

完整參考請見 [Claude Code Hooks 文件](https://code.claude.com/docs/en/hooks)。
