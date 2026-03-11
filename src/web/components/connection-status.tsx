"use client";

interface ConnectionStatusProps {
  connected: boolean;
}

export function ConnectionStatus({ connected }: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span
        className={`h-2 w-2 rounded-full transition-colors ${
          connected ? "bg-primary shadow-[0_0_6px_var(--color-primary)]" : "bg-destructive"
        }`}
      />
      {connected ? "Connected" : "Disconnected"}
    </div>
  );
}
