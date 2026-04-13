import assert from "node:assert/strict";
import {
  buildTaskMessage,
  ensureAssistantSummary,
  formatLoadedSkillBlock,
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
  const delegatedSkill = formatLoadedSkillBlock(
    "ticket-implement",
    [
      "# Ticket Implement",
      "",
      "Write the implementation artifact using exact lowercase `ticket:` and `status:` lines.",
    ].join("\n"),
  );
  const message = buildTaskMessage(
    {
      autoExit: true,
      body: genericWorkerBody,
    },
    ticketTask,
    "fresh",
    "ticket-implement",
    delegatedSkill,
  );

  assert.match(message, /Task-specific prompt and skill instructions are the authoritative workflow contract/);
  assert.match(message, /<skill name="ticket-implement">/);
  assert.ok(
    message.indexOf("<skill name=\"ticket-implement\">") < message.indexOf("Implement the currently selected ticket only."),
    "resolved skill instructions should appear before the delegated task",
  );
  assert.doesNotMatch(message, /# Worker Agent/);
  assert.match(message, /Do not reinterpret ticket ids \(for example `flo-1234`\) as todo ids/);
})) failures++;

if (!runCase("forked specialized delegated tasks still inline resolved skill instructions", () => {
  const delegatedSkill = formatLoadedSkillBlock(
    "ticket-review",
    [
      "# Ticket Review",
      "",
      "Write the review artifact using exact lowercase `ticket:` and `gate:` lines.",
    ].join("\n"),
  );

  const message = buildTaskMessage(
    {
      autoExit: true,
      body: genericWorkerBody,
    },
    "Review the selected ticket.",
    "fork",
    "ticket-review",
    delegatedSkill,
  );

  assert.match(message, /Task-specific prompt and skill instructions are the authoritative workflow contract/);
  assert.match(message, /<skill name="ticket-review">/);
  assert.match(message, /Review the selected ticket\./);
})) failures++;

if (!runCase("delegated tasks can inline shared and specialized skills together", () => {
  const delegatedSkills = [
    formatLoadedSkillBlock(
      "ticket-flow-delegated-handoff",
      [
        "# Ticket Flow Delegated Handoff",
        "",
        "Read `ticket-flow/handoff.json` via `read_artifact` and treat it as authoritative.",
      ].join("\n"),
    ),
    formatLoadedSkillBlock(
      "ticket-implement",
      [
        "# Ticket Implement",
        "",
        "Write the implementation artifact using exact lowercase `ticket:` and `status:` lines.",
      ].join("\n"),
    ),
  ].join("\n\n");

  const message = buildTaskMessage(
    {
      autoExit: true,
      body: genericWorkerBody,
    },
    ticketTask,
    "fresh",
    "ticket-flow-delegated-handoff,ticket-implement",
    delegatedSkills,
  );

  assert.ok(
    message.indexOf('<skill name="ticket-flow-delegated-handoff">') < message.indexOf('<skill name="ticket-implement">'),
    "shared handoff skill should appear before the step-specific skill",
  );
  assert.ok(
    message.indexOf('<skill name="ticket-implement">') < message.indexOf('Implement the currently selected ticket only.'),
    "all resolved skill instructions should appear before the delegated task",
  );
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
