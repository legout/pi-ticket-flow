---
description: Finalize the selected ticket from implementation, validation, and review artifacts
model: zai/glm-5-turbo, minimax/MiniMax-M2.7
thinking: minimal
skill: ticket-flow
restore: true
---
Finalize the currently selected ticket.

If any guard, stage, or artifact prerequisite fails and finalization cannot safely complete, end your response with the exact final line:

`<!-- CHAIN_STOP -->`

## Invocation guard and queue context

Read `ticket-flow/invocation.md` first.

- If it says `status: armed`, this invocation is allowed to finalize the selected ticket.
- If it says `mode: queue`, this is a **queue run** and you must also update progress and lessons-learned artifacts after finalization.
- If it says `mode: single`, this is a **single-ticket run** and you must skip the queue-only updates.
- If it is missing, malformed, or not `armed`, stop and report that this ticket-flow invocation is not armed for finalization.

## Procedure

1. Read `ticket-flow/invocation.md` using `read_artifact`.
2. Parse it using exact single-occurrence line prefixes:
   - `status:`
   - `mode:`
   - `ticket:`
   - `run_token:`
   - `reason:`
3. If parsing fails, stop and report that this ticket-flow invocation is not armed for finalization.
4. If `status` is not `armed`, stop and report that this ticket-flow invocation is not armed for finalization.
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
9. If the invocation `ticket` does not match the current `ticket`, stop and report that the invocation guard does not match the selected ticket.
10. If any of `implementation_artifact`, `validation_artifact`, or `review_artifact` does not contain the invocation `run_token`, stop and report that the invocation guard does not match the selected attempt.
11. If `ticket` is `none` or `reset`, or any extracted path is `none`, stop and report that there is no ticket selected for finalization.
12. Read the implementation artifact using `read_artifact`.
13. If it is missing, stop and report that finalization cannot proceed because the implementation artifact is missing.
14. Parse the implementation artifact using exact single-occurrence line prefixes:
   - `ticket:`
   - `status:`
15. If parsing fails, stop and report that the implementation artifact is malformed.
16. If the implementation artifact `ticket:` does not exactly equal the selected `ticket`, stop and report that implementation wrote an artifact for the wrong ticket.
17. If the implementation artifact indicates `status: blocked`:
   - add a concise structured ESCALATE note via `tk add-note <ticket> ...`
   - the note **must** include the exact line `Gate: ESCALATE`
   - explain that implementation blocked before validation
   - overwrite `ticket-flow/current.md` with the same values but `stage: done`
   - overwrite `ticket-flow/invocation.md` with `status: blocked`, `mode: <queue|single>`, `ticket: none`, `run_token: none`, and `reason: finalization complete`
   - **Queue run:** set outcome to `BLOCKED` and skip to step 38.
   - **Single-ticket run:** stop.
18. Read the validation artifact using `read_artifact`.
19. If it is missing, stop and report that finalization cannot proceed because the validation artifact is missing.
20. Parse the validation artifact using exact single-occurrence line prefixes:
   - `ticket:`
   - `status:`
   - `source_implementation_artifact:`
21. If parsing fails, stop and report that the validation artifact is malformed.
22. If the validation artifact `ticket:` does not exactly equal the selected `ticket`, stop and report that validation wrote an artifact for the wrong ticket.
23. If `source_implementation_artifact:` does not exactly equal the selected `implementation_artifact`, stop and report that validation references the wrong implementation artifact.
24. If the validation artifact indicates `status: blocked`:
   - add a concise structured ESCALATE note via `tk add-note <ticket> ...`
   - the note **must** include the exact line `Gate: ESCALATE`
   - explain that validation blocked before review
   - overwrite `ticket-flow/current.md` with the same values but `stage: done`
   - overwrite `ticket-flow/invocation.md` with `status: blocked`, `mode: <queue|single>`, `ticket: none`, `run_token: none`, and `reason: finalization complete`
   - **Queue run:** set outcome to `BLOCKED` and skip to step 38.
   - **Single-ticket run:** stop.
25. If `stage` is not `waiting-review`, stop and report that finalization can only run from the `waiting-review` stage unless implementation or validation blocked earlier.
26. Read the review artifact using `read_artifact`.
27. If it is missing, stop and report that finalization cannot proceed because the review artifact is missing.
28. Parse the review artifact using exact single-occurrence line prefixes:
   - `ticket:`
   - `gate:`
29. If parsing fails, stop and report that the review artifact is malformed.
30. If the review artifact `ticket:` does not exactly equal the selected `ticket`, stop and report that review wrote an artifact for the wrong ticket.
31. Parse `gate: PASS` or `gate: REVISE` from the review artifact.
32. Inspect existing ticket notes and count prior notes containing `Gate: REVISE` using `tk show <ticket>` and the Notes section.
33. If gate is PASS:
    - add a concise structured PASS note via `tk add-note <ticket> ...`
    - close the ticket via `tk close <ticket>`
    - set outcome to `PASS`
34. If gate is REVISE and this is failure 1 or 2:
    - add a concise structured REVISE note via `tk add-note <ticket> ...`
    - include `Review Attempt: <N>/3`
    - leave the ticket `in_progress`
    - set outcome to `REVISE`
35. If gate is REVISE and this is failure 3:
    - add a concise structured ESCALATE note via `tk add-note <ticket> ...`
    - include `Gate: ESCALATE`
    - leave the ticket `in_progress`
    - set outcome to `ESCALATE`
36. Overwrite `ticket-flow/current.md` with:

```md
ticket: <ticket>
ticket_path: <ticket_path>
stage: done
implementation_artifact: <implementation_artifact>
validation_artifact: <validation_artifact>
review_artifact: <review_artifact>
```

37. Overwrite `ticket-flow/invocation.md` with:

```md
status: blocked
mode: <queue|single>
ticket: none
run_token: none
reason: finalization complete
```

38. **Queue run only:** update `ticket-flow/progress.md` by preserving `started_at` and existing history, then setting:
    - `status: waiting-next`
    - `last_updated: <now>`
    - `current_ticket: none`
    - increment `completed_tickets` by 1 only when outcome is PASS, ESCALATE, or BLOCKED
    - leave `completed_tickets` unchanged when outcome is REVISE (the ticket remains `in_progress` and will be retried)
    - increment exactly one of:
      - `pass_count` when outcome is PASS
      - `revise_count` when outcome is REVISE
      - `escalate_count` when outcome is ESCALATE
      - `blocked_count` when outcome is BLOCKED
    - append one new history bullet:
      - `- <ticket-id> — <OUTCOME> — <brief summary>`

39. **Queue run only:** update `ticket-flow/lessons-learned.md` only if there is a durable, reusable, non-duplicate lesson from this ticket.
    - add at most one new bullet for this ticket
    - prefer lessons about patterns, validation gaps, review findings, or implementation pitfalls that are likely to recur
    - if there is no strong new lesson, leave the file unchanged
    - bullet format:
      - `- [<ticket-id>] <concise reusable lesson>`

40. End with a short summary including the final gate/outcome and ticket id.
