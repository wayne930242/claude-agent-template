"use client";

import ReactMarkdown from "react-markdown";
import { Card, CardContent } from "@/components/ui/card";
import { ThinkingBlock } from "@/components/thinking-block";
import { ToolUseBlock } from "@/components/tool-use-block";
import type { ChatMessage, ToolUseBlock as ToolUseBlockType } from "@/lib/types";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === "user") {
    const firstBlock = message.blocks[0];
    const text = firstBlock?.type === "text" ? firstBlock.content : "";
    return (
      <div className="flex justify-end">
        <Card className="max-w-[80%] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-none">
          <CardContent className="p-3">
            <p className="text-sm whitespace-pre-wrap">{text}</p>
          </CardContent>
        </Card>
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
    <div className="flex justify-start">
      <Card className="max-w-[80%] border-[hsl(var(--border))]">
        <CardContent className="p-3 space-y-3">
          {message.blocks.map((block, i) => {
            switch (block.type) {
              case "thinking":
                return (
                  <ThinkingBlock
                    key={i}
                    content={block.content}
                    streaming={message.streaming && i === message.blocks.length - 1}
                  />
                );
              case "text":
                return (
                  <div key={i} className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{block.content}</ReactMarkdown>
                    {message.streaming && i === message.blocks.length - 1 && (
                      <span className="inline-block w-2 h-4 ml-0.5 bg-[hsl(var(--foreground))] animate-pulse" />
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
        </CardContent>
      </Card>
    </div>
  );
}
