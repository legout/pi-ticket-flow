---
name: ticket-flow
description: Orchestrate exactly one tk ticket end-to-end with fresh worker and reviewer subagents, using JSON state artifacts for durable handoff.
---

# Ticket Flow One-Ticket Orchestrator

This skill implements **exactly one ticket** per invocation.

It is designed for use with:
- `pi-prompt-template-model` for prompt frontmatter (`model`, `skill`, `restore`)
- `pi-interactive-subagents` for fresh worker/reviewer sessions and artifact handoff

## Goal

For one ticket only:
1. pick a ticket
2. implement it
3. validate/fix it in the current checkout
4. review it critically
5. finalize to PASS / REVISE / ESCALATE / BLOCKED

## Simplified workflow model

The shipped `/ticket-flow` and `/ticket-queue` commands are **linear prompt chains with explicit early-stop control**.

Current simplified chain:

- `ticket-pick`
- `ticket-implement`
- `ticket-test-fix`
- `ticket-review`
- `ticket-finalize`

`ticket-mark-validation` and `ticket-mark-review` are deprecated compatibility shims. Stage advancement now happens inside validation.

## Hard rules

1. **One ticket only.** Never start or review multiple tickets in one invocation.
2. **No parallel ticket execution.** Do not start a second ticket while one is active.
3. **Fresh subagents only.** Worker and reviewer must run with fresh context (`fork: false`).
4. **Use artifacts as the source of truth.** Do not rely on conversational memory alone.
5. **Use structured machine state.** The operational state files are JSON, not freeform markdown.
6. **Validate the current checkout only.** Do not use git rewinds/stash tricks to classify failures.
7. **Skip escalated tickets automatically.** Any ticket whose notes contain `Gate: ESCALATE` is not eligible.
8. **Select leaf tickets only.** Automatic selection must skip epics and parents with open/in-progress children.
9. **Respect dependencies.** Automatic selection must skip tickets whose listed dependencies are not closed.
10. **Only close on PASS.** If review is REVISE, leave the ticket `in_progress`.
11. **Max failed reviews per ticket: 3.** On the 3rd failed review, escalate instead of retrying again.
12. **Blocked implementation or validation escalates immediately in finalization.**

## Durable artifact contract

### Machine state (JSON session artifacts)

- `ticket-flow/invocation.json` — per-invocation guard
- `ticket-flow/current.json` — current orchestrator state

### Evidence artifacts (markdown session artifacts)

- `ticket-flow/<ticket-id>/implementation-<run-token>.md`
- `ticket-flow/<ticket-id>/validation-<run-token>.md`
- `ticket-flow/<ticket-id>/review-<run-token>.md`
- `ticket-flow/progress.md`
- `ticket-flow/lessons-learned.md`

These are **session artifact names**, not repository-relative files.

- Read them with `read_artifact(name: ...)`
- Write them with `write_artifact(name: ...)`
- Never use repo-root `ticket-flow/...` files as workflow state

### `ticket-flow/invocation.json`

Use this shape:

```json
{
  "version": 2,
  "status": "armed or blocked",
  "mode": "single or queue",
  "ticket": "flo-1234 or null",
  "run_token": "20260410T165200Z or null",
  "reason": "short explanation"
}
```

### `ticket-flow/current.json`

Use this shape:

```json
{
  "version": 2,
  "ticket": "flo-1234 or null",
  "ticket_path": ".tickets/flo-1234.md or null",
  "stage": "waiting-worker | waiting-validation | waiting-review | done",
  "reason": "short explanation"
}
```

### Deterministic helper

Use the deterministic helper tools exposed by this package:

- `ticket_flow_select`
- `ticket_flow_check_ticket`
- `ticket_flow_new_run_token`
- `ticket_flow_artifact_paths`

Use it for:
- candidate selection
- dependency / leaf / escalation checks
- artifact path derivation
- run-token generation

## Stage model

- `waiting-worker` — ticket selected; implementation artifact expected next
- `waiting-validation` — implementation exists; validation in progress or next
- `waiting-review` — validation is green; review artifact expected next
- `done` — invocation complete / tombstone state

## Selection model

Automatic selection should:
- start from `tk ready`
- prefer tickets already marked `in_progress`
- skip:
  - escalated tickets
  - epics
  - parents with open / in-progress children
  - tickets with unmet dependencies
- pick the first eligible leaf ticket

## Validation model

Validation should:
- run in the current checkout
- prefer targeted commands first
- broaden only when repo norms or ticket risk justify it
- fix ticket-caused failures when appropriate
- write a truthful blocked artifact for unrelated red repo state, missing implementation state, or genuine blockers
- never perform destructive git/worktree operations to classify failures

## Finalization model

Finalization handles four outcomes:
- PASS
- REVISE
- ESCALATE
- BLOCKED

Behavior:
- implementation blocked -> escalate immediately
- validation blocked -> escalate immediately
- review PASS -> add PASS note and close ticket
- review REVISE attempt 1 or 2 -> add REVISE note and leave in progress
- review REVISE attempt 3 -> escalate
- always finish by setting `current.json` to `done` and blocking `invocation.json`

## Queue notes

Keep:
- `ticket-flow/progress.md`
- `ticket-flow/lessons-learned.md`

Queue progress is useful operational telemetry, but it is **not** the source of truth for stage transitions. JSON state files are.

Suggested progress fields:
- `current_ticket`
- `current_run_token`
- counts for PASS / REVISE / ESCALATE / BLOCKED
- history bullets with concise outcome summaries
