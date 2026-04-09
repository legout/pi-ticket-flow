import assert from "node:assert/strict";
import {
  buildTaskMessage,
  ensureAssistantSummary,
} from "../extensions/bridge-message-utils.ts";

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

const genericWorkerBody = [
  "# Worker Agent",
  "",
  "## Workflow",
  "",
  'If a TODO is referenced, read its details: `todo(action: "get", id: "TODO-xxxx")`',
].join("\n");

const ticketTask = [
  "Implement the currently selected ticket only.",
  "",
  "- Use `read_artifact` / `write_artifact` for all `ticket-flow/*` workflow state.",
  "- Do **not** implement a child ticket or sibling ticket instead of the selected ticket.",
].join("\n");

let failures = 0;

if (!runCase("specialized delegated tasks put ticket contract ahead of generic worker guidance", () => {
  const message = buildTaskMessage(
    {
      autoExit: true,
      body: genericWorkerBody,
    },
    ticketTask,
    "fresh",
    "ticket-implement",
  );

  assert.match(message, /Task-specific prompt and skill instructions are the authoritative workflow contract/);
  assert.ok(
    message.indexOf("Implement the currently selected ticket only.") < message.indexOf("# Worker Agent"),
    "ticket contract should appear before the generic worker instructions",
  );
  assert.match(message, /Do not reinterpret ticket ids \(for example `flo-1234`\) as todo ids/);
})) failures++;

if (!runCase("generic delegated tasks keep legacy worker-first ordering when no specialized skill is present", () => {
  const message = buildTaskMessage(
    {
      autoExit: true,
      body: genericWorkerBody,
    },
    "Reply with exactly two lines:\nbridge ok",
    "fresh",
  );

  assert.ok(
    message.indexOf("# Worker Agent") < message.indexOf("Reply with exactly two lines:"),
    "generic worker instructions should stay ahead of simple delegated tasks",
  );
})) failures++;

if (!runCase("ensureAssistantSummary preserves existing assistant text", () => {
  const messages = [
    {
      role: "assistant",
      content: [{ type: "text", text: "Existing delegated summary" }],
    },
  ];

  const result = ensureAssistantSummary(messages, "Fallback summary");
  assert.deepEqual(result, messages);
})) failures++;

if (!runCase("ensureAssistantSummary appends fallback summary when assistant text is missing", () => {
  const messages = [
    {
      role: "assistant",
      content: [{ type: "toolCall", name: "write_artifact", arguments: { name: "ticket-flow/current.md" } }],
    },
  ];

  const result = ensureAssistantSummary(messages, "Delegated subagent completed.");
  assert.equal(result.length, 2);
  const appended = result[1] as { role?: string; content?: Array<{ type?: string; text?: string }> };
  assert.equal(appended.role, "assistant");
  assert.equal(appended.content?.[0]?.type, "text");
  assert.equal(appended.content?.[0]?.text, "Delegated subagent completed.");
})) failures++;

if (failures > 0) {
  console.error(`\n${failures} bridge message smoke check(s) failed.`);
  process.exit(1);
}

console.log("\nAll bridge message smoke checks passed.");
