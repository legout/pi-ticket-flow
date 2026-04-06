---
description: Internal deep ticket review pass — validation, tests, and maintainability
model: zai/glm-5.1
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
   - `review_artifact:`
3. If parsing fails, stop and tell the user to run `/ticket-reset`.
4. Extract:
   - `ticket`
   - `ticket_path`
   - `stage`
   - `implementation_artifact`
   - `review_artifact`
5. If `ticket` is `none` or `reset`, or any extracted path is `none`, stop and report that there is no ticket selected for review.
6. If `stage` is not `waiting-review`, stop and report that review can only run from the `waiting-review` stage.
7. Read the ticket file.
8. If the ticket contains an ExecPlan Reference section, read the referenced ExecPlan file and use the milestone-specific guidance while reviewing.
9. Read the implementation artifact. If it is missing, stop and report that review cannot proceed because the implementation artifact is missing.
10. If the implementation artifact indicates `status: blocked`, stop and report that review cannot proceed because implementation is blocked.
11. Inspect the current diff and relevant changed files.
12. Focus only on:
   - adequacy of validation and test coverage
   - credibility of implementation validation claims
   - maintainability and clarity issues likely to cause future bugs
   - suspicious unrelated changes
13. Do not edit code.
14. Do not call `tk add-note`.
15. Do not call `tk close`.
16. Do not write the canonical review artifact.

Output exactly this structure:

```md
# Candidate Review Result

ticket: <ticket-id>
lens: validation-and-maintainability
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
