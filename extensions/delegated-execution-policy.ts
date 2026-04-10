import type { RoleMessage } from "./delegated-subagent-outcome.ts";

export interface DelegatedExecutionPolicy {
  forbidValidationCommands?: boolean;
  requireTimeoutForValidationCommands?: boolean;
}

const VALIDATION_COMMAND_PATTERNS = [
  /\bpytest\b/i,
  /\bpython(?:3(?:\.\d+)?)?\s+-m\s+pytest\b/i,
  /\buv\s+run\s+pytest\b/i,
  /\btox\b/i,
  /\bnox\b/i,
  /\bmake\s+(?:test|check|ci|validate|lint)\b/i,
  /\b(?:pnpm|npm|yarn|bun)\s+(?:run\s+)?test\b/i,
  /\b(?:cargo|go)\s+test\b/i,
  /\bjust\s+(?:test|check)\b/i,
  /\bruff\s+check\b/i,
  /\bmypy\b/i,
  /\bpyright\b/i,
];
const SHELL_TIMEOUT_PATTERN = /(?:^|\s)(?:gtimeout|timeout)(?:\s|$)/i;

function normalizePolicyText(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

export function deriveDelegatedExecutionPolicy(skill: string | undefined, task: string): DelegatedExecutionPolicy | undefined {
  const normalizedSkill = normalizePolicyText(skill);
  const normalizedTask = normalizePolicyText(task);

  if (
    normalizedSkill.includes("ticket-implement") ||
    normalizedTask.includes("validation and fix-to-green work happen in `ticket-test-fix`") ||
    normalizedTask.includes("do **not** run repo validation commands here") ||
    normalizedTask.includes("leave all validation and fix-to-green work to `ticket-test-fix`")
  ) {
    return { forbidValidationCommands: true };
  }

  if (
    normalizedSkill.includes("ticket-test-fix") ||
    normalizedTask.includes("validate and fix the currently selected ticket") ||
    normalizedTask.includes("validation is green")
  ) {
    return { requireTimeoutForValidationCommands: true };
  }

  return undefined;
}

function isValidationCommand(command: string): boolean {
  return VALIDATION_COMMAND_PATTERNS.some((pattern) => pattern.test(command));
}

function hasValidationCommandTimeout(args: Record<string, unknown>): boolean {
  const timeout = args.timeout;
  if (typeof timeout === "number" && Number.isFinite(timeout) && timeout > 0) return true;
  const command = typeof args.command === "string" ? args.command : "";
  return SHELL_TIMEOUT_PATTERN.test(command);
}

export function detectDelegatedPolicyViolation(
  messages: RoleMessage[],
  policy: DelegatedExecutionPolicy | undefined,
): string | undefined {
  if (!policy) return undefined;

  for (const message of messages) {
    if (message.role !== "assistant" || !Array.isArray(message.content)) continue;
    for (const block of message.content) {
      if (block?.type !== "toolCall" || block.name !== "bash") continue;
      const args = block.arguments ?? {};
      const command = typeof args.command === "string" ? args.command.trim() : "";
      if (!command || !isValidationCommand(command)) continue;

      if (policy.forbidValidationCommands) {
        return `Forbidden validation command during implementation step: ${command}`;
      }

      if (policy.requireTimeoutForValidationCommands && !hasValidationCommandTimeout(args)) {
        return `Validation command missing timeout in delegated subagent: ${command}`;
      }
    }
  }

  return undefined;
}
