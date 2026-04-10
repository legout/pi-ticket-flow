import assert from "node:assert/strict";
import {
  deriveDelegatedExecutionPolicy,
  detectDelegatedPolicyViolation,
} from "../extensions/delegated-execution-policy.ts";
import type { RoleMessage } from "../extensions/delegated-subagent-outcome.ts";

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

function bashCall(command: string, timeout?: number): RoleMessage[] {
  return [
    {
      role: "assistant",
      content: [
        {
          type: "toolCall",
          name: "bash",
          arguments: timeout === undefined ? { command } : { command, timeout },
        },
      ],
    },
  ];
}

let failures = 0;

if (!runCase("ticket-implement forbids validation commands", () => {
  const policy = deriveDelegatedExecutionPolicy("ticket-implement", "Implement exactly this ticket.");
  assert.deepEqual(policy, { forbidValidationCommands: true });
  const violation = detectDelegatedPolicyViolation(
    bashCall("python -m pytest tests/pipeline/test_registry.py -x -q"),
    policy,
  );
  assert.match(violation ?? "", /Forbidden validation command during implementation step/);
})) failures++;

if (!runCase("ticket-implement allows non-validation bash commands", () => {
  const policy = deriveDelegatedExecutionPolicy("ticket-implement", "Implement exactly this ticket.");
  const violation = detectDelegatedPolicyViolation(
    bashCall("rg -n \"PipelinePresenter\" src tests"),
    policy,
  );
  assert.equal(violation, undefined);
})) failures++;

if (!runCase("ticket-test-fix requires timeout on validation commands", () => {
  const policy = deriveDelegatedExecutionPolicy("ticket-test-fix", "Validate and fix the currently selected ticket.");
  assert.deepEqual(policy, { requireTimeoutForValidationCommands: true });
  const violation = detectDelegatedPolicyViolation(
    bashCall("python -m pytest tests/pipeline/test_registry.py -x -q"),
    policy,
  );
  assert.match(violation ?? "", /missing timeout/);
})) failures++;

if (!runCase("ticket-test-fix accepts bash timeout field", () => {
  const policy = deriveDelegatedExecutionPolicy("ticket-test-fix", "Validate and fix the currently selected ticket.");
  const violation = detectDelegatedPolicyViolation(
    bashCall("python -m pytest tests/pipeline/test_registry.py -x -q", 120),
    policy,
  );
  assert.equal(violation, undefined);
})) failures++;

if (!runCase("ticket-test-fix accepts shell timeout wrapper", () => {
  const policy = deriveDelegatedExecutionPolicy("ticket-test-fix", "Validate and fix the currently selected ticket.");
  const violation = detectDelegatedPolicyViolation(
    bashCall("gtimeout 120 python -m pytest tests/pipeline/test_registry.py -x -q"),
    policy,
  );
  assert.equal(violation, undefined);
})) failures++;

if (failures > 0) {
  console.error(`\n${failures} delegated policy smoke check(s) failed.`);
  process.exit(1);
}

console.log("\nAll delegated policy smoke checks passed.");
