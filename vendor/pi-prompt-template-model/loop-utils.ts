import type { AssistantMessage, Message } from "@mariozechner/pi-ai";
import type { ExtensionContext, SessionEntry } from "@mariozechner/pi-coding-agent";
import { PROMPT_TEMPLATE_SUBAGENT_MESSAGE_TYPE } from "./subagent-runtime.js";

interface DelegatedMessageDetails {
	messages?: Message[];
	parallelResults?: Array<{ messages?: Message[] }>;
}

interface CollectedSummaryData {
	filesRead: Set<string>;
	filesWritten: Set<string>;
	commandCount: number;
	lastAssistantText: string;
}

const CHAIN_STOP_DIRECTIVE = /^\s*<!--\s*CHAIN_STOP\s*-->\s*$/gim;

function stripChainControlDirectives(text: string): string {
	return text.replace(CHAIN_STOP_DIRECTIVE, "").trim();
}

export function hasChainStopDirective(text: string | undefined): boolean {
	if (!text) return false;
	CHAIN_STOP_DIRECTIVE.lastIndex = 0;
	return CHAIN_STOP_DIRECTIVE.test(text);
}

function collectAssistantActions(messages: Message[], filesRead: Set<string>, filesWritten: Set<string>): { commandCount: number; lastText: string } {
	let commandCount = 0;
	let lastText = "";

	for (const msg of messages) {
		if (msg.role !== "assistant") continue;
		for (const block of (msg as AssistantMessage).content) {
			if (block.type === "text") {
				const cleaned = stripChainControlDirectives(block.text);
				if (cleaned) lastText = cleaned;
				continue;
			}
			if (block.type !== "toolCall") continue;
			if (block.name === "bash") {
				commandCount++;
				continue;
			}
			const path = (block.arguments as Record<string, unknown>).path as string | undefined;
			const artifactName = (block.arguments as Record<string, unknown>).name as string | undefined;
			if (block.name === "read" && path) filesRead.add(path);
			if (block.name === "read_artifact" && artifactName) filesRead.add(`artifact:${artifactName}`);
			if ((block.name === "write" || block.name === "edit") && path) filesWritten.add(path);
			if (block.name === "write_artifact" && artifactName) filesWritten.add(`artifact:${artifactName}`);
		}
	}

	return { commandCount, lastText };
}

function delegatedDetails(entry: SessionEntry): DelegatedMessageDetails | undefined {
	if (entry.type !== "custom_message") return undefined;
	if (entry.customType !== PROMPT_TEMPLATE_SUBAGENT_MESSAGE_TYPE) return undefined;
	if (!entry.details || typeof entry.details !== "object") return undefined;
	return entry.details as DelegatedMessageDetails;
}

function collectSummaryData(entries: SessionEntry[]): CollectedSummaryData {
	const filesRead = new Set<string>();
	const filesWritten = new Set<string>();
	let commandCount = 0;
	let lastAssistantText = "";

	for (const entry of entries) {
		if (entry.type === "message") {
			const msg = entry.message;
			if (msg.role !== "assistant") continue;
			const collected = collectAssistantActions([msg], filesRead, filesWritten);
			commandCount += collected.commandCount;
			if (collected.lastText) lastAssistantText = collected.lastText;
			continue;
		}

		const delegated = delegatedDetails(entry);
		if (!delegated) continue;
		const messageGroups =
			delegated.parallelResults && delegated.parallelResults.length > 0
				? delegated.parallelResults.map((result) => result.messages ?? [])
				: delegated.messages ? [delegated.messages] : [];
		for (const messages of messageGroups) {
			const collected = collectAssistantActions(messages, filesRead, filesWritten);
			commandCount += collected.commandCount;
			if (collected.lastText) lastAssistantText = collected.lastText;
		}
	}

	return {
		filesRead,
		filesWritten,
		commandCount,
		lastAssistantText,
	};
}

function formatSummary(header: string, entries: SessionEntry[]): string {
	const { filesRead, filesWritten, commandCount, lastAssistantText } = collectSummaryData(entries);

	let summary = header;

	const actionParts: string[] = [];
	if (filesRead.size > 0) actionParts.push(`read ${filesRead.size} file(s)`);
	if (filesWritten.size > 0) actionParts.push(`modified ${[...filesWritten].join(", ")}`);
	if (commandCount > 0) actionParts.push(`ran ${commandCount} command(s)`);
	if (actionParts.length > 0) {
		summary += `\nActions: ${actionParts.join(", ")}.`;
	}

	if (lastAssistantText) {
		const cleaned = lastAssistantText.replace(/\n+/g, " ").trim();
		const truncated = cleaned.slice(0, 500);
		summary += `\nOutcome: ${truncated}${cleaned.length > 500 ? "..." : ""}`;
	}

	return summary;
}

export function generateIterationSummary(entries: SessionEntry[], task: string, iteration: number, totalIterations: number | null): string {
	const header = totalIterations !== null
		? `[Loop iteration ${iteration}/${totalIterations}]\nTask: "${task}"`
		: `[Loop iteration ${iteration}]\nTask: "${task}"`;
	return formatSummary(header, entries);
}

export function generateChainStepSummary(entries: SessionEntry[], stepLabel: string, stepNumber: number): string {
	return formatSummary(`Step ${stepNumber} — ${stepLabel}:`, entries);
}

export function didIterationMakeChanges(entries: SessionEntry[]): boolean {
	for (const entry of entries) {
		if (entry.type === "message") {
			if (entry.message.role !== "assistant") continue;
			for (const block of (entry.message as AssistantMessage).content) {
				if (block.type !== "toolCall") continue;
				if (block.name === "write" || block.name === "edit" || block.name === "write_artifact") return true;
			}
			continue;
		}

		const delegated = delegatedDetails(entry);
		if (!delegated) continue;
		const delegatedGroups =
			delegated.parallelResults && delegated.parallelResults.length > 0
				? delegated.parallelResults.map((result) => result.messages ?? [])
				: [delegated.messages ?? []];
		for (const messages of delegatedGroups) {
			for (const message of messages) {
				if (message.role !== "assistant") continue;
				for (const block of (message as AssistantMessage).content) {
					if (block.type !== "toolCall") continue;
					if (block.name === "write" || block.name === "edit" || block.name === "write_artifact") return true;
				}
			}
		}
	}
	return false;
}

export function getIterationLastAssistantText(entries: SessionEntry[]): string {
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (entry?.type !== "message") continue;
		const message = entry.message;
		if (message.role !== "assistant") continue;
		for (let j = (message as AssistantMessage).content.length - 1; j >= 0; j--) {
			const block = (message as AssistantMessage).content[j];
			if (block.type !== "text") continue;
			const raw = block.text.trim();
			if (raw) return raw;
		}
	}
	return "";
}

export function getIterationEntries(ctx: Pick<ExtensionContext, "sessionManager">, startId: string | null): SessionEntry[] {
	const branch = ctx.sessionManager.getBranch();
	if (!startId) return branch;
	const startIdx = branch.findIndex((e) => e.id === startId);
	if (startIdx < 0) return branch;
	return branch.slice(startIdx + 1);
}

export function wasIterationAborted(entries: SessionEntry[]): boolean {
	for (const entry of entries) {
		if (entry.type !== "message" || entry.message.role !== "assistant") continue;
		if ((entry.message as AssistantMessage).stopReason === "aborted") return true;
	}
	return false;
}
