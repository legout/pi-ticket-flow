import type { Model } from "@mariozechner/pi-ai";
import type { ModelRegistry } from "@mariozechner/pi-coding-agent";
import type { ResolvedModelRef } from "./template-conditionals.js";

const PREFERRED_PROVIDERS = ["openai-codex", "anthropic", "github-copilot", "openrouter"];

export interface SelectedModelCandidate {
	model: Model<any>;
	alreadyActive: boolean;
}

export interface ModelSelectionOptions {
	excludedModels?: Set<string>;
}

export type RegistryLike = Pick<ModelRegistry, "find" | "getAll" | "getAvailable" | "getApiKeyForProvider" | "isUsingOAuth">;

function isSameModel(a: Model<any>, b: Model<any>): boolean {
	return a.provider === b.provider && a.id === b.id;
}

function modelSpecMatches(modelSpec: string, model: Model<any>): boolean {
	const slashIndex = modelSpec.indexOf("/");
	if (slashIndex !== -1) {
		const provider = modelSpec.slice(0, slashIndex);
		const modelId = modelSpec.slice(slashIndex + 1);
		return provider === model.provider && modelId === model.id;
	}

	return modelSpec === model.id;
}

export function getModelKey(model: Pick<Model<any>, "provider" | "id">): string {
	return `${model.provider}/${model.id}`;
}

function orderMatchesByProviderPreference(models: Model<any>[]): Model<any>[] {
	const prioritized: Model<any>[] = [];
	const seen = new Set<string>();

	for (const provider of PREFERRED_PROVIDERS) {
		for (const model of models) {
			const key = getModelKey(model);
			if (model.provider === provider && !seen.has(key)) {
				prioritized.push(model);
				seen.add(key);
			}
		}
	}

	for (const model of models) {
		const key = getModelKey(model);
		if (!seen.has(key)) {
			prioritized.push(model);
			seen.add(key);
		}
	}

	return prioritized;
}

function getModelCandidates(modelSpec: string, registry: Pick<ModelRegistry, "find" | "getAll">): Model<any>[] {
	const slashIndex = modelSpec.indexOf("/");

	if (slashIndex !== -1) {
		const provider = modelSpec.slice(0, slashIndex);
		const modelId = modelSpec.slice(slashIndex + 1);
		if (!provider || !modelId || modelId.includes("/")) return [];
		const model = registry.find(provider, modelId);
		return model ? [model] : [];
	}

	const allMatches = registry.getAll().filter((model) => model.id === modelSpec);
	if (allMatches.length <= 1) return allMatches;
	return orderMatchesByProviderPreference(allMatches);
}

async function hasUsableAuth(model: Model<any>, registry: RegistryLike): Promise<boolean> {
	const availableMatch = registry.getAvailable().some((candidate) => isSameModel(candidate, model));
	if (availableMatch) return true;
	if (!registry.isUsingOAuth(model)) return false;
	return Boolean(await registry.getApiKeyForProvider(model.provider));
}

export async function listModelCandidates(
	modelSpecs: string[],
	currentModel: Model<any> | undefined,
	registry: RegistryLike,
	options?: ModelSelectionOptions,
): Promise<SelectedModelCandidate[]> {
	const excludedModels = options?.excludedModels ?? new Set<string>();
	const selected: SelectedModelCandidate[] = [];
	const seen = new Set<string>();

	const maybeAddModel = async (model: Model<any>, alreadyActive: boolean) => {
		const key = getModelKey(model);
		if (seen.has(key) || excludedModels.has(key)) return;
		if (!(await hasUsableAuth(model, registry))) return;
		seen.add(key);
		selected.push({ model, alreadyActive });
	};

	if (currentModel && modelSpecs.some((spec) => modelSpecMatches(spec, currentModel))) {
		await maybeAddModel(currentModel, true);
	}

	for (const spec of modelSpecs) {
		for (const model of getModelCandidates(spec, registry)) {
			await maybeAddModel(model, currentModel ? isSameModel(model, currentModel) : false);
		}
	}

	return selected;
}

export async function selectModelCandidate(
	modelSpecs: string[],
	currentModel: Model<any> | undefined,
	registry: RegistryLike,
	options?: ModelSelectionOptions,
): Promise<SelectedModelCandidate | undefined> {
	const candidates = await listModelCandidates(modelSpecs, currentModel, registry, options);
	return candidates[0];
}

export function getResolvedModelRef(model: Model<any>): ResolvedModelRef {
	return { provider: model.provider, id: model.id };
}
