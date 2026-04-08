import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractRoleMessages,
  summarizeDelegatedTaskOutcome,
  type RoleMessage,
  type SessionEntryLike,
} from "../extensions/delegated-subagent-outcome.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixturesDir = resolve(repoRoot, "fixtures", "delegated-subagent");

function loadFixture(name: string): RoleMessage[] {
  const raw = readFileSync(resolve(fixturesDir, name), "utf8");
  const entries = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as SessionEntryLike);
  return extractRoleMessages(entries);
}

function runCase(name: string, fn: () => void): boolean {
  try {
    fn();
    console.log(`ok - ${name}`);
    return true;
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error instanceof Error ? error.message : String(error));
    return false;
  }
}

const success = loadFixture("session-success.jsonl");
const providerError = loadFixture("session-error-429.jsonl");
const aborted: RoleMessage[] = [
  {
    role: "assistant",
    content: [],
    stopReason: "aborted",
  },
];

let failures = 0;

if (!runCase("success transcript stays successful", () => {
  const outcome = summarizeDelegatedTaskOutcome(success, "worker", 0);
  assert.equal(outcome.isError, false);
  assert.equal(outcome.errorText, undefined);
  assert.equal(
    outcome.summary,
    "Validation artifact written to: `ticket-flow/flo-f891/validation-20260408T171628Z.md`",
  );
})) failures++;

if (!runCase("assistant stopReason:error is surfaced even when exit code is 0", () => {
  const outcome = summarizeDelegatedTaskOutcome(providerError, "worker", 0);
  assert.equal(outcome.isError, true);
  assert.match(outcome.summary, /429 The service may be temporarily overloaded/);
  assert.match(outcome.errorText ?? "", /429 The service may be temporarily overloaded/);
})) failures++;

if (!runCase("assistant stopReason:aborted is surfaced as an error", () => {
  const outcome = summarizeDelegatedTaskOutcome(aborted, "reviewer", 0);
  assert.equal(outcome.isError, true);
  assert.equal(outcome.summary, "Delegated subagent aborted.");
  assert.equal(outcome.errorText, "Delegated subagent aborted.");
})) failures++;

if (failures > 0) {
  console.error(`\n${failures} delegated-subagent smoke check(s) failed.`);
  process.exit(1);
}

console.log("\nAll delegated-subagent outcome smoke checks passed.");
