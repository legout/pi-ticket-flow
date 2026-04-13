import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir, tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  closeSurface,
  createSurface,
  exitStatusVar,
  isMuxAvailable,
  muxSetupHint,
  pollForExit,
  sendCommand,
  shellEscape,
} from "../node_modules/pi-interactive-subagents/pi-extension/subagents/cmux.ts";
import {
  getNewEntries,
} from "../node_modules/pi-interactive-subagents/pi-extension/subagents/session.ts";
import {
  extractRoleMessages,
  getLastAssistantText,
  getTerminalAssistantFailure,
  summarizeDelegatedTaskOutcome,
  type RoleMessage,
  type SessionEntryLike,
} from "./delegated-subagent-outcome.ts";
import {
  deriveDelegatedExecutionPolicy,
  detectDelegatedPolicyViolation,
  type DelegatedExecutionPolicy,
} from "./delegated-execution-policy.ts";
import { buildTaskMessage, ensureAssistantSummary, formatLoadedSkillBlock } from "./bridge-message-utils.ts";
import { recoverDelegatedTicketFlowFailure } from "./ticket-flow-delegated-recovery.ts";
import { readSkillContent, resolveSkillPath } from "../vendor/pi-prompt-template-model/prompt-loader.ts";

const REQUEST_EVENT = "prompt-template:subagent:request";
const STARTED_EVENT = "prompt-template:subagent:started";
const RESPONSE_EVENT = "prompt-template:subagent:response";
const UPDATE_EVENT = "prompt-template:subagent:update";
const CANCEL_EVENT = "prompt-template:subagent:cancel";
const SPAWNING_TOOLS = ["subagent", "subagents_list", "subagent_resume"];

interface DelegatedSubagentTask {
  name?: string;
  agent: string;
  task: string;
  model?: string;
  skill?: string;
  thinking?: string;
}

interface DelegatedSubagentRequest {
  requestId: string;
  name?: string;
  agent: string;
  task: string;
  tasks?: DelegatedSubagentTask[];
  context: "fresh" | "fork";
  model: string;
  cwd: string;
  skill?: string;
  thinking?: string;
}

interface DelegatedSubagentResponse {
  requestId: string;
  name?: string;
  context: "fresh" | "fork";
  model: string;
  messages: unknown[];
  parallelResults?: Array<{
    name?: string;
    agent: string;
    messages: unknown[];
    isError: boolean;
    errorText?: string;
  }>;
  isError: boolean;
  errorText?: string;
}

interface DelegatedSubagentUpdate {
  requestId: string;
  currentTool?: string;
  currentToolArgs?: string;
  recentOutput?: string;
  recentOutputLines?: string[];
  recentTools?: Array<{ tool: string; args: string }>;
  model?: string;
  toolCount?: number;
  durationMs?: number;
  tokens?: number;
  taskProgress?: Array<{
    index?: number;
    agent: string;
    status?: string;
    currentTool?: string;
    currentToolArgs?: string;
    recentOutput?: string;
    recentOutputLines?: string[];
    recentTools?: Array<{ tool: string; args: string }>;
    model?: string;
    toolCount?: number;
    durationMs?: number;
    tokens?: number;
  }>;
}

interface AgentDefaults {
  model?: string;
  tools?: string;
  skills?: string;
  thinking?: string;
  denyTools?: string;
  spawning?: boolean;
  autoExit?: boolean;
  systemPromptMode?: "append" | "replace";
  cwd?: string;
  body?: string;
}

interface RunningTask {
  index: number;
  name?: string;
  agent: string;
  model: string;
  policy?: DelegatedExecutionPolicy;
  surface: string;
  sessionFile: string;
  baselineEntryCount: number;
  startTime: number;
  abortController: AbortController;
  forkCleanupFile?: string;
}

interface TaskProgressSnapshot {
  status: "running" | "completed" | "failed";
  currentTool?: string;
  currentToolArgs?: string;
  recentOutput?: string;
  recentOutputLines?: string[];
  recentTools?: Array<{ tool: string; args: string }>;
  toolCount: number;
  durationMs: number;
  model: string;
  tokens: number;
}

interface TaskResult {
  name?: string;
  agent: string;
  messages: unknown[];
  isError: boolean;
  errorText?: string;
}

const runningRequests = new Map<string, { controllers: AbortController[] }>();
let latestCtx: ExtensionContext | null = null;
const THINKING_LEVELS = new Set(["off", "minimal", "low", "medium", "high", "xhigh"]);

function throwIfAborted(abortController: AbortController) {
  if (abortController.signal.aborted) {
    throw new Error("Delegated subagent cancelled.");
  }
}

function packageRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..");
}

function getAgentConfigDir(): string {
  return process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent");
}

function agentPaths(cwd: string, agentName: string): string[] {
  return [
    join(cwd, ".pi", "agents", `${agentName}.md`),
    join(getAgentConfigDir(), "agents", `${agentName}.md`),
    join(packageRoot(), "agents", `${agentName}.md`),
  ];
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const parsed = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);
    if (!parsed) continue;
    result[parsed[1]] = parsed[2].trim();
  }
  return result;
}

function normalizeSkillName(skillName: string): string {
  return skillName.startsWith("skill:") ? skillName.slice("skill:".length) : skillName;
}

function isPathResolvableSkillName(skillName: string): boolean {
  if (skillName === "." || skillName === "..") return false;
  if (skillName.includes("/")) return false;
  if (skillName.includes("\\")) return false;
  return true;
}

function parseSkillList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => normalizeSkillName(item.trim()))
    .filter(Boolean);
}

function mergeSkillLists(agentSkills: string | undefined, promptSkill: string | undefined): string | undefined {
  const merged = [...new Set([...parseSkillList(agentSkills), ...parseSkillList(promptSkill)])];
  return merged.length > 0 ? merged.join(",") : undefined;
}

function resolveRegisteredSkillPath(pi: ExtensionAPI, skillName: string): string | undefined {
  const normalizedSkillName = normalizeSkillName(skillName);
  if (!normalizedSkillName) return undefined;

  const candidates = new Set([normalizedSkillName, `skill:${normalizedSkillName}`]);
  for (const command of pi.getCommands()) {
    if (command.source !== "skill") continue;
    if (!candidates.has(command.name)) continue;
    const path = command.sourceInfo?.path;
    if (typeof path === "string" && path.length > 0) {
      return path;
    }
  }

  return undefined;
}

function resolveDelegatedSkillInstructions(pi: ExtensionAPI, cwd: string, skills: string | undefined): string | undefined {
  const requestedSkills = parseSkillList(skills);
  if (requestedSkills.length === 0) return undefined;

  const blocks: string[] = [];
  for (const skillName of requestedSkills) {
    const normalizedSkillName = normalizeSkillName(skillName);
    const skillPath = resolveRegisteredSkillPath(pi, normalizedSkillName)
      ?? (isPathResolvableSkillName(normalizedSkillName) ? resolveSkillPath(normalizedSkillName, cwd) : undefined);

    if (!skillPath) {
      throw new Error(`Delegated skill \`${skillName}\` not found.`);
    }

    blocks.push(formatLoadedSkillBlock(normalizedSkillName, readSkillContent(skillPath)));
  }

  return blocks.join("\n\n");
}

function applyThinkingSuffix(model: string, thinking: string | undefined): string {
  if (!thinking || thinking === "off") return model;
  const colonIndex = model.lastIndexOf(":");
  if (colonIndex !== -1 && THINKING_LEVELS.has(model.slice(colonIndex + 1))) {
    return model;
  }
  return `${model}:${thinking}`;
}

function loadAgentDefaults(cwd: string, agentName: string): AgentDefaults | null {
  for (const path of agentPaths(cwd, agentName)) {
    if (!existsSync(path)) continue;
    const content = readFileSync(path, "utf8");
    const fields = parseFrontmatter(content);
    const body = content.replace(/^---\n[\s\S]*?\n---\n*/, "").trim() || undefined;
    return {
      model: fields["model"],
      tools: fields["tools"],
      skills: fields["skill"] ?? fields["skills"],
      thinking: fields["thinking"],
      denyTools: fields["deny-tools"],
      spawning: fields["spawning"] != null ? fields["spawning"] === "true" : undefined,
      autoExit: fields["auto-exit"] != null ? fields["auto-exit"] === "true" : undefined,
      systemPromptMode:
        fields["system-prompt"] === "replace"
          ? "replace"
          : fields["system-prompt"] === "append"
            ? "append"
            : undefined,
      cwd: fields["cwd"],
      body,
    };
  }
  return null;
}

function getArtifactDir(ctx: ExtensionContext): string {
  return join(ctx.sessionManager.getSessionDir(), "artifacts", ctx.sessionManager.getSessionId());
}

function stringifyArgs(args: Record<string, unknown> | undefined, max = 80): string | undefined {
  if (!args) return undefined;
  const raw = JSON.stringify(args);
  return raw.length > max ? `${raw.slice(0, max)}...` : raw;
}

function formatToolForPreview(name: string, args: Record<string, unknown> | undefined): { tool: string; args: string } {
  switch (name) {
    case "bash": {
      const command = String(args?.command ?? "").replace(/[\n\t]/g, " ").trim();
      return { tool: "bash", args: command.length > 100 ? `${command.slice(0, 100)}...` : command };
    }
    case "read":
    case "write":
    case "edit":
      return { tool: name, args: String(args?.path ?? args?.file_path ?? "") };
    case "grep":
      return { tool: "grep", args: `/${String(args?.pattern ?? "")}/ in ${String(args?.path ?? ".")}` };
    case "find":
      return { tool: "find", args: `${String(args?.pattern ?? "")} in ${String(args?.path ?? ".")}` };
    case "ls":
      return { tool: "ls", args: String(args?.path ?? ".") };
    default:
      return { tool: name, args: stringifyArgs(args, 100) ?? "" };
  }
}

function countAssistantToolCalls(messages: RoleMessage[]): number {
  let count = 0;
  for (const message of messages) {
    if (message.role !== "assistant" || !Array.isArray(message.content)) continue;
    for (const block of message.content) {
      if (block?.type === "toolCall") count++;
    }
  }
  return count;
}

function getLastAssistantTool(messages: RoleMessage[]): { name?: string; args?: string } {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "assistant" || !Array.isArray(message.content)) continue;
    for (let j = message.content.length - 1; j >= 0; j--) {
      const block = message.content[j];
      if (block?.type === "toolCall" && typeof block.name === "string") {
        return { name: block.name, args: stringifyArgs(block.arguments) };
      }
    }
  }
  return {};
}

function getRecentTools(messages: RoleMessage[], limit = 5): Array<{ tool: string; args: string }> | undefined {
  const tools: Array<{ tool: string; args: string }> = [];
  for (const message of messages) {
    if (message.role !== "assistant" || !Array.isArray(message.content)) continue;
    for (const block of message.content) {
      if (block?.type === "toolCall" && typeof block.name === "string") {
        tools.push(formatToolForPreview(block.name, block.arguments));
      }
    }
  }
  return tools.length > 0 ? tools.slice(-limit) : undefined;
}

function truncateOutputLines(text: string | undefined, maxLines = 8): string[] | undefined {
  if (!text) return undefined;
  const lines = text.split("\n").map((line) => line.trimEnd()).filter((line) => line.trim());
  if (lines.length === 0) return undefined;
  return lines.slice(-maxLines);
}

function lastAssistantModel(messages: RoleMessage[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant" && typeof messages[i].model === "string") return messages[i].model;
  }
  return undefined;
}

function assistantTokens(messages: RoleMessage[]): number {
  let tokens = 0;
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    tokens += message.usage?.output ?? message.usage?.totalTokens ?? 0;
  }
  return tokens;
}

function emitUpdate(pi: ExtensionAPI, update: DelegatedSubagentUpdate) {
  pi.events.emit(UPDATE_EVENT, update);
}

function resolveDeniedTools(agentDefs: AgentDefaults | null): string[] {
  if (!agentDefs) return [];
  const denied = new Set<string>();
  if (agentDefs.spawning === false) {
    for (const tool of SPAWNING_TOOLS) denied.add(tool);
  }
  if (agentDefs.denyTools) {
    for (const tool of agentDefs.denyTools.split(",").map((v) => v.trim()).filter(Boolean)) {
      denied.add(tool);
    }
  }
  return [...denied];
}

function writeTaskArtifact(ctx: ExtensionContext, name: string, content: string): string {
  const artifactDir = getArtifactDir(ctx);
  const artifactPath = join(artifactDir, name);
  mkdirSync(dirname(artifactPath), { recursive: true });
  writeFileSync(artifactPath, content, "utf8");
  return artifactPath;
}

function createForkCleanupFile(sourceSessionFile: string): { path: string; baselineEntryCount: number } {
  const raw = readFileSync(sourceSessionFile, "utf8");
  const lines = raw.split("\n").filter((line) => line.trim());

  let truncateAt = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const entry = JSON.parse(lines[i]);
      if (entry.type === "message" && entry.message?.role === "user") {
        truncateAt = i;
        break;
      }
    } catch {}
  }

  const cleanLines = lines.slice(0, truncateAt);
  const cleanupPath = join(tmpdir(), `pi-bridge-fork-${Date.now()}-${Math.random().toString(16).slice(2)}.jsonl`);
  writeFileSync(cleanupPath, cleanLines.join("\n") + (cleanLines.length > 0 ? "\n" : ""), "utf8");
  return { path: cleanupPath, baselineEntryCount: cleanLines.length };
}

async function launchTask(
  pi: ExtensionAPI,
  taskReq: DelegatedSubagentTask,
  request: DelegatedSubagentRequest,
  ctx: ExtensionContext,
  index: number,
  abortController: AbortController,
): Promise<RunningTask> {
  if (!ctx.sessionManager.getSessionFile()) {
    throw new Error("No session file. Start pi with a persistent session to use delegated subagents.");
  }
  if (!isMuxAvailable()) {
    throw new Error(`Delegated subagents require a supported terminal multiplexer. ${muxSetupHint()}`);
  }

  const agentDefs = loadAgentDefaults(ctx.cwd, taskReq.agent);
  if (!agentDefs) {
    throw new Error(`Delegated agent \`${taskReq.agent}\` not found.`);
  }

  const effectiveSkills = mergeSkillLists(agentDefs.skills, taskReq.skill ?? request.skill);
  const effectivePromptSkill = taskReq.skill ?? request.skill;
  const effectiveModel = taskReq.model ?? request.model ?? agentDefs.model;
  const effectiveTools = agentDefs.tools;
  const effectiveThinking = taskReq.thinking ?? request.thinking ?? agentDefs.thinking;
  const deniedTools = resolveDeniedTools(agentDefs);
  const sessionFile = ctx.sessionManager.getSessionFile()!;
  const sessionDir = dirname(sessionFile);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 23) + "Z";
  const sessionId = `${request.requestId}-${index}-${Math.random().toString(16).slice(2, 10)}`;
  const subagentSessionFile = join(sessionDir, `${timestamp}_${sessionId}.jsonl`);
  const rawCwd = request.cwd || agentDefs.cwd || ctx.cwd;
  const cwdIsFromAgent = !request.cwd && agentDefs.cwd != null;
  const cwdBase = cwdIsFromAgent ? getAgentConfigDir() : ctx.cwd;
  const effectiveCwd = rawCwd.startsWith("/") ? rawCwd : join(cwdBase, rawCwd);

  if (effectiveCwd !== ctx.cwd && !existsSync(effectiveCwd)) {
    throw new Error(`cwd directory does not exist: ${effectiveCwd}`);
  }

  // Do not pass /skill:... as a positional CLI argument. In delegated non-interactive
  // launches it gets concatenated into the initial user message instead of loading the
  // skill, so inline the resolved skill instructions into the delegated task payload.
  const delegatedSkillInstructions = resolveDelegatedSkillInstructions(pi, effectiveCwd, effectiveSkills);
  const taskMessage = buildTaskMessage(
    agentDefs,
    taskReq.task,
    request.context,
    effectiveSkills,
    delegatedSkillInstructions,
  );

  let surface: string | undefined;
  let forkCleanupFile: string | undefined;
  let taskArtifactPath: string | undefined;
  let baselineEntryCount = 0;
  const taskLabel = taskReq.name?.trim() || taskReq.agent;
  const surfaceLabel = request.tasks && request.tasks.length > 1 ? `${taskLabel} ${index + 1}` : taskLabel;

  try {
    throwIfAborted(abortController);
    surface = createSurface(surfaceLabel);
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    throwIfAborted(abortController);

    const parts: string[] = ["pi", "--session", shellEscape(subagentSessionFile)];

    if (request.context === "fork") {
      const forkInfo = createForkCleanupFile(sessionFile);
      forkCleanupFile = forkInfo.path;
      baselineEntryCount = forkInfo.baselineEntryCount;
      parts.push("--fork", shellEscape(forkCleanupFile));
    }

    const subagentDonePath = fileURLToPath(
      new URL(
        "../node_modules/pi-interactive-subagents/pi-extension/subagents/subagent-done.ts",
        import.meta.url,
      ),
    );
    parts.push("-e", shellEscape(subagentDonePath));

    if (effectiveModel) {
      const modelWithThinking = applyThinkingSuffix(effectiveModel, effectiveThinking);
      // Use --models so provider-qualified delegated prompt models reliably win over
      // the spawned agent's default model in the child pi session.
      parts.push("--models", shellEscape(modelWithThinking));
    }

    if (agentDefs.systemPromptMode && agentDefs.body) {
      const flag = agentDefs.systemPromptMode === "replace" ? "--system-prompt" : "--append-system-prompt";
      parts.push(flag, shellEscape(agentDefs.body));
    }

    if (effectiveTools) {
      const BUILTIN_TOOLS = new Set(["read", "bash", "edit", "write", "grep", "find", "ls"]);
      const builtins = effectiveTools
        .split(",")
        .map((tool) => tool.trim())
        .filter((tool) => BUILTIN_TOOLS.has(tool));
      if (builtins.length > 0) {
        parts.push("--tools", shellEscape(builtins.join(",")));
      }
    }

    const envParts: string[] = [];
    if (process.env.PI_CODING_AGENT_DIR) {
      envParts.push(`PI_CODING_AGENT_DIR=${shellEscape(process.env.PI_CODING_AGENT_DIR)}`);
    }
    if (process.env.PI_SUBAGENT_RUNTIME_ROOT) {
      envParts.push(`PI_SUBAGENT_RUNTIME_ROOT=${shellEscape(process.env.PI_SUBAGENT_RUNTIME_ROOT)}`);
    }
    if (deniedTools.length > 0) {
      envParts.push(`PI_DENY_TOOLS=${shellEscape(deniedTools.join(","))}`);
    }
    envParts.push(`PI_SUBAGENT_NAME=${shellEscape(taskLabel)}`);
    envParts.push(`PI_SUBAGENT_AGENT=${shellEscape(taskReq.agent)}`);
    if (agentDefs.autoExit) envParts.push("PI_SUBAGENT_AUTO_EXIT=1");

    if (request.context === "fork") {
      parts.push(shellEscape(taskMessage));
    } else {
      const artifactName = `bridge-context/${taskReq.agent}-${index + 1}-${Date.now()}.md`;
      taskArtifactPath = writeTaskArtifact(ctx, artifactName, taskMessage);
      parts.push(shellEscape(`@${taskArtifactPath}`));
    }

    const envPrefix = envParts.length > 0 ? `${envParts.join(" ")} ` : "";
    const cdPrefix = effectiveCwd ? `cd ${shellEscape(effectiveCwd)} && ` : "";
    throwIfAborted(abortController);
    const command = `${cdPrefix}${envPrefix}${parts.join(" ")}; echo '__SUBAGENT_DONE_'${exitStatusVar()}'__'`;
    sendCommand(surface, command);

    return {
      index,
      name: taskReq.name,
      agent: taskReq.agent,
      model: effectiveModel,
      policy: deriveDelegatedExecutionPolicy(effectivePromptSkill, taskReq.task),
      surface,
      sessionFile: subagentSessionFile,
      baselineEntryCount,
      startTime: Date.now(),
      abortController,
      forkCleanupFile,
    };
  } catch (error) {
    if (surface) {
      try {
        closeSurface(surface);
      } catch {}
    }
    if (forkCleanupFile) {
      try {
        unlinkSync(forkCleanupFile);
      } catch {}
    }
    if (taskArtifactPath) {
      try {
        unlinkSync(taskArtifactPath);
      } catch {}
    }
    throw error;
  }
}

function snapshotTask(task: RunningTask): TaskProgressSnapshot {
  if (!existsSync(task.sessionFile)) {
    return {
      status: "running",
      toolCount: 0,
      durationMs: Date.now() - task.startTime,
      model: task.model,
      tokens: 0,
    };
  }

  const entries = getNewEntries(task.sessionFile, task.baselineEntryCount);
  const messages = extractRoleMessages(entries as SessionEntryLike[]);
  const { name: currentTool, args: currentToolArgs } = getLastAssistantTool(messages);
  const outputText = getLastAssistantText(messages) ?? getTerminalAssistantFailure(messages)?.text;
  return {
    status: "running",
    currentTool,
    currentToolArgs,
    recentOutput: outputText ? truncateOutputLines(outputText, 1)?.[0] : undefined,
    recentOutputLines: truncateOutputLines(outputText),
    recentTools: getRecentTools(messages),
    toolCount: countAssistantToolCalls(messages),
    durationMs: Date.now() - task.startTime,
    model: lastAssistantModel(messages) ?? task.model,
    tokens: assistantTokens(messages),
  };
}

function cleanupTask(task: RunningTask) {
  try {
    closeSurface(task.surface);
  } catch {}
  if (task.forkCleanupFile) {
    try {
      unlinkSync(task.forkCleanupFile);
    } catch {}
  }
}

async function watchTask(task: RunningTask, onProgress?: (snapshot: TaskProgressSnapshot) => void): Promise<TaskResult> {
  let policyViolationMessage: string | undefined;

  const abortOnPolicyViolation = () => {
    if (policyViolationMessage || !task.policy || !existsSync(task.sessionFile)) return;
    const entries = getNewEntries(task.sessionFile, task.baselineEntryCount);
    const messages = extractRoleMessages(entries as SessionEntryLike[]);
    const violation = detectDelegatedPolicyViolation(messages, task.policy);
    if (!violation) return;
    policyViolationMessage = violation;
    task.abortController.abort();
  };

  try {
    const exitCode = await pollForExit(task.surface, task.abortController.signal, {
      interval: 1000,
      onTick() {
        onProgress?.(snapshotTask(task));
        abortOnPolicyViolation();
      },
    });

    abortOnPolicyViolation();

    const entries = existsSync(task.sessionFile) ? getNewEntries(task.sessionFile, task.baselineEntryCount) : [];
    const rawRoleMessages = extractRoleMessages(entries as SessionEntryLike[]);
    const outcome = summarizeDelegatedTaskOutcome(rawRoleMessages, task.agent, exitCode);
    const rawMessages = rawRoleMessages as unknown[];
    const messages = ensureAssistantSummary(rawMessages, outcome.summary);

    cleanupTask(task);

    return {
      name: task.name,
      agent: task.agent,
      messages,
      isError: outcome.isError,
      errorText: outcome.errorText,
    };
  } catch (error) {
    cleanupTask(task);
    const message = policyViolationMessage ?? (task.abortController.signal.aborted
      ? "Delegated subagent cancelled."
      : error instanceof Error
        ? error.message
        : String(error));
    return {
      name: task.name,
      agent: task.agent,
      messages: ensureAssistantSummary([], message),
      isError: true,
      errorText: message,
    };
  }
}

async function processSingleRequest(pi: ExtensionAPI, request: DelegatedSubagentRequest, ctx: ExtensionContext) {
  const abortController = new AbortController();
  runningRequests.set(request.requestId, { controllers: [abortController] });
  try {
    const task = await launchTask(
      pi,
      {
        name: request.name,
        agent: request.agent,
        task: request.task,
        model: request.model,
        skill: request.skill,
        thinking: request.thinking,
      },
      request,
      ctx,
      0,
      abortController,
    );

    const result = await watchTask(task, (progress) => {
      emitUpdate(pi, {
        requestId: request.requestId,
        currentTool: progress.currentTool,
        currentToolArgs: progress.currentToolArgs,
        recentOutput: progress.recentOutput,
        recentOutputLines: progress.recentOutputLines,
        recentTools: progress.recentTools,
        model: progress.model,
        toolCount: progress.toolCount,
        durationMs: progress.durationMs,
        tokens: progress.tokens,
      });
    });

    let messages = result.messages;
    let isError = result.isError;
    let errorText = result.errorText;

    if (isError) {
      const recovered = recoverDelegatedTicketFlowFailure({
        artifactDir: getArtifactDir(ctx),
        skill: request.skill,
        errorText: result.errorText,
      });
      if (recovered) {
        messages = ensureAssistantSummary([], recovered.summary);
        isError = false;
        errorText = undefined;
      }
    }

    const response: DelegatedSubagentResponse = {
      requestId: request.requestId,
      name: result.name,
      context: request.context,
      model: request.model,
      messages,
      isError,
      errorText,
    };
    pi.events.emit(RESPONSE_EVENT, response);
  } finally {
    runningRequests.delete(request.requestId);
  }
}

async function processParallelRequest(pi: ExtensionAPI, request: DelegatedSubagentRequest, ctx: ExtensionContext) {
  const tasks = request.tasks ?? [];
  const controllers = tasks.map(() => new AbortController());
  runningRequests.set(request.requestId, { controllers });
  try {
    const launchResults = await Promise.allSettled(
      tasks.map((task, index) => launchTask(pi, task, request, ctx, index, controllers[index]!)),
    );
    const launched = launchResults
      .filter((result): result is PromiseFulfilledResult<RunningTask> => result.status === "fulfilled")
      .map((result) => result.value);
    const launchFailure = launchResults.find((result): result is PromiseRejectedResult => result.status === "rejected");
    if (launchFailure) {
      for (const controller of controllers) {
        controller.abort();
      }
      for (const task of launched) {
        cleanupTask(task);
      }
      throw launchFailure.reason;
    }
    const progress = new Map<number, TaskProgressSnapshot>();
    const emitParallelProgress = () => {
      emitUpdate(pi, {
        requestId: request.requestId,
        taskProgress: launched.map((task) => {
          const snapshot = progress.get(task.index) ?? snapshotTask(task);
          return {
            index: task.index,
            agent: task.agent,
            status: snapshot.status,
            currentTool: snapshot.currentTool,
            currentToolArgs: snapshot.currentToolArgs,
            recentOutput: snapshot.recentOutput,
            recentOutputLines: snapshot.recentOutputLines,
            recentTools: snapshot.recentTools,
            model: snapshot.model,
            toolCount: snapshot.toolCount,
            durationMs: snapshot.durationMs,
            tokens: snapshot.tokens,
          };
        }),
      });
    };

    emitParallelProgress();

    const results = await Promise.all(
      launched.map((task) =>
        watchTask(task, (snapshot) => {
          progress.set(task.index, snapshot);
          emitParallelProgress();
        }).then((result) => {
          progress.set(task.index, {
            ...(progress.get(task.index) ?? snapshotTask(task)),
            status: result.isError ? "failed" : "completed",
          });
          emitParallelProgress();
          return result;
        }),
      ),
    );

    const failures = results.filter((result) => result.isError);
    const response: DelegatedSubagentResponse = {
      requestId: request.requestId,
      name: request.name,
      context: request.context,
      model: request.model,
      messages: [],
      parallelResults: results,
      isError: failures.length > 0,
      errorText:
        failures.length > 0
          ? failures.map((failure) => `${failure.agent}: ${failure.errorText || "unknown delegated error"}`).join("; ")
          : undefined,
    };
    pi.events.emit(RESPONSE_EVENT, response);
  } finally {
    runningRequests.delete(request.requestId);
  }
}

export default function promptTemplateInteractiveSubagentBridge(pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    latestCtx = ctx;
  });

  pi.on("session_switch", (_event, ctx) => {
    latestCtx = ctx;
  });

  pi.on("session_shutdown", () => {
    latestCtx = null;
    for (const { controllers } of runningRequests.values()) {
      for (const controller of controllers) controller.abort();
    }
    runningRequests.clear();
  });

  pi.events.on(CANCEL_EVENT, (payload) => {
    const requestId = (payload as { requestId?: string }).requestId;
    if (!requestId) return;
    const running = runningRequests.get(requestId);
    if (!running) return;
    for (const controller of running.controllers) controller.abort();
  });

  pi.events.on(REQUEST_EVENT, (payload) => {
    const request = payload as DelegatedSubagentRequest;
    pi.events.emit(STARTED_EVENT, { requestId: request.requestId });

    const ctx = latestCtx;
    if (!ctx) {
      queueMicrotask(() => {
        pi.events.emit(RESPONSE_EVENT, {
          requestId: request.requestId,
          context: request.context,
          model: request.model,
          messages: [],
          isError: true,
          errorText: "Subagent bridge has no active session context.",
        } satisfies DelegatedSubagentResponse);
      });
      return;
    }

    void (async () => {
      try {
        if (request.tasks && request.tasks.length > 0) {
          await processParallelRequest(pi, request, ctx);
        } else {
          await processSingleRequest(pi, request, ctx);
        }
      } catch (error) {
        pi.events.emit(RESPONSE_EVENT, {
          requestId: request.requestId,
          context: request.context,
          model: request.model,
          messages: [],
          isError: true,
          errorText: error instanceof Error ? error.message : String(error),
        } satisfies DelegatedSubagentResponse);
      }
    })();
  });
}
