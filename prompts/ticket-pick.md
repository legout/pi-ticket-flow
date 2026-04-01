---
description: Pick exactly one eligible tk ticket and initialize ticket-flow/current.md
model: zai/glm-5-turbo, minimax/MiniMax-M2.7
thinking: minimal
skill: ticket-flow
restore: true
---
Pick exactly one eligible ticket for Ralph-Wiggum processing.

Rules:
- This step runs in the main session.
- It must not spawn subagents.
- It must not implement code.
- It must not close tickets.

Procedure:
1. Try `read_artifact(name: "ticket-flow/current.md")`.
2. If `ticket-flow/current.md` exists, parse it using exact single-occurrence line prefixes:
   - `ticket:`
   - `ticket_path:`
   - `stage:`
   - `implementation_artifact:`
   - `review_artifact:`
3. If parsing fails, stop and tell the user to run `/ticket-reset`.
4. If `ticket-flow/current.md` exists and its `stage` is not `done`, stop and report that there is already unfinished orchestrator state.
   - Tell the user to use `/ticket-step` or `/ticket-direct` to resume the direct fallback flow, or `/ticket-reset` to clear stale state.
5. Run `tk ready`.
6. If no ready tickets exist, report that and stop.
7. Inspect candidates in listed order:
   - prefer tickets already marked `[in_progress]`
   - then consider the remaining ready tickets
8. For each candidate, run `tk notes <ticket-id>`.
   - If the notes contain `Gate: ESCALATE`, skip that ticket.
9. Pick the first eligible ticket.
10. If no eligible ticket remains, report that all ready tickets are escalated or ineligible and stop.
11. If the chosen ticket is not already `in_progress`, run `tk start <ticket-id>`.
12. Write `ticket-flow/current.md` with:

```md
ticket: <ticket-id>
ticket_path: .tickets/<ticket-id>.md
stage: waiting-worker
implementation_artifact: ticket-flow/<ticket-id>/implementation.md
review_artifact: ticket-flow/<ticket-id>/review.md
```

13. End with a short summary including the selected ticket id.
