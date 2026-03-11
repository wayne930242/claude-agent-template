# Claude Code Agent 模板

以 Claude Code 為核心的 AI Agent 模板，提供 HTTP/WebSocket API、MCP 工具與 hooks 系統。

**[English README →](README.md)**

---

## 快速開始

### Docker（推薦）

```bash
git clone https://github.com/wayne930242/claude-agent-template
cd claude-agent-template

# 在本機取得 OAuth token（不要在 Docker 內執行）
claude setup-token
# 複製 sk-ant-oat01-... token

cp .env.example .env
# 編輯 .env: CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...

docker compose up                            # 正式模式
docker compose -f docker-compose.dev.yml up  # 開發模式 (hot reload)
```

### 本機開發

```bash
# 需要安裝: bun + Claude Code CLI
cp .env.example .env
# 編輯 .env: CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...

bun install
cd src/web && bun install && bun run build && cd ../..
bun run dev
```

測試：
```bash
curl http://localhost:3000/health
# 開啟 http://localhost:3000 查看聊天介面
```

---

## Docker 模式

| 模式 | 指令 | 說明 |
|---|---|---|
| **正式模式** | `docker compose up` | 程式碼打包進映像檔，適合部署 |
| **開發模式** | `docker compose -f docker-compose.dev.yml up` | 掛載本機 `src/`，修改後自動重啟 |

### 開發模式細節

- **Hot reload** — 本機 `./src` 掛載至容器 `/app/src`，改 code 後 `bun run --watch` 自動重啟
- **認證持久化** — `claude_auth` volume 保留 Claude 登入狀態，重建容器不需重新登入
- **環境變數** — 從 `.env` 檔讀取

```bash
# 首次建置
docker compose -f docker-compose.dev.yml up --build

# 之後啟動（不需重建）
docker compose -f docker-compose.dev.yml up

# 背景執行
docker compose -f docker-compose.dev.yml up -d

# 查看 logs
docker compose -f docker-compose.dev.yml logs -f
```

---

## 專案結構

```
src/
├── index.ts              ← 入口
├── config.ts             ← 環境設定
├── api/server.ts         ← HTTP + WebSocket 伺服器（提供靜態 UI + API）
├── mcp/
│   ├── server.ts         ← MCP server 入口
│   └── tools/hello.ts    ← 範例工具 — 在此新增工具
├── web/                  ← Next.js 聊天介面（靜態輸出）
│   ├── app/              ← Next.js app router 頁面
│   ├── components/       ← 聊天 UI（訊息、輸入框、工具區塊）
│   ├── components/ui/    ← shadcn 原件
│   ├── hooks/            ← useWebSocket hook
│   └── lib/types.ts      ← 共用訊息型別
└── claude/               ← Agent 工作區 (CLAUDE_PROJECT_DIR)
    ├── CLAUDE.md         ← Agent 憲法（行為規範與上下文）
    ├── client.ts         ← Headless runner（執行 `claude -p`）
    ├── .mcp.json         ← 向 Claude Code 註冊 MCP server
    ├── .claude/
    │   └── settings.json ← Agent hooks 與權限設定
    └── hooks/
        ├── on-session-start.ts  ← Session 開始時注入上下文
        ├── pre-tool-use.ts      ← 安全閘道（可阻擋危險呼叫）
        └── on-stop.ts           ← Session 結束通知
```

**關鍵分離：** `src/` 是 Bot 伺服器；`src/claude/` 是 Agent 工作區，Claude Code 在此執行。

---

## 運作原理

```
使用者 (HTTP 或 WebSocket)
        ↓
  src/api/server.ts        ← 接收請求
        ↓
  src/claude/client.ts     ← 執行: claude -p "..." --output-format stream-json
        ↓
  Claude Code 程序          ← 讀取 CLAUDE.md、執行 hooks、呼叫 MCP 工具
        ↓
  src/mcp/server.ts        ← 自訂工具（透過 src/claude/.mcp.json 啟動）
```

---

## 自訂開發

### 1. Agent 行為 — `src/claude/CLAUDE.md`

編輯 `<law>` 區塊來定義 Agent 的規則：

```markdown
<law>
**Law 1: Focus** — 只協助 [你的領域] 相關的任務
**Law 2: Style** — 一律以 [你偏好的語言] 回應
</law>
```

### 2. 新增 MCP 工具 — `src/mcp/tools/`

```typescript
// src/mcp/tools/my-tool.ts
export function registerMyTools(server: McpServer): void {
  server.registerTool("my_tool", {
    title: "My Tool",
    description: "這個工具的用途",
    inputSchema: { query: z.string().describe("搜尋關鍵字") },
  }, async ({ query }) => {
    return { content: [{ type: "text", text: `Result: ${query}` }] };
  });
}
```

然後在 `src/mcp/server.ts` 中註冊：

```typescript
import { registerMyTools } from "./tools/my-tool";
registerMyTools(server);
```

### 3. 新增 Hooks — `src/claude/hooks/`

```typescript
// src/claude/hooks/on-stop.ts
const input = JSON.parse(await Bun.stdin.text());
console.error("[Session ended]", input.stop_response?.length, "chars");
```

在 `src/claude/.claude/settings.json` 中註冊：

```json
{ "hooks": { "Stop": [{ "hooks": ["bun hooks/on-stop.ts"] }] } }
```

---

## API

| 方法 | 路徑 | 說明 |
|------|------|------|
| `GET` | `/health` | 健康檢查 |
| `POST` | `/api/chat` | 一次性對話: `{"message": "..."}` |
| `WS` | `/ws` | 串流對話 |

### WebSocket 範例

```javascript
const ws = new WebSocket("ws://localhost:3000/ws");
ws.send(JSON.stringify({ type: "chat", content: "你好" }));
ws.onmessage = ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.type === "chat:text") process.stdout.write(msg.content);
  if (msg.type === "chat:done") console.log("\n[完成]");
};
```

### WebSocket 訊息格式

Client → Server:
- `{ "type": "chat", "content": "你的訊息" }` — 發送對話
- `{ "type": "stop" }` — 中止串流

Server → Client:
- `{ "type": "connected", "id": "..." }` — 連線成功
- `{ "type": "chat:start" }` — 開始回應
- `{ "type": "chat:thinking", "content": "..." }` — 思考過程
- `{ "type": "chat:text", "content": "..." }` — 串流文字片段
- `{ "type": "chat:tool_use", "id": "...", "name": "...", "input": "..." }` — 開始呼叫工具
- `{ "type": "chat:tool_result", "id": "...", "content": "..." }` — 工具回傳結果
- `{ "type": "chat:done" }` — 回應結束
- `{ "type": "chat:error", "error": "..." }` — 錯誤

---

## 環境變數

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `CLAUDE_CODE_OAUTH_TOKEN` | — | **必填** — 透過 `claude setup-token` 取得 |
| `API_PORT` | `3000` | HTTP 伺服器 port |
| `API_KEY` | — | 選填，API 認證金鑰（未設定則開放存取） |
| `CLAUDE_BIN` | `claude` | Claude Code CLI 路徑 |
| `CLAUDE_PROJECT_DIR` | `src/claude` | Agent 工作區目錄（Docker 內自動設為 `/app/src/claude`） |
| `API_BASE` | `http://127.0.0.1:3000` | 內部呼叫用的 base URL |

---

## License

MIT
