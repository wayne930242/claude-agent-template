"use client";

import { useState } from "react";
import { ChevronRight, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

  const StatusIcon = {
    running: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    done: <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />,
    error: <XCircle className="h-3.5 w-3.5 text-red-400" />,
  }[status];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm hover:text-[hsl(var(--foreground))] transition-colors">
        <ChevronRight
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`}
        />
        {StatusIcon}
        <Badge variant="secondary" className="font-mono text-xs">
          {name}
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 pl-5 space-y-2">
        <div>
          <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Input</div>
          <pre className="text-xs bg-[hsl(var(--secondary))] rounded p-2 overflow-x-auto">
            {formatJson(input)}
          </pre>
        </div>
        {result !== undefined && (
          <div>
            <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Result</div>
            <pre className="text-xs bg-[hsl(var(--secondary))] rounded p-2 overflow-x-auto whitespace-pre-wrap">
              {result}
            </pre>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
