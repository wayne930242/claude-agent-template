"use client";

import { ChatMessages } from "@/components/chat-messages";
import { ChatInput } from "@/components/chat-input";
import { ConnectionStatus } from "@/components/connection-status";
import { useWebSocket } from "@/hooks/use-websocket";

export default function Home() {
  const { messages, isConnected, isStreaming, sendMessage, stopStreaming } = useWebSocket();

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center gap-3 px-6 py-3 border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <h1 className="text-base font-semibold tracking-tight">Claude Agent</h1>
        <div className="flex-1" />
        <ConnectionStatus connected={isConnected} />
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
