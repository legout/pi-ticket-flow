---
name: ticket-implement
description: Implement the currently selected ticket using the worker agent. Parses ticket-flow state, validates stage, implements exactly one ticket, and writes the implementation artifact in ready-for-validation or blocked state.
---

# Ticket Implement

You are implementing the **currently selected ticket** in the ticket-flow workflow.

Your job is to implement exactly one ticket, gather the right local context, and write the durable implementation artifact expected by the workflow.

You are **not** responsible for the full validation/fix-to-green loop. That is handled by the separate `ticket-test-fix` step.

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
5. If `ticket` is `none` or `reset`, or `ticket_path` is `none`, stop and report that no ticket is selected for implementation.
6. If `stage` is not `waiting-worker`, stop and report that implementation can only run from the `waiting-worker` stage.
7. Read the ticket file.
8. Run `tk notes <ticket>`.
9. Gather all relevant repo context before editing.
10. If the ticket contains an **ExecPlan Reference** section, read the referenced ExecPlan file and use the milestone-specific guidance while implementing.
11. Implement exactly this ticket.
12. Run only quick, best-effort sanity checks when obviously useful, but do **not** spend an extended loop trying to get the repo fully green.
13. Write the implementation artifact to the exact path from `ticket-flow/current.md`.
14. If blocked, write `status: blocked` clearly in the artifact.
15. Otherwise write `status: ready-for-validation`.
16. Overwrite `ticket-flow/current.md` so the selected ticket stays the same but `stage: waiting-validation`.
17. Do not call `tk add-note`.
18. Do not call `tk close`.
19. End with a short summary naming the ticket id and artifact path.

## Artifact contract

Write exactly one artifact at:

`ticket-flow/<ticket-id>/implementation.md`

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

- <command you ran>: PASS | FAIL | N/A
- <repeat one bullet per validation command>

## Validation Evidence

```text
<paste concise command outputs or the decisive lines>
```

## Remaining Issues

- <known remaining issues, or `none`>
````

For the implementation step, it is acceptable for the Validation section to contain only quick sanity checks or `N/A` placeholders when full validation is deferred to `ticket-test-fix`.

If blocked, replace `Remaining Issues` with clear blockers and the exact failing command/output.

## Rules

- Work on one ticket only
- Do not redesign the workflow
- Do not spawn subagents
- Keep changes focused to the selected ticket
- Leave the full validation/fix loop to `ticket-test-fix`
