"use client";

import { Badge } from "@/components/ui/badge";

interface ConnectionStatusProps {
  connected: boolean;
}

export function ConnectionStatus({ connected }: ConnectionStatusProps) {
  return (
    <Badge variant={connected ? "default" : "destructive"} className="gap-1.5">
      <span
        className={`h-2 w-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`}
      />
      {connected ? "Connected" : "Disconnected"}
    </Badge>
  );
}
