---
name: ticket-review
description: Review the currently selected ticket using the reviewer agent. Parses ticket-flow state, validates stage, audits one ticket, and writes the review artifact.
---

# Ticket Review

You are reviewing the **currently selected ticket** in the ticket-flow workflow.

You do not implement fixes. You inspect the ticket, the implementation artifact, the validation artifact, the current diff, and write the durable review artifact expected by the workflow.

## Session artifact rule

All `ticket-flow/*` paths in this workflow are **session artifact names**, not repository-relative files.

- Read them with `read_artifact(name: ...)`
- Write them with `write_artifact(name: ...)`
- Never use `read`, `write`, `edit`, or shell redirection on repo-root `ticket-flow/...`

If you stop early because a guard, stage check, or artifact check fails, end your final response with the exact line:

`<!-- CHAIN_STOP -->`

## Required procedure

1. Read `ticket-flow/invocation.md` using `read_artifact`.
2. Parse it using exact single-occurrence line prefixes:
   - `status:`
   - `mode:`
   - `ticket:`
   - `run_token:`
   - `reason:`
3. If parsing fails, stop and report that this ticket-flow invocation is not armed for review.
4. If `status` is not `armed`, stop and report that review is not armed for this invocation.
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
11. If `ticket` is `none` or `reset`, or any extracted path is `none`, stop and report that there is no ticket selected for review.
12. If `stage` is not `waiting-review`, stop and report that review can only run from the `waiting-review` stage.
13. Read the ticket file.
14. If the ticket contains an **ExecPlan Reference** section, read the referenced ExecPlan file and use the milestone-specific guidance while reviewing.
15. Read the implementation artifact with `read_artifact(name: implementation_artifact)`. If it is missing, stop and report that review cannot proceed because the implementation artifact is missing.
16. Parse the implementation artifact using exact single-occurrence line prefixes:
    - `ticket:`
    - `status:`
17. If parsing fails, stop and report that the implementation artifact is malformed.
18. If the implementation artifact `ticket:` does not exactly equal the selected `ticket`, stop and report that implementation wrote an artifact for the wrong ticket.
19. Read the validation artifact with `read_artifact(name: validation_artifact)`. If it is missing, stop and report that review cannot proceed because the validation artifact is missing.
20. Parse the validation artifact using exact single-occurrence line prefixes:
    - `ticket:`
    - `status:`
    - `source_implementation_artifact:`
21. If parsing fails, stop and report that the validation artifact is malformed.
22. If the validation artifact `ticket:` does not exactly equal the selected `ticket`, stop and report that validation wrote an artifact for the wrong ticket.
23. If `source_implementation_artifact:` does not exactly equal the selected `implementation_artifact`, stop and report that validation references the wrong implementation artifact.
24. If the validation artifact indicates `status: blocked`, stop and report that review cannot proceed because validation is blocked.
25. Inspect the current diff and relevant changed files.
26. Write the review artifact with `write_artifact(name: review_artifact, content: ...)` using the exact artifact name from `ticket-flow/current.md`.
27. The review artifact `ticket:` line must be exactly `<ticket-id>`.
28. Do not edit code.
29. Do not call `tk add-note`.
30. Do not call `tk close`.
31. End with a short summary naming the ticket id, gate, and artifact path.

## Artifact contract

Write exactly one artifact via `write_artifact` at:

the exact `review_artifact` path from `ticket-flow/current.md`

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
