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
18. Review the candidate review outputs from the conversation and keep only findings you can support.
19. Eliminate duplicates and false positives.
20. Decide the final `gate: PASS | REVISE`.
21. Write exactly one canonical final review artifact to the exact `review_artifact` path using `write_artifact`.
22. Do not edit code.
23. Do not call `tk add-note`.
24. Do not call `tk close`.
25. End with a short summary naming the ticket id, gate, and artifact path.

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
