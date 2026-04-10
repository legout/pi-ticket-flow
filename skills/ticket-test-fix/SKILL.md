---
name: ticket-test-fix
description: Validate and fix the currently selected ticket using the worker agent. Consumes delegated selection handoff from chain context, validates the current checkout, and writes the validation artifact for the active ticket-flow attempt.
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

If you stop early because a malformed handoff or a missing required workflow artifact prevents validation from starting, end your final response with the exact line:

`<!-- CHAIN_STOP -->`

Do **not** emit `<!-- CHAIN_STOP -->` for normal workflow outcomes that finalization must handle, such as:
- implementation already marked `blocked`
- validation already recorded as `blocked`
- validation already recorded as `ready-for-review`

The shared `ticket-flow-delegated-handoff` skill is loaded alongside this skill. Follow that handoff contract exactly.

## Artifact derivation

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

1. Parse the delegated handoff as required by the shared handoff skill.
2. Derive artifact paths from `ticket` + `run_token` using `ticket_flow_artifact_paths`.
3. If a validation artifact already exists at the derived validation path and indicates `status: ready-for-review` or `status: blocked`, report that validation is already recorded and stop normally so downstream review/finalization can continue.
4. Read the implementation artifact at the derived implementation path.
5. If it is missing, stop and report that validation cannot proceed because implementation has not completed, then end with `<!-- CHAIN_STOP -->`.
6. Parse the implementation artifact and verify:
   - `ticket:` exactly matches the selected ticket
   - `status:` is present
7. If parsing fails, stop and report that the implementation artifact is malformed, then end with `<!-- CHAIN_STOP -->`.
8. If the implementation artifact says `status: blocked`, report that validation is skipped because implementation is blocked, and stop normally so finalization can escalate.
9. If the implementation artifact does not say `status: ready-for-validation`, stop and report that implementation is not validation-ready, then end with `<!-- CHAIN_STOP -->`.
10. Read the ticket file from `ticket_path`.
11. If the ticket contains an **ExecPlan Reference** section, read the referenced ExecPlan file and use the milestone-specific guidance while validating/fixing.
12. Run and fix using the repo's relevant validation commands.
   - Determine commands from the repo's actual guidance (`README.md`, `pyproject.toml`, `package.json`, `Makefile`, `justfile`, CI config, etc.).
   - Prefer targeted commands first.
   - Run broader lint / typecheck / test / build commands only when they are standard for the repo or necessary to establish reviewability.
   - If broader validation fails on an unrelated issue, do **not** mutate git state to investigate; record the blocker truthfully.
   - If the worktree no longer contains the implementation described by the implementation artifact, write a blocked validation artifact and stop.
   - Fix issues until the chosen validation scope is green or you are genuinely blocked.
13. Write exactly one validation artifact at the derived validation path.
14. If validation is green, write `status: ready-for-review`.
15. If validation is genuinely blocked, write `status: blocked`.
16. Do **not** overwrite `ticket-flow/current.json` or `ticket-flow/invocation.json` in this step.
17. Do not call `tk add-note`.
18. Do not call `tk close`.
19. End with a short summary naming the ticket id, final status, and validation artifact path.

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
- Do not read or mutate shared `ticket-flow/current.json` / `ticket-flow/invocation.json` in this delegated step
