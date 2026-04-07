---
description: Finalize the selected ticket from implementation and review artifacts
model: zai/glm-5-turbo, minimax/MiniMax-M2.7
thinking: minimal
skill: ticket-flow
restore: true
---
Finalize the currently selected ticket.

## Queue context detection

Determine whether this is a queue run by checking if `ticket-flow/progress.md` exists.
If it does, this is a **queue run** — you must also update progress and lessons-learned artifacts after finalization.
If it does not, this is a **single-ticket run** — skip all progress/lessons steps.

## Procedure

1. Read `ticket-flow/current.md` using `read_artifact`.
2. Parse it using exact single-occurrence line prefixes:
   - `ticket:`
   - `ticket_path:`
   - `stage:`
   - `implementation_artifact:`
   - `validation_artifact:`
   - `review_artifact:`
3. If parsing fails, stop and tell the user to run `/ticket-reset`.
4. Extract:
   - `ticket`
   - `ticket_path`
   - `stage`
   - `implementation_artifact`
   - `validation_artifact`
   - `review_artifact`
5. If `ticket` is `none` or `reset`, or any extracted path is `none`, stop and report that there is no ticket selected for finalization.
6. Read the implementation artifact. If it is missing, stop and report that finalization cannot proceed because the implementation artifact is missing.
7. Read the validation artifact. If it is missing, stop and report that finalization cannot proceed because the validation artifact is missing.
8. If the validation artifact indicates `status: blocked`:
   - add a concise structured ESCALATE note via `tk add-note <ticket> ...`
   - explain that validation blocked before review
   - overwrite `ticket-flow/current.md` with the same values but `stage: done`
   - **Queue run:** set outcome to `BLOCKED` and skip to step 18.
   - **Single-ticket run:** stop.
9. If `stage` is not `waiting-review`, stop and report that finalization can only run from the `waiting-review` stage unless validation blocked before review.
10. Read the review artifact. If it is missing, stop and report that finalization cannot proceed because the review artifact is missing.
11. If the review artifact does not contain a parseable `gate:` field, stop and report that the review artifact is malformed.
12. Parse `gate: PASS` or `gate: REVISE` from the review artifact.
13. Run `tk notes <ticket>` and count prior notes containing `Gate: REVISE`.
14. If gate is PASS:
    - add a concise structured PASS note via `tk add-note <ticket> ...`
    - close the ticket via `tk close <ticket>`
    - set outcome to `PASS`
15. If gate is REVISE and this is failure 1 or 2:
    - add a concise structured REVISE note via `tk add-note <ticket> ...`
    - include `Review Attempt: <N>/3`
    - leave the ticket `in_progress`
    - set outcome to `REVISE`
16. If gate is REVISE and this is failure 3:
    - add a concise structured ESCALATE note via `tk add-note <ticket> ...`
    - include `Gate: ESCALATE`
    - leave the ticket `in_progress`
    - set outcome to `ESCALATE`
17. Overwrite `ticket-flow/current.md` with:

```md
ticket: <ticket>
ticket_path: <ticket_path>
stage: done
implementation_artifact: <implementation_artifact>
validation_artifact: <validation_artifact>
review_artifact: <review_artifact>
```

18. **Queue run only:** update `ticket-flow/progress.md` by preserving `started_at` and existing history, then setting:
    - `status: waiting-next`
    - `last_updated: <now>`
    - `current_ticket: none`
    - increment `completed_tickets` by 1
    - increment exactly one of:
      - `pass_count` when outcome is PASS
      - `revise_count` when outcome is REVISE
      - `escalate_count` when outcome is ESCALATE
      - `blocked_count` when outcome is BLOCKED
    - append one new history bullet:
      - `- <ticket-id> — <OUTCOME> — <brief summary>`

19. **Queue run only:** update `ticket-flow/lessons-learned.md` only if there is a durable, reusable, non-duplicate lesson from this ticket.
    - add at most one new bullet for this ticket
    - prefer lessons about patterns, validation gaps, review findings, or implementation pitfalls that are likely to recur
    - if there is no strong new lesson, leave the file unchanged
    - bullet format:
      - `- [<ticket-id>] <concise reusable lesson>`

20. End with a short summary including the final gate/outcome and ticket id.
