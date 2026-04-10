---
name: ticket-implement
description: Implement the currently selected ticket using the worker agent. Reads simplified ticket-flow JSON state, implements exactly one ticket, and writes the implementation artifact without running validation.
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

If you stop early because a guard, state, or ticket check fails, end your final response with the exact line:

`<!-- CHAIN_STOP -->`

## State files

- `ticket-flow/invocation.json`
- `ticket-flow/current.json`

Per-run artifact paths are derived deterministically from `ticket` + `run_token` using the `ticket_flow_artifact_paths` tool.

## Required procedure

1. Read `ticket-flow/invocation.json` with `read_artifact`.
2. Parse it as JSON. Required keys:
   - `status`
   - `mode`
   - `ticket`
   - `run_token`
   - `reason`
3. If parsing fails, stop and report that this ticket-flow invocation is not armed for implementation.
4. If `status` is not `armed`, stop and report that implementation is not armed for this invocation.
5. Read `ticket-flow/current.json` with `read_artifact`.
6. Parse it as JSON. Required keys:
   - `ticket`
   - `ticket_path`
   - `stage`
   - optional `reason`
7. If parsing fails, stop and tell the user to run `/ticket-reset`.
8. Ensure:
   - `current.ticket === invocation.ticket`
   - `current.ticket_path` is present
   - `current.stage === "waiting-worker"`
9. If any of those checks fail, stop and report the mismatch.
10. Derive artifact paths from `invocation.ticket` + `invocation.run_token` using `ticket_flow_artifact_paths`.
11. Read the selected ticket file.
12. Run `tk show <ticket>` and inspect the ticket metadata / notes.
13. Run `ticket_flow_check_ticket` for the selected ticket.
14. Parse the helper JSON and stop if:
    - the ticket is an epic
    - the ticket still has open or in-progress children
    - the ticket has unmet dependencies
    - the ticket is already escalated
15. Gather the relevant repo context before editing.
16. If the ticket contains an **ExecPlan Reference** section, read the referenced ExecPlan file and follow the milestone-specific guidance.
17. Implement exactly this ticket.
18. Do **not** run the repo validation loop in this step.
19. Write exactly one implementation artifact at the derived `implementation` path.
20. Use `status: ready-for-validation` when the ticket implementation is complete.
21. Use `status: blocked` only when implementation is genuinely blocked.
22. Do **not** overwrite `ticket-flow/current.json` in this step.
23. Do not call `tk add-note`.
24. Do not call `tk close`.
25. End with a short summary naming the ticket id and implementation artifact path.

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
