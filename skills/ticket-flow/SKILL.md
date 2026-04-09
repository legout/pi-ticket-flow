---
name: ticket-flow
description: Orchestrate exactly one tk ticket end-to-end with fresh worker and reviewer subagents, using artifacts for durable handoff state.
---

# Ticket Flow One-Ticket Orchestrator

This skill implements **exactly one ticket** per invocation.
It is designed for use with:
- `pi-prompt-template-model` for prompt frontmatter (`model`, `skill`, `restore`)
- `pi-interactive-subagents` for fresh worker/reviewer sessions and artifact handoff

## Goal

For one ticket only:
1. pick a ticket
2. gather context
3. implement
4. hand off to a separate validation/fix step
5. keep validation green before review
6. perform a critical audit review
7. close on PASS, retry on REVISE up to a limit, then escalate

## Important clarification

The shipped `/ticket-flow` and `/ticket-queue` commands are **linear prompt chains**.
They do not act as a generic resumable orchestrator entrypoint.
In particular:

- `ticket-pick` initializes new work only when `ticket-flow/current.md` is absent or already `done`
- the later internal prompts (`ticket-mark-validation`, `ticket-test-fix`, `ticket-mark-review`, `ticket-review`, `ticket-finalize`) advance the selected ticket through the chain
- if a run stops mid-flight, do not pretend `/ticket-pick` can safely resume it

## Hard Rules

1. **One ticket only.** Never start or review multiple tickets in one invocation.
2. **No parallel ticket execution.** Do not start a second ticket while one is active.
3. **Fresh subagents only.** Worker and reviewer must run with fresh context (`fork: false`).
4. **Main session is the orchestrator only.** It may read files, call `tk`, spawn subagents, read artifacts, and finalize ticket state. It should not implement product code itself or run the validation/fix loop itself.
5. **Use artifacts as the source of truth.** Do not rely on memory alone.
6. **Parse orchestrator state strictly.** `ticket-flow/current.md` must contain exactly one line for each required key: `ticket:`, `ticket_path:`, `stage:`, `implementation_artifact:`, `validation_artifact:`, `review_artifact:`. Tombstones may also include at most one optional `reason:` line. If malformed, stop and ask for `/ticket-reset`.
7. **Do not repeat duplicate work.** If a stage is already waiting on a worker/reviewer artifact and the artifact is still missing, stop and wait; keep the invocation guard blocked so any later linear-chain steps no-op.
8. **Only close on PASS.** If review is REVISE, add notes and leave the ticket `in_progress`.
9. **Max failed reviews per ticket: 3.** On the 3rd failed review, add an escalation note instead of retrying again.
10. **Skip escalated tickets during selection.** Any ticket whose notes already contain `Gate: ESCALATE` is not eligible for automatic processing.
11. **Blocked implementation escalates immediately.** If the worker artifact says `status: blocked`, do not advance to validation or review; let finalization escalate directly from the implementation artifact and mark orchestrator state done.

## Durable Artifact Contract

Use these artifact paths:

- `ticket-flow/invocation.md` — per-invocation guard written by `ticket-pick`; downstream chain steps must require `status: armed`
- `ticket-flow/current.md` — orchestrator state for the current ticket
- `ticket-flow/<ticket-id>/implementation-<run-token>.md` — implementation worker output for one ticket-flow attempt
- `ticket-flow/<ticket-id>/validation-<run-token>.md` — validation worker output for the same attempt
- `ticket-flow/<ticket-id>/review-<run-token>.md` — reviewer output for the same attempt
- `ticket-flow/progress.md` — queue progress and ticket history
- `ticket-flow/lessons-learned.md` — reusable lessons learned across tickets

### `ticket-flow/current.md` format

Use this format exactly for active runs. Tombstones may also append an optional `reason:` line.

```md
ticket: <ticket-id>
ticket_path: .tickets/<ticket-id>.md
stage: waiting-worker | waiting-validation | waiting-review | done
implementation_artifact: ticket-flow/<ticket-id>/implementation-<run-token>.md
validation_artifact: ticket-flow/<ticket-id>/validation-<run-token>.md
review_artifact: ticket-flow/<ticket-id>/review-<run-token>.md
```

### `ticket-flow/invocation.md` format

`ticket-pick` must overwrite this artifact at the start of every `/ticket-flow` or `/ticket-queue` invocation so downstream steps can tell whether the current linear chain is armed to proceed for the current ticket-flow attempt.

```md
status: armed | blocked
mode: single | queue
ticket: <ticket-id> | none
run_token: <run-token> | none
reason: <short explanation>
```

## Stage Machine

### Stage A — Interpreting existing orchestrator state

The shipped `/ticket-flow` and `/ticket-queue` entrypoints use `ticket-pick` as a gate, not as a resumable orchestrator brain.

At the start of every invocation:

1. `ticket-pick` must overwrite `ticket-flow/invocation.md` to `status: blocked` before reading any prior state.
2. Try `read_artifact(name: "ticket-flow/current.md")`.
3. Parse the artifact strictly.
   - If it is malformed, block `ticket-flow/invocation.md`, tell the user to run `/ticket-reset`, and stop.
   - During a queue run, also stop the current queue invocation so it does not spin on broken state.
4. If it exists and `stage` is not `done`, report that there is unfinished orchestrator state and stop.
   - Leave `ticket-flow/invocation.md` blocked so downstream linear-chain steps no-op instead of duplicating work.
   - During a queue run, stop the current queue invocation instead of looping repeatedly on the same stale state.
5. If it exists and `stage: done`, ignore it and continue to ticket selection.
6. If it does not exist, continue to ticket selection.

## Ticket Selection

When there is no unfinished orchestrator state:

1. Run `tk ready`
2. If empty, stop
3. Build the eligible candidate list in this order:
   - prefer listed tickets already marked `[in_progress]`
   - then consider other ready tickets
4. For each candidate, inspect its notes and skip it if they already contain `Gate: ESCALATE`
   - this repo's `tk` does not provide `tk notes`; use `tk show <ticket-id>` and inspect the Notes section
5. Pick the **first eligible** candidate
6. If no eligible candidate remains, stop and report that all ready tickets are escalated or ineligible
7. If the chosen ticket is not already `in_progress`, run:
   - `tk start <ticket-id>`
8. Write `ticket-flow/current.md` with `stage: waiting-worker`
9. Overwrite `ticket-flow/invocation.md` with `status: armed`, the selected `ticket`, and the matching `run_token`
10. Continue through the linear chain; every downstream step must require the armed invocation guard before doing work

## Worker Spawn

Spawn a fresh subagent using the base `worker` agent with the `ticket-implement` workflow contract.

Requirements for the worker task:
- read `.tickets/<ticket-id>.md`
- inspect the ticket notes with `tk show <ticket-id>` and read the Notes section
- gather all relevant code context before editing
- implement only this ticket
- do not run the repo validation loop in this step
- write the exact `implementation_artifact` path from `ticket-flow/current.md` with `status: ready-for-validation` or `blocked`
- do not close the ticket
- do not add ticket notes
- if the ticket contains an ExecPlan Reference section, read the referenced plan file and follow the milestone-specific guidance

The orchestrator must set `fork: false` when spawning the worker.

## Validation Spawn

When the implementation artifact exists:

1. If it is `ready-for-validation`, update `ticket-flow/current.md` to `stage: waiting-validation`, then continue to the validation worker.
2. If it is `blocked`, leave `ticket-flow/current.md` unchanged and let finalization handle escalation directly from the implementation artifact.

Requirements for the validation task:
- read `.tickets/<ticket-id>.md`
- read the exact `implementation_artifact` path from `ticket-flow/current.md`
- run the repo's relevant validation commands
- prefer documented test, typecheck, lint, and build commands from files like `package.json`, `Makefile`, `justfile`, CI config, or `README.md`
- include commands such as `ty check`, `mypy src/`, and `pytest tests/ -x -v` when the repo clearly uses them
- fix issues until all pass or are genuinely blocked
- write the exact `validation_artifact` path from `ticket-flow/current.md` with `status: ready-for-review` or `blocked`
- do not close the ticket
- do not add ticket notes
- if the ticket contains an ExecPlan Reference section, read the referenced plan file and follow the milestone-specific guidance

The orchestrator must set `fork: false` when spawning the validation worker.

## Review Spawn

When the validation artifact exists and is `ready-for-review`:

1. Update `ticket-flow/current.md` to `stage: waiting-review`
2. Spawn a fresh subagent using the base `reviewer` agent with the `ticket-review` workflow contract
3. Stop

Requirements for the reviewer task:
- read `.tickets/<ticket-id>.md`
- read the exact `implementation_artifact` path from `ticket-flow/current.md`
- read the exact `validation_artifact` path from `ticket-flow/current.md`
- inspect the current diff
- critically audit correctness, acceptance criteria, quality, and edge cases
- write the exact `review_artifact` path from `ticket-flow/current.md`
- do not edit code
- do not close the ticket
- do not add ticket notes
- if the ticket contains an ExecPlan Reference section, read the referenced plan file and follow the milestone-specific guidance

The orchestrator must set `fork: false` when spawning the reviewer.

## Finalization

Finalization must handle three distinct outcomes:

1. implementation blocked before validation,
2. validation blocked before review, or
3. review completed with `gate: PASS` or `gate: REVISE`

Procedure:

1. Read the implementation artifact for implementation details
2. If the implementation artifact says `status: blocked`, add an escalation note that includes the exact line `Gate: ESCALATE`, update `ticket-flow/current.md` to `stage: done`, disarm `ticket-flow/invocation.md`, and stop finalization without requiring a validation or review artifact
3. Otherwise read the validation artifact for validation details
4. If the validation artifact says `status: blocked`, add an escalation note that includes the exact line `Gate: ESCALATE`, update `ticket-flow/current.md` to `stage: done`, disarm `ticket-flow/invocation.md`, and stop finalization without requiring a review artifact
5. Otherwise read the exact `review_artifact` path from `ticket-flow/current.md`
6. Parse `gate: PASS` or `gate: REVISE`
7. Inspect existing ticket notes and count failed review cycles by counting prior notes containing `Gate: REVISE`
   - use `tk show <ticket-id>` and inspect the Notes section
8. Add a ticket note with `tk add-note <ticket-id> ...`
9. If PASS, also run `tk close <ticket-id>`
10. If REVISE and this would be failed review **1 or 2**, add a revise note and leave the ticket `in_progress`
11. If REVISE and this would be failed review **3**, add an escalation note with `Gate: ESCALATE` and leave the ticket `in_progress`
12. Update `ticket-flow/current.md` to `stage: done`
13. Disarm `ticket-flow/invocation.md`
14. Stop

### PASS note format

Use a compact structured note like:

```text
Implementation complete.
Gate: PASS

Summary:
- <implementation summary>

Validation:
- <command you ran>: PASS
- <repeat one bullet per validation command>

Review:
- acceptance criteria satisfied
```

### REVISE note format

Use a compact structured note like:

```text
Review complete.
Gate: REVISE
Review Attempt: <N>/3

Findings:
- [SEVERITY] Title — file:line — remediation
- ...

Status:
- ticket remains in_progress
```

### ESCALATE note format

Use a compact structured note like:

```text
Automatic escalation.
Gate: ESCALATE
Reason: maximum automatic review retries reached (3/3) OR implementation blocked before validation OR validation blocked before review

Findings:
- [SEVERITY] Title — file:line — remediation
- ...

Status:
- requires human intervention
- automatic ticket-flow processing should skip this ticket
```

## Reset behavior

A separate `/ticket-reset` prompt may overwrite `ticket-flow/current.md` with a tombstone `stage: done` record and also block `ticket-flow/invocation.md`.
That reset must never close or reopen tickets automatically; it only clears stale orchestrator state.

## Important Behavior

- `ticket-pick` must block stale invocations by default and arm only a freshly selected ticket.
- Downstream steps must refuse to proceed unless `ticket-flow/invocation.md` says `status: armed` for the same ticket-flow attempt.
- Finalization and reset should disarm the invocation guard when that ticket-flow attempt is over.
- If an awaited artifact is missing, **stop immediately** and do not duplicate work.
- Do not use prompt loops or convergence as the ticket queue manager.
- The real stop condition is ticket/artifact state, not whether the main session made edits.


## Ralph-style Queue Notes

When running a multi-ticket queue, follow these principles:

- one ticket per loop iteration
- keep queue progress externalized in `ticket-flow/progress.md`
- capture only durable, reusable learnings in `ticket-flow/lessons-learned.md`
- stop the queue when there are no eligible tickets left instead of relying on generic convergence
- prefer fresh loop iterations so each ticket starts from clean context with artifacts as the source of truth
