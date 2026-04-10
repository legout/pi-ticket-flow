---
description: Internal deep ticket review pass — validation, tests, and maintainability
model: zai/glm-5-turbo
subagent: reviewer
inheritContext: false
skill: ticket-flow-delegated-handoff
restore: true
---
Perform a deep candidate review of the currently selected ticket.

This is one parallel review pass. Do not write the canonical review artifact.

- Follow the shared delegated handoff skill loaded for this step.

Required procedure:
1. Parse the delegated handoff as required by the shared handoff skill.
2. Derive artifact paths from `ticket` + `run_token` using `ticket_flow_artifact_paths`.
3. Read the ticket file at `ticket_path`.
4. If the ticket contains an ExecPlan Reference section, read the referenced ExecPlan file and use the milestone-specific guidance while reviewing.
5. Read the implementation artifact. If it is missing, stop and report that review cannot proceed because the implementation artifact is missing.
6. Read the validation artifact. If it is missing, stop and report that review cannot proceed because the validation artifact is missing.
7. If the validation artifact indicates `status: blocked`, stop and report that review cannot proceed because validation is blocked.
8. Inspect the current diff and relevant changed files.
9. Focus only on:
   - adequacy of validation and test coverage
   - credibility of implementation validation claims
   - maintainability and clarity issues likely to cause future bugs
   - suspicious unrelated changes
10. Do not edit code.
11. Do not call `tk add-note`.
12. Do not call `tk close`.
13. Do not write the canonical review artifact.

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
