"use client";

import { ChatMessages } from "@/components/chat-messages";
import { ChatInput } from "@/components/chat-input";
import { ConnectionStatus } from "@/components/connection-status";
import { useWebSocket } from "@/hooks/use-websocket";

export default function Home() {
  const { messages, isConnected, isStreaming, sendMessage, stopStreaming } = useWebSocket();

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-[hsl(var(--border))]">
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
