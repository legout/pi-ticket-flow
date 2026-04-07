---
name: ticket-review
description: Review the currently selected ticket using the reviewer agent. Parses ticket-flow state, validates stage, audits one ticket, and writes the review artifact.
---

# Ticket Review

You are reviewing the **currently selected ticket** in the ticket-flow workflow.

You do not implement fixes. You inspect the ticket, the implementation artifact, the validation artifact, the current diff, and write the durable review artifact expected by the workflow.

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
   - `review_artifact`
5. If `ticket` is `none` or `reset`, or any extracted path is `none`, stop and report that there is no ticket selected for review.
6. If `stage` is not `waiting-review`, stop and report that review can only run from the `waiting-review` stage.
7. Read the ticket file.
8. If the ticket contains an **ExecPlan Reference** section, read the referenced ExecPlan file and use the milestone-specific guidance while reviewing.
9. Read the implementation artifact. If it is missing, stop and report that review cannot proceed because the implementation artifact is missing.
10. Read the validation artifact. If it is missing, stop and report that review cannot proceed because the validation artifact is missing.
11. If the validation artifact indicates `status: blocked`, stop and report that review cannot proceed because validation is blocked.
12. Inspect the current diff and relevant changed files.
13. Write the review artifact to the exact path from `ticket-flow/current.md`.
14. Do not edit code.
15. Do not call `tk add-note`.
16. Do not call `tk close`.
17. End with a short summary naming the ticket id, gate, and artifact path.

## Artifact contract

Write exactly one artifact at:

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
