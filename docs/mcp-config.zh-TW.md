# MCP 設定 — `.mcp.json`

> 位於 `src/claude/.mcp.json`。定義代理可使用的 MCP 伺服器。

## 檔案：`.mcp.json`

此檔案定義代理可使用的 MCP（Model Context Protocol）伺服器。位於代理工作目錄（`src/claude/`）。

### 目前設定

```json
{
  "mcpServers": {
    "my-agent": {
      "type": "stdio",
      "command": "bash",
      "args": ["start-mcp.sh"]
    }
  }
}
```

### 欄位說明

| 欄位 | 說明 |
|---|---|
| `mcpServers` | 伺服器名稱 -> 伺服器設定的對應表 |
| `type` | 傳輸類型。本地程序使用 `"stdio"` |
| `command` | 要執行的程式 |
| `args` | 傳遞給程式的參數 |

### 運作方式

1. 代理啟動時，Claude Code 讀取 `.mcp.json` 並啟動每個 MCP 伺服器。
2. `start-mcp.sh` 解析正確路徑後執行 `bun run ../mcp/server.ts`。
3. MCP 伺服器透過 stdio 提供工具（定義在 `src/mcp/tools/`）。
4. 代理在 session 期間可以呼叫這些工具。

### 新增 MCP 伺服器

在 `mcpServers` 下新增項目：

```json
{
  "mcpServers": {
    "my-agent": {
      "type": "stdio",
      "command": "bash",
      "args": ["start-mcp.sh"]
    },
    "another-server": {
      "type": "stdio",
      "command": "bun",
      "args": ["run", "path/to/server.ts"]
    }
  }
}
```

### 新增工具

要在現有的 `my-agent` MCP 伺服器新增工具：

1. 在 `src/mcp/tools/` 建立檔案（如 `my-tool.ts`）。
2. 匯出 `registerMyToolTools(server: McpServer)` 函式。
3. 在 `src/mcp/server.ts` 中註冊。

範例請見 `src/mcp/tools/hello.ts`，或參閱 [`src/mcp/README.zh-TW.md`](../src/mcp/README.zh-TW.md) 取得完整開發指南。
