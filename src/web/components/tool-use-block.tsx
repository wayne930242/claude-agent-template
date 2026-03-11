"use client";

import { useState } from "react";
import { ChevronRight, Loader2, CheckCircle2, XCircle, Wrench } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ToolUseBlockProps {
  name: string;
  input: string;
  status: "running" | "done" | "error";
  result?: string;
}

function formatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

export function ToolUseBlock({ name, input, status, result }: ToolUseBlockProps) {
  const [open, setOpen] = useState(false);

  const statusIcon = {
    running: <Loader2 className="h-3 w-3 animate-spin text-primary" />,
    done: <CheckCircle2 className="h-3 w-3 text-primary" />,
    error: <XCircle className="h-3 w-3 text-destructive" />,
  }[status];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-xs hover:text-foreground transition-colors cursor-pointer group">
        <ChevronRight
          className={`h-3 w-3 transition-transform duration-200 text-muted-foreground ${open ? "rotate-90" : ""}`}
        />
        {statusIcon}
        <Wrench className="h-3 w-3 text-muted-foreground" />
        <code className="font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors">
          {name}
        </code>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1.5 ml-7 space-y-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">Input</div>
          <pre className="text-xs bg-background border border-border rounded-lg p-3 overflow-x-auto font-mono leading-relaxed">
            {formatJson(input)}
          </pre>
        </div>
        {result !== undefined && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">Result</div>
            <pre className="text-xs bg-background border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
              {result}
            </pre>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
