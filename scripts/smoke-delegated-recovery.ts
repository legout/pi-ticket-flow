import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { recoverDelegatedTicketFlowFailure } from "../extensions/ticket-flow-delegated-recovery.ts";

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

function withArtifactDir(fn: (artifactDir: string) => void) {
  const artifactDir = mkdtempSync(join(tmpdir(), "pi-ticket-flow-recovery-"));
  try {
    const handoffPath = join(artifactDir, "ticket-flow", "handoff.json");
    mkdirSync(join(artifactDir, "ticket-flow"), { recursive: true });
    writeFileSync(
      handoffPath,
      JSON.stringify({
        ticket: "ptf-test",
        run_token: "20260414T000000Z",
      }, null, 2),
      "utf8",
    );
    fn(artifactDir);
  } finally {
    rmSync(artifactDir, { recursive: true, force: true });
  }
}

let failures = 0;

if (!runCase("retryable 429 recovery is marked transient-provider", () => {
  withArtifactDir((artifactDir) => {
    const result = recoverDelegatedTicketFlowFailure({
      artifactDir,
      skill: "ticket-flow-delegated-handoff,ticket-implement",
      errorText: "429 The service may be temporarily overloaded, please try again later",
    });
    assert.ok(result);
    const content = readFileSync(join(artifactDir, result.artifactPath), "utf8");
    assert.match(content, /^status: blocked$/m);
    assert.match(content, /^failure_class: transient-provider$/m);
    assert.match(content, /transient provider error/i);
  });
})) failures++;

if (!runCase("non-retryable recovery stays delegated-step-failure", () => {
  withArtifactDir((artifactDir) => {
    const result = recoverDelegatedTicketFlowFailure({
      artifactDir,
      skill: "ticket-flow-delegated-handoff,ticket-test-fix",
      errorText: "SyntaxError: unexpected token",
    });
    assert.ok(result);
    const content = readFileSync(join(artifactDir, result.artifactPath), "utf8");
    assert.match(content, /^status: blocked$/m);
    assert.match(content, /^failure_class: delegated-step-failure$/m);
    assert.doesNotMatch(content, /transient provider error/i);
  });
})) failures++;

if (failures > 0) {
  console.error(`\n${failures} delegated recovery smoke check(s) failed.`);
  process.exit(1);
}

console.log("\nAll delegated recovery smoke checks passed.");
