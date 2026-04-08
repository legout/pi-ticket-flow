export interface MessageBlock {
  type?: string;
  text?: string;
  name?: string;
  arguments?: Record<string, unknown>;
}

export interface RoleMessage {
  role?: string;
  model?: string;
  usage?: { output?: number; totalTokens?: number };
  content?: MessageBlock[];
  stopReason?: string;
  errorMessage?: string;
}

export interface SessionEntryLike {
  type?: string;
  message?: RoleMessage;
}

export function extractRoleMessages(entries: SessionEntryLike[]): RoleMessage[] {
  const messages: RoleMessage[] = [];
  for (const entry of entries) {
    if (entry.type !== "message") continue;
    const message = entry.message;
    if (!message) continue;
    if (message.role !== "assistant" && message.role !== "user") continue;
    messages.push(message);
  }
  return messages;
}

export function getLastAssistantText(messages: RoleMessage[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "assistant" || !Array.isArray(message.content)) continue;
    const texts = message.content
      .filter((block) => block?.type === "text" && typeof block.text === "string" && block.text.trim())
      .map((block) => block.text as string);
    if (texts.length > 0) return texts.join("\n");
  }
  return undefined;
}

export function getTerminalAssistantFailure(messages: RoleMessage[]): { reason: "error" | "aborted"; text: string } | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "assistant") continue;

    if (message.stopReason === "aborted") {
      return {
        reason: "aborted",
        text: "Delegated subagent aborted.",
      };
    }

    if (typeof message.errorMessage === "string" && message.errorMessage.trim()) {
      return {
        reason: "error",
        text: message.errorMessage.trim(),
      };
    }

    if (message.stopReason === "error") {
      return {
        reason: "error",
        text: "Delegated subagent failed without an error message.",
      };
    }

    if (Array.isArray(message.content) && message.content.length > 0) {
      return undefined;
    }
  }

  return undefined;
}

export function summarizeDelegatedTaskOutcome(messages: RoleMessage[], agent: string, exitCode: number): {
  summary: string;
  isError: boolean;
  errorText?: string;
} {
  const terminalFailure = getTerminalAssistantFailure(messages);
  const summary =
    getLastAssistantText(messages) ??
    terminalFailure?.text ??
    (exitCode === 0
      ? `Delegated subagent ${agent} completed.`
      : `Delegated subagent ${agent} failed with exit code ${exitCode}.`);
  const isError = exitCode !== 0 || terminalFailure !== undefined;

  return {
    summary,
    isError,
    errorText: isError ? (terminalFailure?.text ?? summary) : undefined,
  };
}
