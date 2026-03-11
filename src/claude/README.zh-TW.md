# 代理工作區 — `src/claude/`

> 這是 Claude Code 代理的工作目錄。當 bot 啟動 Claude Code session 時，會以 `CLAUDE_PROJECT_DIR=src/claude` 在此目錄內執行。

## 目錄結構

```
src/claude/
  CLAUDE.md              <- 代理憲法（法則、用途、備註）
  client.ts              <- 無頭 Claude 執行器（啟動 `claude -p`）
  start-mcp.sh           <- 啟動 MCP 伺服器的 shell 腳本
  .mcp.json              <- MCP 伺服器設定（見 docs/mcp-config.zh-TW.md）
  .claude/
    settings.json        <- 權限與 hooks 設定（見 .claude/README.zh-TW.md）
  hooks/
    on-session-start.ts  <- SessionStart hook — 注入執行階段上下文
    pre-tool-use.ts      <- PreToolUse hook — 安全閘門
    on-stop.ts           <- Stop hook — 桌面通知
```

## 運作方式

1. `client.ts` 透過 `claude -p` 啟動無頭 Claude Code 程序。
2. Claude Code 讀取 `CLAUDE.md` 作為代理的系統指令。
3. Claude Code 讀取 `.claude/settings.json` 取得權限與 hooks 設定。
4. Claude Code 讀取 `.mcp.json` 並啟動 MCP 伺服器提供自訂工具。
5. Hooks 在生命週期事件觸發（session 開始、工具呼叫前後、停止）。

## 重要檔案

### `CLAUDE.md` — 代理憲法

定義代理的個性與規則。編輯此檔案以設定：

- **法則（Laws）** — 不可違反的規則（包在 `<law>` 標籤中）
- **用途** — 代理的目的
- **可用工具** — 記錄代理可使用的 MCP 工具
- **備註** — 代理應始終知道的執行階段資訊

```markdown
<law>
**Law 1: Communication**
- Be concise and actionable
- Respond in the same language as the user
</law>
```

### `.claude/settings.json` — Hooks 與權限

設定生命週期 hooks 與工具權限。完整的 9 種 hook 事件參考與範例請見 [`.claude/README.zh-TW.md`](.claude/README.zh-TW.md)。

### `.mcp.json` — MCP 伺服器設定

定義代理可存取的 MCP 伺服器。設定細節請見 [`docs/mcp-config.zh-TW.md`](../../docs/mcp-config.zh-TW.md)。

### `hooks/` — Hook 腳本

在特定生命週期事件執行的 hook 腳本：

| 檔案 | 事件 | 用途 |
|---|---|---|
| `on-session-start.ts` | `SessionStart` | 注入當前時間到上下文 |
| `pre-tool-use.ts` | `PreToolUse` | 阻止危險模式（rm -rf、SSH 金鑰、prompt 注入） |
| `on-stop.ts` | `Stop` | Session 結束時傳送桌面通知 |

### `client.ts` — 無頭 Claude 執行器

以程式化方式啟動與管理 Claude Code session。由 bot 的 API 伺服器用來處理使用者請求。

### `start-mcp.sh` — MCP 啟動器

解析正確路徑並執行 `bun run ../mcp/server.ts` 的 shell 腳本。由 `.mcp.json` 引用。

## 自訂指南

### 修改代理行為

編輯 `CLAUDE.md` — 新增法則、更新用途、記錄工具。

### 新增安全規則

編輯 `hooks/pre-tool-use.ts` — 在 `BLOCKED` 陣列中新增正規表達式。

### 新增執行階段上下文

編輯 `hooks/on-session-start.ts` — 新增 `console.log()` 呼叫以注入資訊。

### 新增生命週期 hooks

1. 在 `hooks/` 建立 hook 腳本。
2. 在 `.claude/settings.json` 中註冊。
3. 完整的 9 種 hook 事件請見 [`.claude/README.zh-TW.md`](.claude/README.zh-TW.md)。

### 新增自訂工具

1. 在 `src/mcp/tools/` 建立工具。
2. 在 `src/mcp/server.ts` 中註冊。
3. 開發指南請見 [`src/mcp/README.zh-TW.md`](../mcp/README.zh-TW.md)。
