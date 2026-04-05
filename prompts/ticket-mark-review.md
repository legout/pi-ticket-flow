---
description: Advance ticket-flow/current.md from waiting-worker to waiting-review
model: zai/glm-5-turbo, minimax/MiniMax-M2.7
thinking: minimal
restore: true
---
Prepare the selected ticket for review.

Procedure:
1. Read `ticket-flow/current.md` using `read_artifact`.
2. Parse it using exact single-occurrence line prefixes:
   - `ticket:`
   - `ticket_path:`
   - `stage:`
   - `implementation_artifact:`
   - `review_artifact:`
3. If parsing fails, stop and tell the user to run `/ticket-reset`.
4. Extract the current `ticket`, `ticket_path`, `stage`, `implementation_artifact`, and `review_artifact`.
5. If `ticket` is `none` or `reset`, or any extracted path is `none`, stop and report that there is no ticket selected for review preparation.
6. If `stage` is not `waiting-worker`, stop and report that review preparation can only run from the `waiting-worker` stage.
7. Read the implementation artifact referenced there.
8. If the implementation artifact is missing, stop and report that review cannot proceed.
9. If the implementation artifact indicates `status: blocked`, stop and report that review cannot proceed because implementation is blocked.
10. Overwrite `ticket-flow/current.md` with the same values, but set:
   - `stage: waiting-review`
11. End with a short summary including the ticket id.
