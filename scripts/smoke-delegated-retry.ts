import assert from "node:assert/strict";
import {
  getDelegatedRetryDelayMs,
  isRetryableDelegatedErrorText,
} from "../vendor/pi-prompt-template-model/delegated-retry.ts";

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

let failures = 0;

if (!runCase("429 overload errors are retryable", () => {
  assert.equal(
    isRetryableDelegatedErrorText("Delegated prompt execution failed: 429 The service may be temporarily overloaded, please try again later"),
    true,
  );
  assert.equal(isRetryableDelegatedErrorText("429 Too Many Requests"), true);
  assert.equal(isRetryableDelegatedErrorText("rate limit exceeded"), true);
})) failures++;

if (!runCase("non-transient errors are not retryable", () => {
  assert.equal(isRetryableDelegatedErrorText("Delegated prompt cancelled."), false);
  assert.equal(isRetryableDelegatedErrorText("SyntaxError: unexpected token"), false);
  assert.equal(isRetryableDelegatedErrorText(undefined), false);
})) failures++;

if (!runCase("retry delays back off exponentially and cap", () => {
  assert.equal(getDelegatedRetryDelayMs(0, 1000), 1000);
  assert.equal(getDelegatedRetryDelayMs(1, 1000), 2000);
  assert.equal(getDelegatedRetryDelayMs(2, 1000), 4000);
  assert.equal(getDelegatedRetryDelayMs(10, 1000), 30000);
})) failures++;

if (failures > 0) {
  console.error(`\n${failures} delegated retry smoke check(s) failed.`);
  process.exit(1);
}

console.log("\nAll delegated retry smoke checks passed.");
