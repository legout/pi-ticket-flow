---
description: Internal deep ticket review pass — correctness and acceptance criteria
model: openai-codex/gpt-5.4
subagent: reviewer
inheritContext: false
restore: true
---
Perform a deep candidate review of the currently selected ticket.

This is one parallel review pass. Do not write the canonical review artifact.

Required procedure:
1. Read `ticket-flow/invocation.json` using `read_artifact`.
2. Parse it as JSON and require `status: armed`, plus `ticket` and `run_token`.
3. Read `ticket-flow/current.json` using `read_artifact`.
4. Parse it as JSON and require matching `ticket` and present `ticket_path`.
5. Derive artifact paths from `ticket` + `run_token` using `ticket_flow_artifact_paths`.
6. Read the ticket file.
7. If the ticket contains an ExecPlan Reference section, read the referenced ExecPlan file and use the milestone-specific guidance while reviewing.
8. Read the implementation artifact. If it is missing, stop and report that review cannot proceed because the implementation artifact is missing.
9. Read the validation artifact. If it is missing, stop and report that review cannot proceed because the validation artifact is missing.
10. If the validation artifact indicates `status: blocked`, stop and report that review cannot proceed because validation is blocked.
11. Inspect the current diff and relevant changed files.
12. Focus only on:
   - acceptance criteria satisfaction
   - correctness
   - logic bugs
   - concrete edge cases
13. Do not edit code.
14. Do not call `tk add-note`.
15. Do not call `tk close`.
16. Do not write the canonical review artifact.

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

If there are findings, replace the Findings section with repeated sections:

```md
## Findings

### [HIGH] Short title

- File: `path/to/file.py:123`
- Evidence: <concrete observation>
- Remediation: <specific fix>
```

Only include real, actionable findings.
