---
description: Advance ticket-flow/current.md from waiting-worker to waiting-validation after implementation is ready for validation
model: zai/glm-5-turbo, minimax/MiniMax-M2.7
thinking: minimal
restore: true
---
Prepare the selected ticket for validation.

If any prerequisite check fails and validation preparation cannot advance the workflow, end your response with the exact final line:

`<!-- CHAIN_STOP -->`

Procedure:
1. Read `ticket-flow/invocation.md` using `read_artifact`.
2. Parse it using exact single-occurrence line prefixes:
   - `status:`
   - `mode:`
   - `ticket:`
   - `run_token:`
   - `reason:`
3. If parsing fails, stop and report that this ticket-flow invocation is not armed for downstream steps.
4. If `status` is not `armed`, stop and report that validation preparation is not armed for this invocation.
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
8. Extract the current `ticket`, `ticket_path`, `stage`, `implementation_artifact`, `validation_artifact`, and `review_artifact`.
9. If the invocation `ticket` does not match the current `ticket`, stop and report that the invocation guard does not match the selected ticket.
10. If any of `implementation_artifact`, `validation_artifact`, or `review_artifact` does not contain the invocation `run_token`, stop and report that the invocation guard does not match the selected attempt.
11. If `ticket` is `none` or `reset`, or any extracted path is `none`, stop and report that there is no ticket selected for validation preparation.
12. If `stage` is not `waiting-worker`, stop and report that validation preparation can only run from the `waiting-worker` stage.
13. Read the implementation artifact referenced there using `read_artifact`.
14. If the implementation artifact is missing, stop and report that validation cannot proceed because implementation has not completed.
15. Parse the implementation artifact using exact single-occurrence line prefixes:
   - `ticket:`
   - `status:`
16. If parsing fails, stop and report that the implementation artifact is malformed.
17. If the implementation artifact `ticket:` does not exactly equal the current `ticket`, stop and report that implementation wrote an artifact for the wrong ticket.
18. If the implementation artifact indicates `status: blocked`, stop and report that implementation is blocked; leave `ticket-flow/current.md` unchanged so finalization can escalate directly from the implementation artifact.
19. If the implementation artifact does not contain `status: ready-for-validation`, stop and report that the implementation artifact is not in a validation-ready state yet.
20. Overwrite `ticket-flow/current.md` with the same values, but set:
   - `stage: waiting-validation`
21. End with a short summary including the ticket id and implementation status.
