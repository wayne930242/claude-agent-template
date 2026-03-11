"use client";

import { useState } from "react";
import { ChevronRight, Brain } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ThinkingBlockProps {
  content: string;
  streaming?: boolean;
}

export function ThinkingBlock({ content, streaming }: ThinkingBlockProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer group">
        <ChevronRight
          className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
        <Brain className="h-3 w-3" />
        <span className={streaming ? "animate-pulse" : ""}>
          {streaming ? "Thinking..." : "Thought process"}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1.5 ml-7 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed border-l-2 border-border pl-3">
        {content}
      </CollapsibleContent>
    </Collapsible>
  );
}
