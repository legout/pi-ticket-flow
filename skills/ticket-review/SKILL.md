---
name: ticket-review
description: Review the currently selected ticket using the reviewer agent. Consumes delegated selection handoff from chain context, audits one ticket, and writes the review artifact.
---

# Ticket Review

You are reviewing the **currently selected ticket** in the ticket-flow workflow.

You do not implement fixes. You inspect the ticket, the implementation artifact, the validation artifact, the current diff, and write the durable review artifact expected by the workflow.

## Session artifact rule

All `ticket-flow/*` paths in this workflow are **session artifact names**, not repository-relative files.

- Read them with `read_artifact(name: ...)`
- Write them with `write_artifact(name: ...)`
- Never use `read`, `write`, `edit`, or shell redirection on repo-root `ticket-flow/...`

If you stop early because a malformed handoff or a missing required workflow artifact prevents review from starting, end your final response with the exact line:

`<!-- CHAIN_STOP -->`

Do **not** emit `<!-- CHAIN_STOP -->` for normal workflow outcomes that finalization must handle, such as:
- implementation already marked `blocked`
- validation already marked `blocked`
- review intentionally skipped because upstream blocked state already exists

The shared `ticket-flow-delegated-handoff` skill is loaded alongside this skill. Follow that handoff contract exactly.

## Artifact derivation

Per-run artifact paths are derived deterministically from `ticket` + `run_token` using the `ticket_flow_artifact_paths` tool.

## Required procedure

1. Read `ticket-flow/handoff.json` via `read_artifact` and extract `ticket`, `ticket_path`, `mode`, and `run_token`.
2. Derive artifact paths from `ticket` + `run_token` using `ticket_flow_artifact_paths`.
3. Read the selected ticket file from `ticket_path`.
4. If the ticket contains an **ExecPlan Reference** section, read the referenced ExecPlan file and use the milestone-specific guidance while reviewing.
5. Read the implementation artifact.
6. Parse and verify:
   - `ticket:` exactly matches the selected ticket
   - `status:` is present
7. If parsing fails, stop and report that the implementation artifact is malformed, then end with `<!-- CHAIN_STOP -->`.
8. If the implementation artifact says `status: blocked`, report that review is skipped because implementation is blocked, and stop normally so finalization can escalate.
9. Read the validation artifact.
10. Parse and verify:
    - `ticket:` exactly matches the selected ticket
    - `status:` is present
    - `source_artifact:` exactly matches the derived implementation artifact path
11. If parsing fails, stop and report that the validation artifact is malformed, then end with `<!-- CHAIN_STOP -->`.
12. If the validation artifact says `status: blocked`, report that review is skipped because validation is blocked, and stop normally so finalization can escalate.
13. If the validation artifact does not say `status: ready-for-review`, stop and report that validation is not complete yet, then end with `<!-- CHAIN_STOP -->`.
14. Inspect the current diff and relevant changed files.
15. Write exactly one review artifact at the derived review path.
16. The review artifact `ticket:` line must be exactly the selected ticket id.
17. Do not edit code.
18. Do not call `tk add-note`.
19. Do not call `tk close`.
20. Do **not** overwrite `ticket-flow/state.json` in this step.
21. End with a short summary naming the ticket id, status, and review artifact path.

## Artifact contract

Write exactly one artifact via `write_artifact` at:

`ticket-flow/<ticket-id>/review-<run-token>.md`

Use this format:

```md
# Review Result

ticket: <ticket-id>
step: review
status: pass | revise
source_artifact: <validation_artifact path>

## Summary

- <1-2 sentence verdict>

## Files Changed

- <files reviewed>

## Evidence

### Acceptance Criteria Check

- [x] <criterion met>
- [ ] <criterion not met>

### Findings

- none
```

If there are findings, replace the Findings subsection with entries in this exact format:

```md
### [HIGH] Short title

- File: `path/to/file.py:123`
- Observation: <concrete observation>
- Remediation: <specific fix>
```

Only include real, actionable findings.

## Status policy

- `pass` if acceptance criteria are met and there are no material issues
- `revise` if there are real issues that should block closure

## Rules

- Review one ticket only
- Do not edit code
- Do not spawn subagents
- Be critical but evidence-based
- If there are no real issues, return `status: pass`
- If this step fails unexpectedly, the orchestrator bridge may synthesize a `status: revise` review artifact.
- Do not read or mutate shared `ticket-flow/state.json` in this delegated step
