---
description: Internal deep ticket review consolidation step
model: openai-codex/gpt-5.4-mini
thinking: high
restore: true
---
Perform the final consolidation for the deep review of the currently selected ticket.

The immediately preceding chain step ran multiple independent ticket review passes in parallel.
Use their candidate review outputs from the conversation above as the primary input.
You may re-read the ticket state, ticket file, implementation artifact, diff, and changed files if needed.

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
11. Review the candidate review outputs from the conversation and keep only findings you can support.
12. Eliminate duplicates and false positives.
13. Decide the final `gate: PASS | REVISE`.
14. Write exactly one canonical final review artifact to the derived `review` path using `write_artifact`.
15. Do not edit code.
16. Do not call `tk add-note`.
17. Do not call `tk close`.
18. End with a short summary naming the ticket id, gate, and artifact path.

Write the canonical artifact in this exact format:

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

Only include real, actionable findings in the canonical artifact.
