import { type Component, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import { getDelegatedLiveState, type DelegatedSubagentLiveState, type DelegatedSubagentTask, type DelegatedSubagentTaskProgress } from "./subagent-runtime.js";

export const DELEGATED_WIDGET_KEY = "prompt-subagent-progress";

const ACCENT = "\x1b[38;2;77;163;255m";
const RST = "\x1b[0m";

type DelegatedProgressWidget = Component & { dispose?(): void };

function formatElapsedMMSS(startTime: number): string {
	const seconds = Math.floor((Date.now() - startTime) / 1000);
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatTokens(n: number | undefined): string {
	if (!n) return "0";
	if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
	return String(n);
}

function borderLine(left: string, right: string, width: number): string {
	if (width <= 0) return "";
	if (width === 1) return `${ACCENT}│${RST}`;

	const contentWidth = Math.max(0, width - 2);
	const rightVis = visibleWidth(right);

	if (rightVis >= contentWidth) {
		const truncRight = truncateToWidth(right, contentWidth);
		const rightPad = Math.max(0, contentWidth - visibleWidth(truncRight));
		return `${ACCENT}│${RST}${truncRight}${" ".repeat(rightPad)}${ACCENT}│${RST}`;
	}

	const maxLeft = Math.max(0, contentWidth - rightVis);
	const truncLeft = truncateToWidth(left, maxLeft);
	const leftVis = visibleWidth(truncLeft);
	const pad = Math.max(0, contentWidth - leftVis - rightVis);
	return `${ACCENT}│${RST}${truncLeft}${" ".repeat(pad)}${right}${ACCENT}│${RST}`;
}

function borderTop(title: string, info: string, width: number): string {
	if (width <= 0) return "";
	if (width === 1) return `${ACCENT}╭${RST}`;

	const inner = Math.max(0, width - 2);
	const titlePart = `─ ${title} `;
	const infoPart = ` ${info} ─`;
	const fillLen = Math.max(0, inner - titlePart.length - infoPart.length);
	const fill = "─".repeat(fillLen);
	const content = `${titlePart}${fill}${infoPart}`.slice(0, inner).padEnd(inner, "─");
	return `${ACCENT}╭${content}╮${RST}`;
}

function borderBottom(width: number): string {
	if (width <= 0) return "";
	if (width === 1) return `${ACCENT}╰${RST}`;

	const inner = Math.max(0, width - 2);
	return `${ACCENT}╰${"─".repeat(inner)}╯${RST}`;
}

function displayName(agent: string): string {
	if (!agent) return "Subagent";
	return agent.charAt(0).toUpperCase() + agent.slice(1);
}

function taskPreview(task: string | undefined, maxLen = 48): string | undefined {
	if (!task) return undefined;
	const firstLine = task.split("\n").find((line) => line.trim())?.trim();
	if (!firstLine) return undefined;
	return firstLine.length > maxLen ? `${firstLine.slice(0, maxLen - 1)}…` : firstLine;
}

function inferTaskLabel(agent: string, task: string | undefined): string | undefined {
	if (!task) return undefined;
	const normalized = task.toLowerCase();
	if (normalized.includes("implement the currently selected ticket") || normalized.includes("implement exactly this ticket")) {
		return "Implementation";
	}
	if (normalized.includes("validate and fix the currently selected ticket") || normalized.includes("validation is green")) {
		return "Validation";
	}
	if (normalized.includes("acceptance criteria satisfaction") || normalized.includes("lens: correctness")) {
		return "Correctness Review";
	}
	if (normalized.includes("regression risk") || normalized.includes("lens: regression")) {
		return "Regression Review";
	}
	if (normalized.includes("validation-and-maintainability") || normalized.includes("adequacy of validation and test coverage")) {
		return "Test Review";
	}
	if (normalized.includes("critically review the currently selected ticket") || normalized.includes("perform a deep candidate review")) {
		return agent === "reviewer" ? "Review" : undefined;
	}
	return undefined;
}

function formatTaskLabel(name: string | undefined, agent: string, task: string | undefined): string {
	const label = name?.trim() || inferTaskLabel(agent, task) || taskPreview(task) || displayName(agent);
	return `${label} (${agent})`;
}

function formatStatus(progress: {
	status?: string;
	currentTool?: string;
	toolCount?: number;
	tokens?: number;
} | undefined): string {
	if (!progress) return " starting… ";
	if (progress.status === "failed") return " failed ";
	if (progress.status === "completed") return " completed ";
	if (progress.currentTool) return ` ${progress.currentTool}… `;

	const toolCount = progress.toolCount ?? 0;
	const tokens = progress.tokens ?? 0;
	if (toolCount > 0) {
		return ` ${toolCount} tool${toolCount === 1 ? "" : "s"} (${formatTokens(tokens)} tok) `;
	}
	if (tokens > 0) {
		return ` ${formatTokens(tokens)} tok `;
	}
	return " starting… ";
}

function findTaskProgress(
	taskProgress: DelegatedSubagentTaskProgress[],
	task: DelegatedSubagentTask,
	index: number,
): DelegatedSubagentTaskProgress | undefined {
	return (
		taskProgress.find((entry) => entry.index === index) ??
		taskProgress.find((entry) => entry.index === undefined && entry.agent === task.agent) ??
		taskProgress[index]
	);
}

function renderSingleWidgetLines(
	name: string | undefined,
	agent: string,
	task: string | undefined,
	state: DelegatedSubagentLiveState | undefined,
	width: number,
): string[] {
	const title = "Subagents";
	const info = "1 running";
	const startTime = state?.startedAt ?? Date.now();
	const left = ` ${formatElapsedMMSS(startTime)}  ${formatTaskLabel(name, agent, task)} `;
	const right = formatStatus(state);
	return [borderTop(title, info, width), borderLine(left, right, width), borderBottom(width)];
}

function renderParallelWidgetLines(
	title: string,
	tasks: DelegatedSubagentTask[],
	state: DelegatedSubagentLiveState | undefined,
	width: number,
): string[] {
	const info = `${tasks.length} running`;
	const lines = [borderTop(title, info, width)];
	const startTime = state?.startedAt ?? Date.now();
	const taskProgress = state?.taskProgress ?? [];

	for (let index = 0; index < tasks.length; index++) {
		const task = tasks[index]!;
		const progress = findTaskProgress(taskProgress, task, index);
		const left = ` ${formatElapsedMMSS(startTime)}  ${formatTaskLabel(task.name, task.agent, task.task)} `;
		const right = formatStatus(progress);
		lines.push(borderLine(left, right, width));
	}

	lines.push(borderBottom(width));
	return lines;
}

export function createDelegatedProgressWidget(
	requestId: string,
	request: { name?: string; agent: string; task: string; tasks?: DelegatedSubagentTask[] },
): DelegatedProgressWidget {
	return {
		invalidate() {},
		render(width: number) {
			const state = getDelegatedLiveState(requestId);
			const tasks = request.tasks;
			if (tasks && tasks.length > 0) {
				return renderParallelWidgetLines(request.name ?? "Subagents", tasks, state, width);
			}
			return renderSingleWidgetLines(request.name, request.agent, request.task, state, width);
		},
	};
}
