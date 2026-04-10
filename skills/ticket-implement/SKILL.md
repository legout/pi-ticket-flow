---
name: ticket-implement
description: Implement the currently selected ticket using the worker agent. Consumes delegated selection handoff from chain context and writes the implementation artifact without running validation.
---

# Ticket Implement

You are implementing the **currently selected ticket** in the ticket-flow workflow.

Your job is to implement exactly one ticket, gather the right local context, and write the durable implementation artifact expected by the workflow.

You are **not** responsible for validation in this step. Validation and fix-to-green work happen in `ticket-test-fix`.

## Session artifact rule

All `ticket-flow/*` paths in this workflow are **session artifact names**, not repository-relative files.

- Read them with `read_artifact(name: ...)`
- Write them with `write_artifact(name: ...)`
- Never use `read`, `write`, `edit`, or shell redirection on repo-root `ticket-flow/...`

If you stop early because a guard, handoff, or ticket check fails, end your final response with the exact line:

`<!-- CHAIN_STOP -->`

The shared `ticket-flow-delegated-handoff` skill is loaded alongside this skill. Follow that handoff contract exactly.

## Artifact derivation

Per-run artifact paths are derived deterministically from `ticket` + `run_token` using the `ticket_flow_artifact_paths` tool.

## Required procedure

1. Parse the delegated handoff as required by the shared handoff skill.
2. Derive artifact paths from `ticket` + `run_token` using `ticket_flow_artifact_paths`.
3. Read the selected ticket file from `ticket_path`.
4. Run `tk show <ticket>` and inspect the ticket metadata / notes.
5. Run `ticket_flow_check_ticket` for the selected ticket.
6. Parse the helper JSON and stop if:
   - the ticket is an epic
   - the ticket still has open or in-progress children
   - the ticket has unmet dependencies
   - the ticket is already escalated
7. Gather the relevant repo context before editing.
8. If the ticket contains an **ExecPlan Reference** section, read the referenced ExecPlan file and follow the milestone-specific guidance.
9. Implement exactly this ticket.
10. Do **not** run the repo validation loop in this step.
11. Write exactly one implementation artifact at the derived `implementation` path.
12. Use `status: ready-for-validation` when the ticket implementation is complete.
13. Use `status: blocked` only when implementation is genuinely blocked.
14. Do **not** overwrite `ticket-flow/current.json` or `ticket-flow/invocation.json` in this step.
15. Do not call `tk add-note`.
16. Do not call `tk close`.
17. End with a short summary naming the ticket id and implementation artifact path.

## Artifact contract

Write exactly one artifact via `write_artifact` at:

`ticket-flow/<ticket-id>/implementation-<run-token>.md`

Use this format:

````md
# Implementation Result

ticket: <ticket-id>
status: ready-for-validation | blocked

## Summary

- <what was implemented>

## Files Changed

- <path>
- <path>

## Context Used

- <important file or module>
- <important file or module>

## Validation

- deferred to `ticket-test-fix`

## Validation Evidence

```text
deferred to `ticket-test-fix`
```

## Remaining Issues

- <known remaining issues, or `none`>
````

If blocked, replace `Remaining Issues` with clear blockers and the exact failing command/output.

## Rules

- Work on one ticket only
- Do not redesign the workflow
- Do not spawn subagents
- Keep changes focused on the selected ticket
- Leave all validation and fix-to-green work to `ticket-test-fix`
- Do not read shared `ticket-flow/current.json` / `ticket-flow/invocation.json` in this delegated step
