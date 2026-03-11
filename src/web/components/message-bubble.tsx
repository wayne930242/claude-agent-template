"use client";

import ReactMarkdown from "react-markdown";
import { ThinkingBlock } from "@/components/thinking-block";
import { ToolUseBlock } from "@/components/tool-use-block";
import type { ChatMessage } from "@/lib/types";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === "user") {
    const firstBlock = message.blocks[0];
    const text = firstBlock?.type === "text" ? firstBlock.content : "";
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-user-bubble text-user-bubble-foreground px-4 py-2.5">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{text}</p>
        </div>
      </div>
    );
  }

  return <AssistantBubble message={message} />;
}

function AssistantBubble({ message }: { message: ChatMessage }) {
  const toolResults = new Map<string, string>();
  for (const block of message.blocks) {
    if (block.type === "tool_result") {
      toolResults.set(block.id, block.content);
    }
  }

  return (
    <div className="space-y-2">
      {message.blocks.map((block, i) => {
        const isLast = message.streaming && i === message.blocks.length - 1;
        switch (block.type) {
          case "thinking":
            return <ThinkingBlock key={i} content={block.content} streaming={isLast} />;
          case "text":
            return (
              <div key={i} className="prose">
                <ReactMarkdown>{block.content}</ReactMarkdown>
                {isLast && (
                  <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary animate-pulse rounded-sm" />
                )}
              </div>
            );
          case "tool_use":
            return (
              <ToolUseBlock
                key={i}
                name={block.name}
                input={block.input}
                status={block.status}
                result={toolResults.get(block.id)}
              />
            );
          case "tool_result":
            return null;
          default:
            return null;
        }
      })}
    </div>
  );
}
