---
name: ticket-review
description: Review the currently selected ticket using the reviewer agent. Reads simplified ticket-flow JSON state, audits one ticket, and writes the review artifact.
---

# Ticket Review

You are reviewing the **currently selected ticket** in the ticket-flow workflow.

You do not implement fixes. You inspect the ticket, the implementation artifact, the validation artifact, the current diff, and write the durable review artifact expected by the workflow.

## Session artifact rule

All `ticket-flow/*` paths in this workflow are **session artifact names**, not repository-relative files.

- Read them with `read_artifact(name: ...)`
- Write them with `write_artifact(name: ...)`
- Never use `read`, `write`, `edit`, or shell redirection on repo-root `ticket-flow/...`

If you stop early because a malformed/unarmed state or a missing required workflow artifact prevents review from starting, end your final response with the exact line:

`<!-- CHAIN_STOP -->`

Do **not** emit `<!-- CHAIN_STOP -->` for normal workflow outcomes that finalization must handle, such as:
- implementation already marked `blocked`
- validation already marked `blocked`
- review intentionally skipped because upstream blocked state already exists

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
3. If parsing fails, stop and report that review is not armed for this invocation.
4. If `status` is not `armed`, stop and report that review is not armed for this invocation.
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
9. If either of those checks fails, stop and report the mismatch.
10. Derive artifact paths from `invocation.ticket` + `invocation.run_token` using `ticket_flow_artifact_paths`.
11. Read the selected ticket file.
12. If the ticket contains an **ExecPlan Reference** section, read the referenced ExecPlan file and use the milestone-specific guidance while reviewing.
13. Read the implementation artifact.
14. Parse and verify:
    - `ticket:` exactly matches the selected ticket
    - `status:` is present
15. If parsing fails, stop and report that the implementation artifact is malformed.
16. If the implementation artifact says `status: blocked`, report that review is skipped because implementation is blocked, and stop normally so finalization can escalate.
17. Read the validation artifact.
18. Parse and verify:
    - `ticket:` exactly matches the selected ticket
    - `status:` is present
    - `source_implementation_artifact:` exactly matches the derived implementation artifact path
19. If parsing fails, stop and report that the validation artifact is malformed.
20. If the validation artifact says `status: blocked`, report that review is skipped because validation is blocked, and stop normally so finalization can escalate.
21. If the validation artifact does not say `status: ready-for-review`, stop and report that validation is not complete yet.
22. If `current.stage` is not `waiting-review`, overwrite `ticket-flow/current.json` with the same ticket / ticket_path but `stage: "waiting-review"` and a short reason such as `"review started"`.
23. Inspect the current diff and relevant changed files.
24. Write exactly one review artifact at the derived review path.
25. The review artifact `ticket:` line must be exactly the selected ticket id.
26. Do not edit code.
27. Do not call `tk add-note`.
28. Do not call `tk close`.
29. End with a short summary naming the ticket id, gate, and review artifact path.

## Artifact contract

Write exactly one artifact via `write_artifact` at:

`ticket-flow/<ticket-id>/review-<run-token>.md`

Use this format:

```md
# Review Result

ticket: <ticket-id>
gate: PASS | REVISE

## Summary

- <1-2 sentence verdict>

## Acceptance Criteria Check

- [x] <criterion met>
- [ ] <criterion not met>

## Findings

- none
```

If there are findings, replace the Findings section with entries in this exact format:

```md
## Findings

### [HIGH] Short title

- File: `path/to/file.py:123`
- Evidence: <concrete observation>
- Remediation: <specific fix>
```

Only include real, actionable findings.

## Gate policy

- `PASS` if acceptance criteria are met and there are no material issues
- `REVISE` if there are real issues that should block closure

## Rules

- Review one ticket only
- Do not edit code
- Do not spawn subagents
- Be critical but evidence-based
- If there are no real issues, return `gate: PASS`
