---
description: Internal deep ticket review pass — correctness and acceptance criteria
model: openai-codex/gpt-5.4-mini
subagent: reviewer
inheritContext: false
restore: true
---
Perform a deep candidate review of the currently selected ticket.

This is one parallel review pass. Do not write the canonical review artifact.

Required procedure:
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
8. If the ticket contains an ExecPlan Reference section, read the referenced ExecPlan file and use the milestone-specific guidance while reviewing.
9. Read the implementation artifact. If it is missing, stop and report that review cannot proceed because the implementation artifact is missing.
10. Read the validation artifact. If it is missing, stop and report that review cannot proceed because the validation artifact is missing.
11. If the validation artifact indicates `status: blocked`, stop and report that review cannot proceed because validation is blocked.
12. Inspect the current diff and relevant changed files.
13. Focus only on:
   - acceptance criteria satisfaction
   - correctness
   - logic bugs
   - concrete edge cases
14. Do not edit code.
15. Do not call `tk add-note`.
16. Do not call `tk close`.
17. Do not write the canonical review artifact.

Output exactly this structure:

```md
# Candidate Review Result

ticket: <ticket-id>
lens: correctness
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
