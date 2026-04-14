import assert from "node:assert/strict";
import type { Model } from "@mariozechner/pi-ai";
import {
  listModelCandidates,
  selectModelCandidate,
} from "../vendor/pi-prompt-template-model/model-selection.ts";

const models = [
  { provider: "openai-codex", id: "gpt-5.4-mini" },
  { provider: "kimi-coding", id: "k2.6-coding-preview" },
  { provider: "zai", id: "glm-5.1" },
] as Array<Model<any>>;

const registry = {
  find(provider: string, id: string) {
    return models.find((model) => model.provider === provider && model.id === id);
  },
  getAll() {
    return models;
  },
  getAvailable() {
    return models;
  },
  async getApiKeyForProvider() {
    return undefined;
  },
  isUsingOAuth() {
    return false;
  },
};

function runCase(name: string, fn: () => Promise<void> | void): Promise<boolean> {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`ok - ${name}`);
      return true;
    })
    .catch((error) => {
      console.error(`not ok - ${name}`);
      console.error(error instanceof Error ? error.message : String(error));
      return false;
    });
}

let failures = 0;

if (!(await runCase("candidate order follows prompt order", async () => {
  const candidates = await listModelCandidates(["openai-codex/gpt-5.4-mini", "zai/glm-5.1"], undefined, registry);
  assert.deepEqual(
    candidates.map((candidate) => `${candidate.model.provider}/${candidate.model.id}`),
    ["openai-codex/gpt-5.4-mini", "zai/glm-5.1"],
  );
}))) failures++;

if (!(await runCase("excluded models are skipped for fallback selection", async () => {
  const candidate = await selectModelCandidate(
    ["openai-codex/gpt-5.4-mini", "kimi-coding/k2.6-coding-preview", "zai/glm-5.1"],
    undefined,
    registry,
    { excludedModels: new Set(["openai-codex/gpt-5.4-mini", "kimi-coding/k2.6-coding-preview"]) },
  );
  assert.equal(candidate?.model.provider, "zai");
  assert.equal(candidate?.model.id, "glm-5.1");
}))) failures++;

if (!(await runCase("matching current model stays first when allowed", async () => {
  const currentModel = models[2]!;
  const candidates = await listModelCandidates(["openai-codex/gpt-5.4-mini", "zai/glm-5.1"], currentModel, registry);
  assert.equal(candidates[0]?.model.provider, "zai");
  assert.equal(candidates[0]?.alreadyActive, true);
}))) failures++;

if (failures > 0) {
  console.error(`\n${failures} model-selection smoke check(s) failed.`);
  process.exit(1);
}

console.log("\nAll model-selection smoke checks passed.");
