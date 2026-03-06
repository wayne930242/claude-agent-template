/**
 * HTTP + WebSocket API Server
 *
 * Provides:
 *   GET  /health         → health check
 *   POST /api/chat       → one-shot chat (non-streaming)
 *   WS   /ws             → streaming chat
 *
 * WebSocket message format (client → server):
 *   { "type": "chat", "content": "your message" }
 *   { "type": "stop" }
 *
 * WebSocket message format (server → client):
 *   { "type": "chat:start" }
 *   { "type": "chat:text", "content": "..." }    ← streaming text
 *   { "type": "chat:done" }
 *   { "type": "chat:error", "error": "..." }
 */

import type { ServerWebSocket } from "bun";
import { config } from "../config";
import { streamClaude } from "../claude/client";

// ── Auth ──────────────────────────────────────────────────────────────────────

function isAuthorized(req: Request): boolean {
  if (!config.api.key) return true; // no key = open (dev mode)
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("key");
  const fromHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
  return fromQuery === config.api.key || fromHeader === config.api.key;
}

// ── WebSocket clients ─────────────────────────────────────────────────────────

interface WsData {
  id: string;
  abortController: AbortController | null;
}

// ── Server ────────────────────────────────────────────────────────────────────

export function startApiServer(port = config.api.port) {
  const server = Bun.serve<WsData>({
    port,
    hostname: "0.0.0.0",

    async fetch(req, server) {
      let url: URL;
      try {
        url = new URL(req.url);
      } catch {
        return new Response("Bad Request", { status: 400 });
      }

      const path = url.pathname;
      const method = req.method;

      const cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      };

      if (method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors });
      }

      // ── Health ──────────────────────────────────────────────────────────────
      if (path === "/health" && method === "GET") {
        return Response.json({ status: "ok" }, { headers: cors });
      }

      // ── WebSocket upgrade ───────────────────────────────────────────────────
      if (path === "/ws") {
        if (!isAuthorized(req)) return new Response("Unauthorized", { status: 401 });
        const upgraded = server.upgrade(req, {
          data: { id: crypto.randomUUID(), abortController: null },
        });
        if (upgraded) return undefined;
        return new Response("WebSocket upgrade failed", { status: 400 });
      }

      // ── One-shot chat ───────────────────────────────────────────────────────
      if (path === "/api/chat" && method === "POST") {
        if (!isAuthorized(req)) return new Response("Unauthorized", { status: 401 });

        const body = await req.json().catch(() => null) as { message?: string } | null;
        if (!body?.message) {
          return Response.json({ error: "message required" }, { status: 400, headers: cors });
        }

        let response = "";
        for await (const event of streamClaude(body.message)) {
          if (event.type === "done") response = event.content;
        }
        return Response.json({ response }, { headers: cors });
      }

      return Response.json({ error: "Not found" }, { status: 404, headers: cors });
    },

    websocket: {
      open(ws: ServerWebSocket<WsData>) {
        console.log(`[WS] Client connected: ${ws.data.id}`);
        ws.send(JSON.stringify({ type: "connected", id: ws.data.id }));
      },

      async message(ws: ServerWebSocket<WsData>, raw: string | Buffer) {
        let msg: { type: string; content?: string };
        try {
          msg = JSON.parse(String(raw));
        } catch {
          ws.send(JSON.stringify({ type: "error", error: "Invalid JSON" }));
          return;
        }

        if (msg.type === "stop") {
          ws.data.abortController?.abort();
          ws.data.abortController = null;
          ws.send(JSON.stringify({ type: "stopped" }));
          return;
        }

        if (msg.type === "chat" && msg.content) {
          // Abort any in-flight request
          ws.data.abortController?.abort();
          const controller = new AbortController();
          ws.data.abortController = controller;

          ws.send(JSON.stringify({ type: "chat:start" }));

          try {
            for await (const event of streamClaude(msg.content, { signal: controller.signal })) {
              if (event.type === "text") {
                ws.send(JSON.stringify({ type: "chat:text", content: event.content }));
              } else if (event.type === "error") {
                ws.send(JSON.stringify({ type: "chat:error", error: event.content }));
                return;
              }
            }
            ws.send(JSON.stringify({ type: "chat:done" }));
          } catch (error) {
            ws.send(JSON.stringify({ type: "chat:error", error: String(error) }));
          } finally {
            ws.data.abortController = null;
          }
        }
      },

      close(ws: ServerWebSocket<WsData>) {
        ws.data.abortController?.abort();
        console.log(`[WS] Client disconnected: ${ws.data.id}`);
      },
    },
  });

  console.log(`[API] Server started on port ${port}`);
  return server;
}
