---
description: Internal deep ticket review pass — validation, tests, and maintainability
model: zai/glm-5-turbo
subagent: reviewer
inheritContext: false
restore: true
---
Perform a deep candidate review of the currently selected ticket.

This is one parallel review pass. Do not write the canonical review artifact.

Required procedure:
1. Read `ticket-flow/invocation.md` using `read_artifact`.
2. Parse it using exact single-occurrence line prefixes:
   - `status:`
   - `mode:`
   - `ticket:`
   - `run_token:`
   - `reason:`
3. If parsing fails, stop and report that this ticket-flow invocation is not armed for deep review.
4. If `status` is not `armed`, stop and report that deep review is not armed for this invocation.
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
14. If the ticket contains an ExecPlan Reference section, read the referenced ExecPlan file and use the milestone-specific guidance while reviewing.
15. Read the implementation artifact. If it is missing, stop and report that review cannot proceed because the implementation artifact is missing.
16. Read the validation artifact. If it is missing, stop and report that review cannot proceed because the validation artifact is missing.
17. If the validation artifact indicates `status: blocked`, stop and report that review cannot proceed because validation is blocked.
18. Inspect the current diff and relevant changed files.
19. Focus only on:
   - adequacy of validation and test coverage
   - credibility of implementation validation claims
   - maintainability and clarity issues likely to cause future bugs
   - suspicious unrelated changes
20. Do not edit code.
21. Do not call `tk add-note`.
22. Do not call `tk close`.
23. Do not write the canonical review artifact.

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

If there are findings, replace the Findings section with repeated sections:

```md
## Findings

### [HIGH] Short title

- File: `path/to/file.py:123`
- Evidence: <concrete observation>
- Remediation: <specific fix>
```

Only include real, actionable findings.
