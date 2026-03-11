export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  blocks: MessageBlock[];
  streaming?: boolean;
}

export type MessageBlock =
  | ThinkingBlock
  | TextBlock
  | ToolUseBlock
  | ToolResultBlock;

export interface ThinkingBlock {
  type: "thinking";
  content: string;
}

export interface TextBlock {
  type: "text";
  content: string;
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: string;
  status: "running" | "done" | "error";
}

export interface ToolResultBlock {
  type: "tool_result";
  id: string;
  content: string;
}

export type WsIncoming =
  | { type: "connected"; id: string }
  | { type: "chat:start" }
  | { type: "chat:thinking"; content: string }
  | { type: "chat:text"; content: string }
  | { type: "chat:tool_use"; id: string; name: string; input: string }
  | { type: "chat:tool_result"; id: string; content: string }
  | { type: "chat:done" }
  | { type: "chat:error"; error: string }
  | { type: "stopped" };
