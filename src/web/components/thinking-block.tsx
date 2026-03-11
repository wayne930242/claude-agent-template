"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
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
      <CollapsibleTrigger className="flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
        <ChevronRight
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span className={streaming ? "animate-pulse" : ""}>
          {streaming ? "Thinking..." : "Thought process"}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 pl-5 text-sm text-[hsl(var(--muted-foreground))] whitespace-pre-wrap">
        {content}
      </CollapsibleContent>
    </Collapsible>
  );
}
