"use client";

import { useState, useRef } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (content: string) => void;
  onStop: () => void;
  disabled: boolean;
  streaming: boolean;
}

export function ChatInput({ onSend, onStop, disabled, streaming }: ChatInputProps) {
  const [value, setValue] = useState("");
  const composingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const text = value.trim();
    if (!text) return;
    onSend(text);
    setValue("");
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !composingRef.current && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!streaming && !disabled) handleSend();
    }
  };

  return (
    <div className="border-t border-[hsl(var(--border))/50] bg-[hsl(var(--card))] p-4">
      <div className="mx-auto max-w-3xl flex gap-3 items-end">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { composingRef.current = true; }}
          onCompositionEnd={() => { composingRef.current = false; }}
          placeholder="輸入訊息..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] disabled:cursor-not-allowed disabled:opacity-50"
        />
        {streaming ? (
          <Button onClick={onStop} variant="destructive" size="icon" className="shrink-0 rounded-xl h-11 w-11">
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSend} disabled={disabled || !value.trim()} size="icon" className="shrink-0 rounded-xl h-11 w-11">
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
