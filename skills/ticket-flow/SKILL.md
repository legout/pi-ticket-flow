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
1. pick or resume a ticket
2. gather context
3. implement
4. run `ty check` and `mypy` and fix all issues
5. run tests and fix issues until green
6. perform a critical audit review
7. close on PASS, retry on REVISE up to a limit, then escalate

## Hard Rules

1. **One ticket only.** Never start or review multiple tickets in one invocation.
2. **No parallel ticket execution.** Do not start a second ticket while one is active.
3. **Fresh subagents only.** Worker and reviewer must run with fresh context (`fork: false`).
4. **Main session is the orchestrator only.** It may read files, call `tk`, spawn subagents, read artifacts, and finalize ticket state. It should not implement product code itself.
5. **Use artifacts as the source of truth.** Do not rely on memory alone.
6. **Parse orchestrator state strictly.** `ticket-flow/current.md` must contain exactly one line for each required key: `ticket:`, `ticket_path:`, `stage:`, `implementation_artifact:`, `review_artifact:`. If malformed, stop and ask for `/ticket-reset`.
7. **Do not respawn duplicate subagents.** If a stage is already waiting on a worker/reviewer artifact and the artifact is still missing, stop and wait.
8. **Only close on PASS.** If review is REVISE, add notes and leave the ticket `in_progress`.
9. **Max failed reviews per ticket: 3.** On the 3rd failed review, add an escalation note instead of retrying again.
10. **Skip escalated tickets during selection.** Any ticket whose notes already contain `Gate: ESCALATE` is not eligible for automatic processing.
11. **Blocked implementation escalates immediately.** If the worker artifact says `status: blocked`, do not start review; add an escalation note and mark orchestrator state done.

## Durable Artifact Contract

Use these artifact paths:

- `ticket-flow/current.md` — orchestrator state for the current ticket
- `ticket-flow/<ticket-id>/implementation.md` — worker output
- `ticket-flow/<ticket-id>/review.md` — reviewer output

### `ticket-flow/current.md` format

Use this format exactly:

```md
ticket: <ticket-id>
ticket_path: .tickets/<ticket-id>.md
stage: waiting-worker | waiting-review | done
implementation_artifact: ticket-flow/<ticket-id>/implementation.md
review_artifact: ticket-flow/<ticket-id>/review.md
```

## Stage Machine

### Stage A — Resume existing orchestrator state

At the start of every invocation:

1. Try `read_artifact(name: "ticket-flow/current.md")`.
2. Parse the artifact strictly; if malformed, stop and tell the user to run `/ticket-reset`.
3. If it exists and `stage: waiting-worker`:
   - try to read `implementation_artifact`
   - if the implementation artifact is missing, **do not spawn another worker**; report that the workflow is waiting for the worker and stop
   - if the implementation artifact contains `status: blocked`, escalate immediately, mark `ticket-flow/current.md` as `done`, and stop
   - if the implementation artifact exists and is not blocked, advance to review stage
4. If it exists and `stage: waiting-review`:
   - try to read `review_artifact`
   - if the review artifact is missing, **do not spawn another reviewer**; report that the workflow is waiting for the reviewer and stop
   - if the review artifact exists, finalize the ticket
5. If it exists and `stage: done`, ignore it and continue to ticket selection
6. If it does not exist, continue to ticket selection

## Ticket Selection

When there is no unfinished orchestrator state:

1. Run `tk ready`
2. If empty, stop
3. Build the eligible candidate list in this order:
   - prefer listed tickets already marked `[in_progress]`
   - then consider other ready tickets
4. For each candidate, run `tk notes <ticket-id>` and skip it if the notes already contain `Gate: ESCALATE`
5. Pick the **first eligible** candidate
6. If no eligible candidate remains, stop and report that all ready tickets are escalated or ineligible
7. If the chosen ticket is not already `in_progress`, run:
   - `tk start <ticket-id>`
8. Write `ticket-flow/current.md` with `stage: waiting-worker`
9. Spawn the worker and stop

## Worker Spawn

Spawn a subagent using agent `ticket-worker`.

Requirements for the worker task:
- read `.tickets/<ticket-id>.md`
- read `tk notes <ticket-id>`
- gather all relevant code context before editing
- implement only this ticket
- run:
  - `ty check`
  - `mypy src/`
  - `pytest tests/ -x -v`
- fix issues until all pass
- if blocked, write `status: blocked` clearly in the implementation artifact
- write `ticket-flow/<ticket-id>/implementation.md`
- do not close the ticket
- do not add ticket notes

The orchestrator must set `fork: false` when spawning the worker.

## Review Spawn

When the worker artifact exists and is not blocked:

1. Update `ticket-flow/current.md` to `stage: waiting-review`
2. Spawn a subagent using agent `ticket-reviewer`
3. Stop

Requirements for the reviewer task:
- read `.tickets/<ticket-id>.md`
- read `ticket-flow/<ticket-id>/implementation.md`
- inspect the current diff
- critically audit correctness, acceptance criteria, quality, and edge cases
- write `ticket-flow/<ticket-id>/review.md`
- do not edit code
- do not close the ticket
- do not add ticket notes

The orchestrator must set `fork: false` when spawning the reviewer.

## Finalization

When the review artifact exists:

1. Read `ticket-flow/<ticket-id>/review.md`
2. Parse `gate: PASS` or `gate: REVISE`
3. Read the implementation artifact for summary/validation details
4. If the implementation artifact says `status: blocked`, add an escalation note and stop review finalization
5. Run `tk notes <ticket-id>` and count existing failed review cycles by counting prior notes containing `Gate: REVISE`
6. Add a ticket note with `tk add-note <ticket-id> ...`
7. If PASS, also run `tk close <ticket-id>`
8. If REVISE and this would be failed review **1 or 2**, add a revise note and leave the ticket `in_progress`
9. If REVISE and this would be failed review **3**, add an escalation note with `Gate: ESCALATE` and leave the ticket `in_progress`
10. Update `ticket-flow/current.md` to `stage: done`
11. Stop

### PASS note format

Use a compact structured note like:

```text
Implementation complete.
Gate: PASS

Summary:
- <implementation summary>

Validation:
- ty check: PASS
- mypy src/: PASS
- pytest tests/ -x -v: PASS

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
Review complete.
Gate: ESCALATE
Reason: maximum automatic review retries reached (3/3) OR implementation blocked before review

Findings:
- [SEVERITY] Title — file:line — remediation
- ...

Status:
- requires human intervention
- automatic ticket-flow processing should skip this ticket
```

## Reset behavior

A separate `/ticket-reset` prompt may overwrite `ticket-flow/current.md` with a tombstone `stage: done` record.
That reset must never close or reopen tickets automatically; it only clears stale orchestrator state.

## Important Behavior

- After spawning a worker or reviewer, **stop immediately**.
- If an awaited artifact is missing, **stop immediately** and do not duplicate work.
- Do not use prompt loops or convergence as the ticket queue manager.
- The real stop condition is ticket/artifact state, not whether the main session made edits.
