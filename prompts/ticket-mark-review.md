---
description: Advance ticket-flow/current.md from waiting-validation to waiting-review after validation is green
model: openai-codex/gpt-5.4-mini, zai/glm-5-turbo, minimax/MiniMax-M2.7
thinking: minimal
restore: true
---
Prepare the selected ticket for review.

If any prerequisite check fails and review preparation cannot advance the workflow, end your response with the exact final line:

`<!-- CHAIN_STOP -->`

Strict parsing rule:
- Only exact lowercase prefix lines count (`ticket:`, `status:`, and `source_implementation_artifact:`).
- Do **not** treat headings, bold labels, or semantically similar text as valid substitutes.
- If the validation artifact is malformed, stop; do **not** advance `ticket-flow/current.md`.

Procedure:
1. Read `ticket-flow/invocation.md` using `read_artifact`.
2. Parse it using exact single-occurrence line prefixes:
   - `status:`
   - `mode:`
   - `ticket:`
   - `run_token:`
   - `reason:`
3. If parsing fails, stop and report that this ticket-flow invocation is not armed for downstream steps.
4. If `status` is not `armed`, stop and report that review preparation is not armed for this invocation.
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
11. If `ticket` is `none` or `reset`, or any extracted path is `none`, stop and report that there is no ticket selected for review preparation.
12. If `stage` is not `waiting-validation`, stop and report that review preparation can only run from the `waiting-validation` stage.
13. Read the validation artifact referenced there using `read_artifact`.
14. If the validation artifact is missing, stop and report that review cannot proceed.
15. Parse the validation artifact using exact single-occurrence line prefixes:
   - `ticket:`
   - `status:`
   - `source_implementation_artifact:`
16. If parsing fails, stop and report that the validation artifact is malformed.
17. If the validation artifact `ticket:` does not exactly equal the current `ticket`, stop and report that validation wrote an artifact for the wrong ticket.
18. If `source_implementation_artifact:` does not exactly equal the current `implementation_artifact`, stop and report that validation references the wrong implementation artifact.
19. If the validation artifact indicates `status: blocked`, stop and report that review cannot proceed because implementation/validation is blocked.
20. If the validation artifact does not indicate `status: ready-for-review`, stop and report that review cannot proceed because validation is not complete yet.
21. Overwrite `ticket-flow/current.md` with the same values, but set:
   - `stage: waiting-review`
22. End with a short summary including the ticket id.
