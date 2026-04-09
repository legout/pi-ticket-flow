---
name: ticket-implement
description: Implement the currently selected ticket using the worker agent. Parses ticket-flow state, validates stage, implements exactly one ticket, and writes the implementation artifact in ready-for-validation or blocked state without running the repo validation loop.
---

# Ticket Implement

You are implementing the **currently selected ticket** in the ticket-flow workflow.

Your job is to implement exactly one ticket, gather the right local context, and write the durable implementation artifact expected by the workflow.

You are **not** responsible for validation in this step. The full validation/fix-to-green loop is handled by the separate `ticket-test-fix` step.

## Session artifact rule

All `ticket-flow/*` paths in this workflow are **session artifact names**, not repository-relative files.

- Read them with `read_artifact(name: ...)`
- Write them with `write_artifact(name: ...)`
- Never use `read`, `write`, `edit`, or shell redirection on repo-root `ticket-flow/...`

If you stop early because a guard, stage check, artifact check, or leaf-ticket check fails, end your final response with the exact line:

`<!-- CHAIN_STOP -->`

## Required procedure

1. Read `ticket-flow/invocation.md` using `read_artifact`.
2. Parse it using exact single-occurrence line prefixes:
   - `status:`
   - `mode:`
   - `ticket:`
   - `run_token:`
   - `reason:`
3. If parsing fails, stop and report that this ticket-flow invocation is not armed for implementation.
4. If `status` is not `armed`, stop and report that implementation is not armed for this invocation.
5. Read `ticket-flow/current.md` using `read_artifact`.
6. Parse it using exact single-occurrence line prefixes:
   - `ticket:`
   - `ticket_path:`
   - `stage:`
   - `implementation_artifact:`
   - `validation_artifact:`
   - `review_artifact:`
   - optional tombstone line: `reason:`
7. If parsing fails, stop and tell the user to run `/ticket-reset`.
8. Extract:
   - `ticket`
   - `ticket_path`
   - `stage`
   - `implementation_artifact`
   - `validation_artifact`
   - `review_artifact`
9. If the invocation `ticket` does not match the selected `ticket`, stop and report that the invocation guard does not match the selected ticket.
10. If any of `implementation_artifact`, `validation_artifact`, or `review_artifact` does not contain the invocation `run_token`, stop and report that the invocation guard does not match the selected attempt.
11. If `ticket` is `none` or `reset`, or `ticket_path` is `none`, stop and report that no ticket is selected for implementation.
12. If `stage` is not `waiting-worker`, stop and report that implementation can only run from the `waiting-worker` stage.
13. Read the ticket file.
14. Inspect the ticket notes with `tk show <ticket>` and inspect the Notes section.
15. Run `tk show <ticket>` and inspect the metadata.
    - If it indicates `type: epic`, stop and report that automatic selection picked a non-leaf ticket.
    - If it lists any child ticket still marked `[open]` or `[in_progress]`, stop and report that automatic selection picked a parent ticket.
    - Do **not** implement a child ticket instead of the selected ticket.
16. Gather all relevant repo context before editing.
17. If the ticket contains an **ExecPlan Reference** section, read the referenced ExecPlan file and use the milestone-specific guidance while implementing.
18. Implement exactly this ticket.
19. Do **not** run the repo's validation commands in this step. Leave tests, lint, typecheck, build, and fix-to-green work entirely to `ticket-test-fix`.
20. Write the implementation artifact with `write_artifact(name: <implementation_artifact>, content: ...)` using the exact artifact name from `ticket-flow/current.md`.
21. If blocked, write `status: blocked` clearly in the artifact.
22. Otherwise write `status: ready-for-validation`.
23. The artifact `ticket:` line must be exactly `<ticket-id>` with no child aliases, parenthetical notes, or extra commentary.
24. Do **not** overwrite `ticket-flow/current.md`; the main-session orchestrator owns state transitions.
25. Do not call `tk add-note`.
26. Do not call `tk close`.
27. End with a short summary naming the ticket id and artifact path.

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

For the implementation step, prefer leaving validation explicitly deferred to `ticket-test-fix` rather than running validation commands here.

If blocked, replace `Remaining Issues` with clear blockers and the exact failing command/output.

Invalid artifact examples — do **not** use these:
- `**Ticket:** ...`
- `**Status:** Completed`
- any artifact that omits the exact lowercase `ticket:` and `status:` lines
- any delegated implementation step that writes `ticket-flow/current.md`

## Rules

- Work on one ticket only
- Do not redesign the workflow
- Do not spawn subagents
- Keep changes focused to the selected ticket
- Leave all validation and fix-to-green work to `ticket-test-fix`
