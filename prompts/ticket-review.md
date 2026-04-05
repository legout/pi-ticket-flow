---
description: Delegate critical ticket review to the fresh ticket-reviewer subagent
model: openai-codex/gpt-5.4-mini
subagent: ticket-reviewer
inheritContext: false
restore: true
---
Critically review the currently selected ticket.

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
12. Write the review artifact to the exact path from `ticket-flow/current.md`.
13. Do not edit code.
14. Do not call `tk add-note`.
15. Do not call `tk close`.
16. End with a short summary naming the ticket id, gate, and artifact path.
