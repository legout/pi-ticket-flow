import { getLastAssistantText, type RoleMessage } from "./delegated-subagent-outcome.ts";

export interface BridgeAgentMessageDefaults {
  autoExit?: boolean;
  systemPromptMode?: "append" | "replace";
  body?: string;
}

export function ensureAssistantSummary(messages: unknown[], fallbackText: string): unknown[] {
  const lastText = getLastAssistantText(messages as RoleMessage[]);
  if (lastText) return messages;
  return [
    ...messages,
    {
      role: "assistant",
      content: [{ type: "text", text: fallbackText || "Delegated subagent completed." }],
    },
  ];
}

export function buildTaskMessage(
  agentDefaults: BridgeAgentMessageDefaults | null,
  task: string,
  context: "fresh" | "fork",
  delegatedSkill?: string,
): string {
  const modeHint = agentDefaults?.autoExit
    ? "Complete your task autonomously."
    : "Complete your task. When finished, call the subagent_done tool. The user can interact with you at any time.";
  const summaryInstruction = agentDefaults?.autoExit
    ? "Your FINAL assistant message should summarize what you accomplished."
    : "Your FINAL assistant message (before calling subagent_done or before the user exits) should summarize what you accomplished.";

  if (context === "fork") {
    return task;
  }

  const hasSpecializedContract = typeof delegatedSkill === "string" && delegatedSkill.trim().length > 0;
  const contractPreamble = hasSpecializedContract
    ? [
        "Task-specific prompt and skill instructions are the authoritative workflow contract for this run.",
        "If they conflict with generic agent workflow guidance, follow the task-specific instructions.",
        "Do not reinterpret ticket ids (for example `flo-1234`) as todo ids, and use the exact tools and artifact paths named in the task.",
      ].join(" ")
    : null;

  const parts = hasSpecializedContract
    ? [
        contractPreamble,
        task,
        modeHint,
        agentDefaults?.body && !agentDefaults.systemPromptMode ? agentDefaults.body : null,
        summaryInstruction,
      ]
    : [
        agentDefaults?.body && !agentDefaults.systemPromptMode ? agentDefaults.body : null,
        modeHint,
        task,
        summaryInstruction,
      ];

  return parts.filter((part): part is string => Boolean(part)).join("\n\n");
}
