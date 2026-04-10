---
name: ticket-test-fix
description: Validate and fix the currently selected ticket using the worker agent. Reads simplified ticket-flow JSON state, validates the current checkout, and writes the validation artifact for the active ticket-flow attempt.
---

# Ticket Test Fix

You are validating and tightening the **currently selected ticket** in the ticket-flow workflow.

Your job is to validate exactly one already-implemented ticket in the **current checkout**, fix ticket-caused failures when appropriate, and write the validation artifact expected by the workflow.

Validate the repo **as it exists now**. Do **not** try to prove whether a failure is pre-existing by rewinding, stashing, or reconstructing the worktree.

## Session artifact rule

All `ticket-flow/*` paths in this workflow are **session artifact names**, not repository-relative files.

- Read them with `read_artifact(name: ...)`
- Write them with `write_artifact(name: ...)`
- Never use `read`, `write`, `edit`, or shell redirection on repo-root `ticket-flow/...`

If you stop early because a malformed/unarmed state or a missing required workflow artifact prevents validation from starting, end your final response with the exact line:

`<!-- CHAIN_STOP -->`

Do **not** emit `<!-- CHAIN_STOP -->` for normal workflow outcomes that finalization must handle, such as:
- implementation already marked `blocked`
- validation already recorded as `blocked`
- validation already recorded as `ready-for-review`

## State files

- `ticket-flow/invocation.json`
- `ticket-flow/current.json`

Per-run artifact paths are derived deterministically from `ticket` + `run_token` using the `ticket_flow_artifact_paths` tool.

## Validation policy

1. Validate the **current checkout only**.
2. Prefer **targeted validation first**.
3. Broaden to repo-wide commands only when repo norms or ticket risk justify it.
4. If a validation command itself is wrong, correct the command and continue.
5. If broader validation reveals unrelated or clearly pre-existing failures, record that truthfully instead of mutating git state.
6. Never use destructive worktree operations such as `git stash`, `git reset`, `git restore`, `git checkout --`, or `git clean`.
7. If the implementation artifact no longer matches the actual worktree, block honestly instead of re-implementing the ticket during validation.

## Required procedure

1. Read `ticket-flow/invocation.json` with `read_artifact`.
2. Parse it as JSON. Required keys:
   - `status`
   - `mode`
   - `ticket`
   - `run_token`
   - `reason`
3. If parsing fails, stop and report that validation is not armed for this invocation.
4. If `status` is not `armed`, stop and report that validation is not armed for this invocation.
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
   - `current.stage` is either `waiting-worker` or `waiting-validation`
9. If any of those checks fail, stop and report the mismatch.
10. Derive artifact paths from `invocation.ticket` + `invocation.run_token` using `ticket_flow_artifact_paths`.
11. If a validation artifact already exists at the derived validation path and indicates `status: ready-for-review` or `status: blocked`, report that validation is already recorded and stop normally so downstream review/finalization can continue.
12. Read the implementation artifact at the derived implementation path.
13. If it is missing, stop and report that validation cannot proceed because implementation has not completed.
14. Parse the implementation artifact and verify:
    - `ticket:` exactly matches the selected ticket
    - `status:` is present
15. If parsing fails, stop and report that the implementation artifact is malformed.
16. If the implementation artifact says `status: blocked`, report that validation is skipped because implementation is blocked, and stop normally so finalization can escalate.
17. If the implementation artifact does not say `status: ready-for-validation`, stop and report that implementation is not validation-ready.
18. Read the ticket file.
19. If the ticket contains an **ExecPlan Reference** section, read the referenced ExecPlan file and use the milestone-specific guidance while validating/fixing.
20. If `current.stage === "waiting-worker"`, overwrite `ticket-flow/current.json` to the same ticket / ticket_path but with:

```json
{
  "version": 2,
  "ticket": "<ticket-id>",
  "ticket_path": ".tickets/<ticket-id>.md",
  "stage": "waiting-validation",
  "reason": "validation started"
}
```

21. Run and fix using the repo's relevant validation commands.
   - Determine commands from the repo's actual guidance (`README.md`, `pyproject.toml`, `package.json`, `Makefile`, `justfile`, CI config, etc.).
   - Prefer targeted commands first.
   - Run broader lint / typecheck / test / build commands only when they are standard for the repo or necessary to establish reviewability.
   - If broader validation fails on an unrelated issue, do **not** mutate git state to investigate; record the blocker truthfully.
   - If the worktree no longer contains the implementation described by the implementation artifact, write a blocked validation artifact and stop.
   - Fix issues until the chosen validation scope is green or you are genuinely blocked.
22. Write exactly one validation artifact at the derived validation path.
23. If validation is green, write `status: ready-for-review` and overwrite `ticket-flow/current.json` with:

```json
{
  "version": 2,
  "ticket": "<ticket-id>",
  "ticket_path": ".tickets/<ticket-id>.md",
  "stage": "waiting-review",
  "reason": "validation complete"
}
```

24. If validation is genuinely blocked, write `status: blocked` and leave `ticket-flow/current.json` at `waiting-validation`.
25. Do not call `tk add-note`.
26. Do not call `tk close`.
27. End with a short summary naming the ticket id, final status, and validation artifact path.

## Artifact contract

Write exactly one validation artifact via `write_artifact` at:

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
- Validate the current checkout only
- Do not perform destructive or state-rewriting git operations
