import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { recoverDelegatedTicketFlowFailure } from "../extensions/ticket-flow-delegated-recovery.ts";
import { artifactPaths } from "../extensions/ticket-flow-tools.ts";

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

function makeTempArtifactDir(): string {
  return mkdtempSync(join(tmpdir(), "smoke-delegated-recovery-"));
}

function writeHandoff(
  dir: string,
  ticket: string,
  runToken: string,
): void {
  const handoffDir = join(dir, "ticket-flow");
  mkdirSync(handoffDir, { recursive: true });
  writeFileSync(
    join(handoffDir, "handoff.json"),
    JSON.stringify({ ticket, run_token: runToken }),
    "utf8",
  );
}

const ticket = "ptf-ykcc";
const runToken = "20260414T131427Z";
const paths = artifactPaths(ticket, runToken);

let failures = 0;

if (
  !runCase("implement failure recovers to blocked artifact", () => {
    const artifactDir = makeTempArtifactDir();
    try {
      writeHandoff(artifactDir, ticket, runToken);
      const result = recoverDelegatedTicketFlowFailure({
        artifactDir,
        skill: "ticket-flow-delegated-handoff,ticket-implement",
        errorText: "Forbidden validation command...",
      });
      assert.ok(result, "expected recovery result");
      assert.equal(result.artifactPath, paths.implementation);
      const content = readFileSync(
        join(artifactDir, result.artifactPath),
        "utf8",
      );
      assert.match(content, /status: blocked/);
      assert.match(content, /step: implement/);
      assert.match(content, /source_artifact: none/);
    } finally {
      rmSync(artifactDir, { recursive: true, force: true });
    }
  })
) {
  failures++;
}

if (
  !runCase("validation failure recovers to blocked artifact", () => {
    const artifactDir = makeTempArtifactDir();
    try {
      writeHandoff(artifactDir, ticket, runToken);
      const result = recoverDelegatedTicketFlowFailure({
        artifactDir,
        skill: "ticket-flow-delegated-handoff,ticket-test-fix",
        errorText: "Delegated subagent cancelled.",
      });
      assert.ok(result, "expected recovery result");
      assert.equal(result.artifactPath, paths.validation);
      const content = readFileSync(
        join(artifactDir, result.artifactPath),
        "utf8",
      );
      assert.match(content, /status: blocked/);
      assert.match(content, /step: validate/);
      assert.match(
        content,
        new RegExp(`source_artifact: ${paths.implementation}`),
      );
    } finally {
      rmSync(artifactDir, { recursive: true, force: true });
    }
  })
) {
  failures++;
}

if (
  !runCase("review failure recovers to revise artifact", () => {
    const artifactDir = makeTempArtifactDir();
    try {
      writeHandoff(artifactDir, ticket, runToken);
      const result = recoverDelegatedTicketFlowFailure({
        artifactDir,
        skill: "ticket-flow-delegated-handoff,ticket-review",
        errorText: "Delegated subagent cancelled.",
      });
      assert.ok(result, "expected recovery result");
      assert.equal(result.artifactPath, paths.review);
      const content = readFileSync(
        join(artifactDir, result.artifactPath),
        "utf8",
      );
      assert.match(content, /status: revise/);
      assert.match(content, /step: review/);
      assert.match(
        content,
        new RegExp(`source_artifact: ${paths.validation}`),
      );
    } finally {
      rmSync(artifactDir, { recursive: true, force: true });
    }
  })
) {
  failures++;
}

if (
  !runCase("non-ticket-flow skill is not recovered", () => {
    const artifactDir = makeTempArtifactDir();
    try {
      writeHandoff(artifactDir, ticket, runToken);
      const result = recoverDelegatedTicketFlowFailure({
        artifactDir,
        skill: "researcher",
        errorText: "some error",
      });
      assert.equal(result, undefined);
      assert.equal(
        existsSync(join(artifactDir, paths.implementation)),
        false,
      );
      assert.equal(existsSync(join(artifactDir, paths.validation)), false);
      assert.equal(existsSync(join(artifactDir, paths.review)), false);
    } finally {
      rmSync(artifactDir, { recursive: true, force: true });
    }
  })
) {
  failures++;
}

if (
  !runCase("existing valid artifact is preserved", () => {
    const artifactDir = makeTempArtifactDir();
    try {
      writeHandoff(artifactDir, ticket, runToken);
      const validContent = `# Implementation Result

ticket: ${ticket}
step: implement
status: ready-for-validation
source_artifact: none

## Summary

Worker finished.

## Files Changed

- foo.ts

## Evidence

ok

## Remaining Issues

none
`;
      const implPath = join(artifactDir, paths.implementation);
      mkdirSync(dirname(implPath), { recursive: true });
      writeFileSync(implPath, validContent, "utf8");
      const result = recoverDelegatedTicketFlowFailure({
        artifactDir,
        skill: "ticket-flow-delegated-handoff,ticket-implement",
        errorText: "Forbidden validation command...",
      });
      assert.ok(result, "expected recovery result");
      assert.match(result.summary, /preserved/);
      const content = readFileSync(implPath, "utf8");
      assert.equal(content, validContent);
    } finally {
      rmSync(artifactDir, { recursive: true, force: true });
    }
  })
) {
  failures++;
}

if (
  !runCase("existing malformed artifact is repaired", () => {
    const artifactDir = makeTempArtifactDir();
    try {
      writeHandoff(artifactDir, ticket, runToken);
      const malformedContent = `# Implementation Result

ticket: ${ticket}
step: implement
status: blocked

## Summary

Missing source_artifact.

`;
      const implPath = join(artifactDir, paths.implementation);
      mkdirSync(dirname(implPath), { recursive: true });
      writeFileSync(implPath, malformedContent, "utf8");
      const result = recoverDelegatedTicketFlowFailure({
        artifactDir,
        skill: "ticket-flow-delegated-handoff,ticket-implement",
        errorText: "Forbidden validation command...",
      });
      assert.ok(result, "expected recovery result");
      assert.match(result.summary, /Wrote/);
      const content = readFileSync(implPath, "utf8");
      assert.match(content, /status: blocked/);
      assert.match(content, /step: implement/);
      assert.match(content, /source_artifact: none/);
    } finally {
      rmSync(artifactDir, { recursive: true, force: true });
    }
  })
) {
  failures++;
}

if (
  !runCase("missing handoff.json means no recovery", () => {
    const artifactDir = makeTempArtifactDir();
    try {
      const result = recoverDelegatedTicketFlowFailure({
        artifactDir,
        skill: "ticket-flow-delegated-handoff,ticket-implement",
        errorText: "Forbidden validation command...",
      });
      assert.equal(result, undefined);
    } finally {
      rmSync(artifactDir, { recursive: true, force: true });
    }
  })
) {
  failures++;
}

if (failures > 0) {
  console.error(`\n${failures} delegated recovery smoke check(s) failed.`);
  process.exit(1);
}

console.log("\nAll delegated recovery smoke checks passed.");
