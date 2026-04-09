const RETRYABLE_DELEGATED_ERROR_PATTERNS = [
	/\b429\b/,
	/temporar(?:ily|y) overloaded/i,
	/rate limit(?:ed|ing)?/i,
	/too many requests/i,
	/retry later/i,
];

export function isRetryableDelegatedErrorText(errorText: string | undefined): boolean {
	if (!errorText) return false;
	return RETRYABLE_DELEGATED_ERROR_PATTERNS.some((pattern) => pattern.test(errorText));
}

export function getDelegatedRetryDelayMs(retryIndex: number, baseDelayMs?: number): number {
	const configuredBase = baseDelayMs ?? Number(process.env.PI_PROMPT_SUBAGENT_RETRY_DELAY_MS ?? "2000");
	const safeBase = Number.isFinite(configuredBase) && configuredBase > 0 ? configuredBase : 2000;
	const exponent = Number.isFinite(retryIndex) && retryIndex > 0 ? retryIndex : 0;
	return Math.min(safeBase * (2 ** exponent), 30_000);
}

export function getDelegatedRetryCount(): number {
	const configured = Number(process.env.PI_PROMPT_SUBAGENT_RETRY_COUNT ?? "2");
	if (!Number.isFinite(configured) || configured < 0) return 2;
	return Math.floor(configured);
}

export async function waitForDelegatedRetry(delayMs: number, signal?: AbortSignal): Promise<void> {
	if (!(delayMs > 0)) return;
	await new Promise<void>((resolve, reject) => {
		const timeout = setTimeout(() => {
			cleanup();
			resolve();
		}, delayMs);

		const onAbort = () => {
			clearTimeout(timeout);
			cleanup();
			reject(new Error("Delegated prompt cancelled."));
		};

		const cleanup = () => {
			if (signal) signal.removeEventListener("abort", onAbort);
		};

		if (signal) {
			if (signal.aborted) {
				onAbort();
				return;
			}
			signal.addEventListener("abort", onAbort, { once: true });
		}
	});
}
