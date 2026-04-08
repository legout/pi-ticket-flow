export interface LoopExtraction {
	args: string;
	loopCount: number | null;
	fresh: boolean;
	converge: boolean;
}

export interface LoopFlags {
	args: string;
	fresh: boolean;
	converge: boolean;
}

export interface SubagentOverride {
	enabled: true;
	agent?: string;
}

export interface SubagentOverrideExtraction {
	args: string;
	override?: SubagentOverride;
	explicitOverride?: boolean;
	cwd?: string;
	model?: string;
	fork?: boolean;
	errors?: string[];
}

interface ScannedToken {
	start: number;
	end: number;
	value: string;
	quoted: boolean;
}

function scanArgsTokens(input: string): ScannedToken[] {
	const tokens: ScannedToken[] = [];
	let i = 0;

	while (i < input.length) {
		while (i < input.length && /\s/.test(input[i])) i++;
		if (i >= input.length) break;

		const start = i;
		let inQuote: string | null = null;
		let value = "";
		let sawQuoted = false;
		let sawUnquoted = false;

		while (i < input.length) {
			const char = input[i];
			if (inQuote) {
				if (char === inQuote) {
					inQuote = null;
				} else {
					value += char;
				}
				i++;
				continue;
			}

			if (char === '"' || char === "'") {
				inQuote = char;
				sawQuoted = true;
				i++;
				continue;
			}
			if (/\s/.test(char)) break;

			value += char;
			sawUnquoted = true;
			i++;
		}

		tokens.push({
			start,
			end: i,
			value,
			quoted: sawQuoted && !sawUnquoted,
		});
	}

	return tokens;
}

function stripTokenRanges(input: string, ranges: Array<{ start: number; end: number }>): string {
	if (ranges.length === 0) return input.trim();

	const sorted = [...ranges].sort((a, b) => b.start - a.start);
	let cleaned = input;
	for (const { start, end } of sorted) {
		cleaned = cleaned.slice(0, start) + cleaned.slice(end);
	}
	return cleaned.trim();
}

export function extractLoopCount(argsString: string): LoopExtraction | null {
	const tokens = scanArgsTokens(argsString);
	let loopCount: number | null = null;
	let loopFound = false;
	let fresh = false;
	let noConverge = false;
	const tokensToRemove: Array<{ start: number; end: number }> = [];
	const loopTokenRanges: Array<{ start: number; end: number }> = [];

	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i]!;
		if (token.quoted) continue;

		if (token.value.startsWith("--loop=")) {
			loopTokenRanges.push({ start: token.start, end: token.end });
			const value = token.value.slice("--loop=".length);
			if (/^\d+$/.test(value)) {
				const parsed = parseInt(value, 10);
				if (parsed >= 1 && parsed <= 999 && !loopFound) {
					loopFound = true;
					loopCount = parsed;
				}
			}
			continue;
		}

		if (token.value === "--loop") {
			const nextToken = tokens[i + 1];
			if (nextToken && /^\d+$/.test(nextToken.value)) {
				loopTokenRanges.push({ start: token.start, end: token.end }, { start: nextToken.start, end: nextToken.end });
				const parsed = parseInt(nextToken.value, 10);
				if (parsed >= 1 && parsed <= 999 && !loopFound) {
					loopFound = true;
					loopCount = parsed;
				}
				i++;
				continue;
			}

			loopTokenRanges.push({ start: token.start, end: token.end });
			if (!loopFound) {
				loopFound = true;
				loopCount = null;
			}
			continue;
		}

		if (token.value === "--fresh") {
			fresh = true;
			tokensToRemove.push({ start: token.start, end: token.end });
		}

		if (token.value === "--no-converge") {
			noConverge = true;
			tokensToRemove.push({ start: token.start, end: token.end });
		}
	}

	if (!loopFound) return null;

	const converge = !noConverge;
	return { args: stripTokenRanges(argsString, [...tokensToRemove, ...loopTokenRanges]), loopCount, fresh, converge };
}

export function extractLoopFlags(argsString: string): LoopFlags {
	const tokens = scanArgsTokens(argsString);
	let fresh = false;
	let noConverge = false;
	const tokensToRemove: Array<{ start: number; end: number }> = [];

	for (const token of tokens) {
		if (token.quoted) continue;

		if (token.value === "--fresh") {
			fresh = true;
			tokensToRemove.push({ start: token.start, end: token.end });
		}

		if (token.value === "--no-converge") {
			noConverge = true;
			tokensToRemove.push({ start: token.start, end: token.end });
		}
	}

	return { args: stripTokenRanges(argsString, tokensToRemove), fresh, converge: !noConverge };
}

export function extractChainContextFlag(argsString: string): { args: string; chainContext: boolean } {
	const tokens = scanArgsTokens(argsString);
	let chainContext = false;
	const tokensToRemove: Array<{ start: number; end: number }> = [];

	for (const token of tokens) {
		if (token.quoted) continue;

		if (token.value === "--chain-context") {
			chainContext = true;
			tokensToRemove.push({ start: token.start, end: token.end });
		}
	}

	if (tokensToRemove.length === 0) {
		return { args: argsString.trim(), chainContext: false };
	}

	return { args: stripTokenRanges(argsString, tokensToRemove), chainContext };
}

export function extractSubagentOverride(argsString: string): SubagentOverrideExtraction {
	const tokens = scanArgsTokens(argsString);
	let override: SubagentOverride | undefined;
	let explicitOverride = false;
	let cwdRaw: string | undefined;
	let modelRaw: string | undefined;
	let fork = false;
	const errors: string[] = [];
	const tokensToRemove: Array<{ start: number; end: number }> = [];

	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i]!;
		if (token.quoted) continue;

		if (token.value === "--subagent") {
			tokensToRemove.push({ start: token.start, end: token.end });
			override = { enabled: true };
			explicitOverride = true;
			continue;
		}

		if (token.value.startsWith("--subagent=") || token.value.startsWith("--subagent:")) {
			tokensToRemove.push({ start: token.start, end: token.end });
			const value = token.value.includes("=") ? token.value.slice("--subagent=".length) : token.value.slice("--subagent:".length);
			override = value ? { enabled: true, agent: value } : { enabled: true };
			explicitOverride = true;
			continue;
		}

		if (token.value.startsWith("--cwd=")) {
			tokensToRemove.push({ start: token.start, end: token.end });
			const value = token.value.slice("--cwd=".length);
			if (!value) {
				errors.push("Missing value for --cwd");
			} else {
				cwdRaw = value;
			}
			continue;
		}

		if (token.value === "--cwd") {
			tokensToRemove.push({ start: token.start, end: token.end });
			const nextToken = tokens[i + 1];
			if (nextToken && (nextToken.quoted || !nextToken.value.startsWith("--"))) {
				tokensToRemove.push({ start: nextToken.start, end: nextToken.end });
				if (!nextToken.value) {
					errors.push("Missing value for --cwd");
				} else {
					cwdRaw = nextToken.value;
				}
				i++;
			} else {
				errors.push("Missing value for --cwd");
			}
			continue;
		}

		if (token.value.startsWith("--model=")) {
			tokensToRemove.push({ start: token.start, end: token.end });
			const value = token.value.slice("--model=".length);
			if (!value) {
				errors.push("Missing value for --model");
			} else {
				modelRaw = value;
			}
			continue;
		}

		if (token.value === "--model") {
			tokensToRemove.push({ start: token.start, end: token.end });
			const nextToken = tokens[i + 1];
			if (nextToken && (nextToken.quoted || !nextToken.value.startsWith("--"))) {
				tokensToRemove.push({ start: nextToken.start, end: nextToken.end });
				if (!nextToken.value) {
					errors.push("Missing value for --model");
				} else {
					modelRaw = nextToken.value;
				}
				i++;
			} else {
				errors.push("Missing value for --model");
			}
			continue;
		}

		if (token.value === "--fork") {
			tokensToRemove.push({ start: token.start, end: token.end });
			fork = true;
			continue;
		}
	}

	if (tokensToRemove.length === 0 && errors.length === 0) return { args: argsString.trim() };

	if (fork && !override) override = { enabled: true };

	return {
		args: stripTokenRanges(argsString, tokensToRemove),
		...(override ? { override } : {}),
		...(explicitOverride ? { explicitOverride: true } : {}),
		...(cwdRaw !== undefined ? { cwd: cwdRaw } : {}),
		...(modelRaw !== undefined ? { model: modelRaw } : {}),
		...(fork ? { fork: true } : {}),
		...(errors.length > 0 ? { errors } : {}),
	};
}

export function parseCommandArgs(argsString: string): string[] {
	return scanArgsTokens(argsString).map((token) => token.value).filter((value) => value.length > 0);
}

export function substituteArgs(content: string, args: string[]): string {
	let result = content;

	result = result.replace(/\$(\d+)/g, (_, num) => {
		const index = parseInt(num, 10) - 1;
		return args[index] ?? "";
	});

	result = result.replace(/\$\{@:(\d+)(?::(\d+))?\}/g, (_, startStr, lengthStr) => {
		let start = parseInt(startStr, 10) - 1;
		if (start < 0) start = 0;

		if (lengthStr) {
			const length = parseInt(lengthStr, 10);
			return args.slice(start, start + length).join(" ");
		}

		return args.slice(start).join(" ");
	});

	const allArgs = args.join(" ");
	result = result.replace(/\$ARGUMENTS/g, allArgs);
	result = result.replace(/\$@/g, allArgs);
	result = result.replace(/@\$/g, allArgs);

	return result;
}
