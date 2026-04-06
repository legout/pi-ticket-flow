---
name: ticket-test-fix
description: Validate and fix the currently selected ticket using the worker agent. Reads the implementation artifact, runs the relevant repo validation commands, fixes issues until green or blocked, and updates the same implementation artifact to ready-for-review.
---

# Ticket Test Fix

You are validating and tightening the **currently selected ticket** in the ticket-flow workflow.

Your job is to take the already-implemented ticket, run the repo's relevant validation commands, fix resulting issues, and update the implementation artifact to `ready-for-review` when validation is green.

## Required procedure

1. Read `ticket-flow/current.md` using `read_artifact`.
2. Parse it using exact single-occurrence line prefixes:
   - `ticket:`
   - `ticket_path:`
   - `stage:`
   - `implementation_artifact:`
   - `review_artifact:`
3. If parsing fails, stop and tell the user to run `/ticket-reset`.
4. Extract:
   - `ticket`
   - `ticket_path`
   - `stage`
   - `implementation_artifact`
5. If `ticket` is `none` or `reset`, or `ticket_path` is `none`, stop and report that no ticket is selected for validation.
6. If `stage` is not `waiting-validation`, stop and report that validation can only run from the `waiting-validation` stage.
7. Read the ticket file.
8. If the ticket contains an **ExecPlan Reference** section, read the referenced ExecPlan file and use the milestone-specific guidance while validating/fixing.
9. Read the implementation artifact. If it is missing, stop and report that validation cannot proceed because implementation has not completed.
10. If the implementation artifact indicates `status: blocked`, stop and report that validation cannot proceed because implementation is blocked.
11. If the implementation artifact already indicates `status: ready-for-review`, report that validation is already complete and stop.
12. Run and fix until green using the repo's relevant validation commands.
   - Prefer the project's documented test, typecheck, lint, and build commands from files like `package.json`, `Makefile`, `justfile`, CI config, or `README.md`.
   - If the repo clearly uses commands such as `ty check`, `mypy src/`, or `pytest tests/ -x -v`, include them.
   - Fix issues until all relevant commands pass or you are genuinely blocked.
13. Update the same implementation artifact in place:
   - set `status: ready-for-review` if validation is green
   - set `status: blocked` if validation is genuinely blocked
   - preserve and refresh the Summary / Files Changed / Context Used sections if already present
   - replace the Validation / Validation Evidence / Remaining Issues sections with the current truth
14. Leave `ticket-flow/current.md` at `stage: waiting-validation` when validation is green; `ticket-mark-review` will advance it to review stage.
15. Do not call `tk add-note`.
16. Do not call `tk close`.
17. End with a short summary naming the ticket id, final status, and artifact path.

## Rules

- Work on one ticket only
- Do not redesign the workflow
- Do not spawn subagents
- Keep fixes focused on making this ticket green and reviewable
- Do not broaden scope beyond what is needed to validate the selected ticket
- Always leave the implementation artifact reflecting the current truth
