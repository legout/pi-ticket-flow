---
name: ticket-test-fix
description: Validate and fix the currently selected ticket using the worker agent. Reads the implementation artifact, runs the relevant validation commands, fixes issues until green or blocked, and writes a separate validation artifact for this ticket-flow attempt.
---

# Ticket Test Fix

You are validating and tightening the **currently selected ticket** in the ticket-flow workflow.

Your job is to take the already-implemented ticket, run the repo's relevant validation commands, fix resulting issues, and write the validation artifact to `ready-for-review` when validation is green.

## Required procedure

1. Read `ticket-flow/current.md` using `read_artifact`.
2. Parse it using exact single-occurrence line prefixes:
   - `ticket:`
   - `ticket_path:`
   - `stage:`
   - `implementation_artifact:`
   - `validation_artifact:`
   - `review_artifact:`
3. If parsing fails, stop and tell the user to run `/ticket-reset`.
4. Extract:
   - `ticket`
   - `ticket_path`
   - `stage`
   - `implementation_artifact`
   - `validation_artifact`
5. If `ticket` is `none` or `reset`, or `ticket_path` is `none`, stop and report that no ticket is selected for validation.
6. If `stage` is not `waiting-validation`, stop and report that validation can only run from the `waiting-validation` stage.
7. Read the ticket file.
8. If the ticket contains an **ExecPlan Reference** section, read the referenced ExecPlan file and use the milestone-specific guidance while validating/fixing.
9. Read the implementation artifact. If it is missing, stop and report that validation cannot proceed because implementation has not completed.
10. If the implementation artifact indicates `status: blocked`, stop and report that validation cannot proceed because implementation is blocked.
11. If a validation artifact already exists at `validation_artifact` and indicates `status: ready-for-review`, report that validation is already complete and stop.
12. Run and fix until green using the repo's relevant validation commands.
   - Prefer the project's documented test, typecheck, lint, and build commands from files like `package.json`, `Makefile`, `justfile`, CI config, or `README.md`.
   - If the repo clearly uses commands such as `uv run`, `ty check`, `mypy src/`, or `pytest tests/ -x -v`, include the appropriate invocation form for this repo.
   - Fix issues until all relevant commands pass or you are genuinely blocked.
13. Write the validation artifact to the exact `validation_artifact` path from `ticket-flow/current.md`:
   - set `status: ready-for-review` if validation is green
   - set `status: blocked` if validation is genuinely blocked
   - preserve and refresh the Summary / Files Changed / Context Used sections from the implementation artifact when helpful
   - write the Validation / Validation Evidence / Remaining Issues sections with the current truth
14. Do **not** overwrite `ticket-flow/current.md`; the main-session orchestrator and `ticket-mark-review` own stage transitions.
15. Do not call `tk add-note`.
16. Do not call `tk close`.
17. End with a short summary naming the ticket id, final status, and validation artifact path.

## Artifact contract

Write exactly one artifact at:

`ticket-flow/<ticket-id>/validation-<run-token>.md`

Use this format:

````md
# Validation Result

ticket: <ticket-id>
status: ready-for-review | blocked
source_implementation_artifact: <implementation_artifact path>

## Summary

- <what is now implemented and/or fixed during validation>

## Files Changed

- <path>
- <path>

## Context Used

- <important file or module>
- <important file or module>

## Validation

- <command you ran>: PASS | FAIL
- <repeat one bullet per validation command>

## Validation Evidence

```text
<paste concise command outputs or the decisive lines>
```

## Remaining Issues

- <known remaining issues, or `none`>
````

If blocked, replace `Remaining Issues` with clear blockers and the exact failing command/output.

## Rules

- Work on one ticket only
- Do not redesign the workflow
- Do not spawn subagents
- Keep fixes focused on making this ticket green and reviewable
- Do not broaden scope beyond what is needed to validate the selected ticket
- Always leave the validation artifact reflecting the current truth for this validation attempt
