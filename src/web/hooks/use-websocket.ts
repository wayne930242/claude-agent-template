"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ChatMessage, WsIncoming, MessageBlock } from "@/lib/types";

/** Update blocks of the last assistant message via setState callback */
function updateLastAssistant(
  updater: (blocks: MessageBlock[]) => MessageBlock[],
): (prev: ChatMessage[]) => ChatMessage[] {
  return (prev) => {
    const msgs = [...prev];
    const last = msgs[msgs.length - 1];
    if (!last || last.role !== "assistant") return prev;
    const blocks = updater([...last.blocks]);
    msgs[msgs.length - 1] = { ...last, blocks };
    return msgs;
  };
}

export function useWebSocket() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleMessage = useCallback((data: WsIncoming) => {
    switch (data.type) {
      case "chat:start":
        setIsStreaming(true);
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", blocks: [], streaming: true },
        ]);
        break;

      case "chat:thinking":
        setMessages(updateLastAssistant((blocks) => {
          const lastBlock = blocks[blocks.length - 1];
          if (lastBlock && lastBlock.type === "thinking") {
            blocks[blocks.length - 1] = { ...lastBlock, content: lastBlock.content + data.content };
          } else {
            blocks.push({ type: "thinking", content: data.content });
          }
          return blocks;
        }));
        break;

      case "chat:text":
        setMessages(updateLastAssistant((blocks) => {
          const lastBlock = blocks[blocks.length - 1];
          if (lastBlock && lastBlock.type === "text") {
            blocks[blocks.length - 1] = { ...lastBlock, content: lastBlock.content + data.content };
          } else {
            blocks.push({ type: "text", content: data.content });
          }
          return blocks;
        }));
        break;

      case "chat:tool_use":
        setMessages(updateLastAssistant((blocks) => {
          blocks.push({
            type: "tool_use",
            id: data.id,
            name: data.name,
            input: data.input,
            status: "running",
          });
          return blocks;
        }));
        break;

      case "chat:tool_result":
        setMessages(updateLastAssistant((blocks) => {
          const updated = blocks.map((block) => {
            if (block.type === "tool_use" && block.id === data.id) {
              return { ...block, status: "done" as const };
            }
            return block;
          });
          updated.push({ type: "tool_result", id: data.id, content: data.content });
          return updated;
        }));
        break;

      case "chat:done":
        setIsStreaming(false);
        setMessages((prev) => {
          const msgs = [...prev];
          const last = msgs[msgs.length - 1];
          if (last?.role === "assistant") {
            msgs[msgs.length - 1] = { ...last, streaming: false };
          }
          return msgs;
        });
        break;

      case "chat:error":
        setIsStreaming(false);
        setMessages((prev) => {
          const msgs = [...prev];
          const last = msgs[msgs.length - 1];
          if (last?.role === "assistant") {
            const blocks: MessageBlock[] = [
              ...last.blocks,
              { type: "text", content: `Error: ${data.error}` },
            ];
            msgs[msgs.length - 1] = { ...last, blocks, streaming: false };
          }
          return msgs;
        });
        break;
    }
  }, []);

  const connect = useCallback(() => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? `${proto}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);

    ws.onclose = () => {
      setIsConnected(false);
      setIsStreaming(false);
      wsRef.current = null;
      reconnectRef.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => ws.close();

    ws.onmessage = (e: MessageEvent) => {
      const data = JSON.parse(String(e.data)) as WsIncoming;
      handleMessage(data);
    };
  }, [handleMessage]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", blocks: [{ type: "text", content }] },
    ]);
    wsRef.current.send(JSON.stringify({ type: "chat", content }));
  }, []);

  const stopStreaming = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "stop" }));
  }, []);

  return { messages, isConnected, isStreaming, sendMessage, stopStreaming };
}
