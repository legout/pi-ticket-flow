---
description: Finalize the selected ticket from implementation, validation, and review artifacts
model: zai/glm-5-turbo, minimax/MiniMax-M2.7
thinking: minimal
skill: ticket-flow
restore: true
---
Finalize the currently selected ticket.

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
12. Read the implementation artifact. If it is missing, stop and report that finalization cannot proceed because the implementation artifact is missing.
13. If the implementation artifact indicates `status: blocked`:
   - add a concise structured ESCALATE note via `tk add-note <ticket> ...`
   - the note **must** include the exact line `Gate: ESCALATE`
   - explain that implementation blocked before validation
   - overwrite `ticket-flow/current.md` with the same values but `stage: done`
   - overwrite `ticket-flow/invocation.md` with `status: blocked`, `mode: <queue|single>`, `ticket: none`, `run_token: none`, and `reason: finalization complete`
   - **Queue run:** set outcome to `BLOCKED` and skip to step 26.
   - **Single-ticket run:** stop.
14. Read the validation artifact. If it is missing, stop and report that finalization cannot proceed because the validation artifact is missing.
15. If the validation artifact indicates `status: blocked`:
   - add a concise structured ESCALATE note via `tk add-note <ticket> ...`
   - the note **must** include the exact line `Gate: ESCALATE`
   - explain that validation blocked before review
   - overwrite `ticket-flow/current.md` with the same values but `stage: done`
   - overwrite `ticket-flow/invocation.md` with `status: blocked`, `mode: <queue|single>`, `ticket: none`, `run_token: none`, and `reason: finalization complete`
   - **Queue run:** set outcome to `BLOCKED` and skip to step 26.
   - **Single-ticket run:** stop.
16. If `stage` is not `waiting-review`, stop and report that finalization can only run from the `waiting-review` stage unless implementation or validation blocked earlier.
17. Read the review artifact. If it is missing, stop and report that finalization cannot proceed because the review artifact is missing.
18. If the review artifact does not contain a parseable `gate:` field, stop and report that the review artifact is malformed.
19. Parse `gate: PASS` or `gate: REVISE` from the review artifact.
20. Run `tk notes <ticket>` and count prior notes containing `Gate: REVISE`.
21. If gate is PASS:
    - add a concise structured PASS note via `tk add-note <ticket> ...`
    - close the ticket via `tk close <ticket>`
    - set outcome to `PASS`
22. If gate is REVISE and this is failure 1 or 2:
    - add a concise structured REVISE note via `tk add-note <ticket> ...`
    - include `Review Attempt: <N>/3`
    - leave the ticket `in_progress`
    - set outcome to `REVISE`
23. If gate is REVISE and this is failure 3:
    - add a concise structured ESCALATE note via `tk add-note <ticket> ...`
    - include `Gate: ESCALATE`
    - leave the ticket `in_progress`
    - set outcome to `ESCALATE`
24. Overwrite `ticket-flow/current.md` with:

```md
ticket: <ticket>
ticket_path: <ticket_path>
stage: done
implementation_artifact: <implementation_artifact>
validation_artifact: <validation_artifact>
review_artifact: <review_artifact>
```

25. Overwrite `ticket-flow/invocation.md` with:

```md
status: blocked
mode: <queue|single>
ticket: none
run_token: none
reason: finalization complete
```

26. **Queue run only:** update `ticket-flow/progress.md` by preserving `started_at` and existing history, then setting:
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

27. **Queue run only:** update `ticket-flow/lessons-learned.md` only if there is a durable, reusable, non-duplicate lesson from this ticket.
    - add at most one new bullet for this ticket
    - prefer lessons about patterns, validation gaps, review findings, or implementation pitfalls that are likely to recur
    - if there is no strong new lesson, leave the file unchanged
    - bullet format:
      - `- [<ticket-id>] <concise reusable lesson>`

28. End with a short summary including the final gate/outcome and ticket id.
