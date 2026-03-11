# MCP 伺服器

> 此目錄包含 MCP（Model Context Protocol）伺服器，透過自訂工具擴展 Claude Code 代理的能力。代理透過 stdio 傳輸連接此伺服器，設定於 `src/claude/.mcp.json`。

## 架構

```
src/mcp/
  server.ts          <- MCP 伺服器進入點（stdio 傳輸）
  tools/
    hello.ts         <- 範例工具 — 作為模板使用
    your-tool.ts     <- 在此新增工具
```

```
src/claude/.mcp.json -> start-mcp.sh -> bun run src/mcp/server.ts
```

## 運作方式

1. 代理啟動時，Claude Code 讀取 `src/claude/.mcp.json`。
2. 啟動 `start-mcp.sh`，執行 `bun run src/mcp/server.ts`。
3. 伺服器註冊所有工具並透過 stdio 連接。
4. 代理在 session 期間可以呼叫這些工具。

## 新增工具

### 步驟 1：建立工具檔案

在 `src/mcp/tools/` 建立新檔案，如 `weather.ts`：

```ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerWeatherTools(server: McpServer): void {
  server.registerTool(
    "get_weather",
    {
      title: "Get Weather",
      description: "取得指定城市的目前天氣。",
      inputSchema: {
        city: z.string().describe("城市名稱（如 'Tokyo'）"),
        unit: z
          .enum(["celsius", "fahrenheit"])
          .default("celsius")
          .describe("溫度單位"),
      },
    },
    async ({ city, unit }) => {
      // 在此實作邏輯
      const temp = unit === "celsius" ? "22°C" : "72°F";
      return {
        content: [
          { type: "text", text: `${city} 天氣：${temp}，晴天` },
        ],
      };
    },
  );
}
```

### 步驟 2：在 `server.ts` 中註冊

```ts
import { registerHelloTools } from "./tools/hello";
import { registerWeatherTools } from "./tools/weather";

// 註冊工具
registerHelloTools(server);
registerWeatherTools(server);
```

### 步驟 3：執行型別檢查

```bash
bun run typecheck
```

## 慣例

- **僅使用具名匯出** — 匯出 `register<Name>Tools(server: McpServer): void`
- **Zod 驗證** — 每個輸入欄位使用 `.describe("...")`
- **回傳格式** — 必須回傳 `{ content: [{ type: "text", text: "..." }] }`
- **日誌** — 僅使用 `console.error()`（stdout 保留給 MCP 協議）
- **禁止 `console.log`** — 會破壞 stdio 傳輸
- **禁止 default export**

## 回傳類型

### 文字回應（最常見）

```ts
return {
  content: [{ type: "text", text: "結果" }],
};
```

### 多個內容區塊

```ts
return {
  content: [
    { type: "text", text: "摘要：..." },
    { type: "text", text: JSON.stringify(data, null, 2) },
  ],
};
```

### 錯誤回應

```ts
return {
  content: [{ type: "text", text: "Error: 找不到城市" }],
  isError: true,
};
```

## 測試

獨立測試 MCP 伺服器：

```bash
bun run mcp
```

或透過 stdin（JSON-RPC）測試特定工具：

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"hello","arguments":{"name":"World"}}}' | bun run src/mcp/server.ts
```

## 完整範例：資料庫查詢工具

```ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerDbTools(server: McpServer): void {
  server.registerTool(
    "query_tasks",
    {
      title: "Query Tasks",
      description: "查詢資料庫中的任務，可依狀態篩選。",
      inputSchema: {
        status: z
          .enum(["pending", "in_progress", "done"])
          .optional()
          .describe("依任務狀態篩選"),
        limit: z
          .number()
          .min(1)
          .max(100)
          .default(10)
          .describe("最大結果數量"),
      },
    },
    async ({ status, limit }) => {
      try {
        // 替換為實際的資料庫查詢
        const tasks = await db.query(
          `SELECT * FROM tasks WHERE ($1::text IS NULL OR status = $1) LIMIT $2`,
          [status ?? null, limit],
        );
        return {
          content: [
            { type: "text", text: JSON.stringify(tasks, null, 2) },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[MCP ERROR] query_tasks failed: ${message}`);
        return {
          content: [{ type: "text", text: `Error: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
```
