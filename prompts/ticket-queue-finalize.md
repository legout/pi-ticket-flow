---
description: Finalize one queued ticket and update queue progress and lessons learned
model: zai/glm-5-turbo, minimax/MiniMax-M2.7
thinking: minimal
skill: ticket-flow
restore: true
---
Finalize the currently selected queued ticket and update queue tracking artifacts.

Tracking artifacts:
- `ticket-flow/current.md`
- `ticket-flow/progress.md`
- `ticket-flow/lessons-learned.md`

## Procedure

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
5. If `ticket` is `none` or `reset`, or any extracted path is `none`, stop and report that there is no ticket selected for queue finalization.
6. Read the implementation artifact. If it is missing, stop and report that queue finalization cannot proceed because the implementation artifact is missing.
7. Read `ticket-flow/progress.md`. If missing, recreate it using the format from `/ticket-queue-pick` before continuing.
8. Read `ticket-flow/lessons-learned.md` if it exists.
9. If the implementation artifact indicates `status: blocked`:
   - add a concise structured ESCALATE note via `tk add-note <ticket> ...`
   - explain that implementation blocked before review
   - overwrite `ticket-flow/current.md` with the same values but `stage: done`
   - treat the queue outcome as `BLOCKED`
   - skip directly to step 18 so progress and lessons learned still update
10. Otherwise, if `stage` is not `waiting-review`, stop and report that queue finalization can only run from the `waiting-review` stage unless implementation blocked before review.
11. Otherwise read the review artifact. If it is missing, stop and report that queue finalization cannot proceed because the review artifact is missing.
12. Otherwise, if the review artifact does not contain a parseable `gate:` field, stop and report that the review artifact is malformed.
13. Otherwise parse `gate: PASS` or `gate: REVISE` from the review artifact.
14. Run `tk notes <ticket>` and count prior notes containing `Gate: REVISE`.
15. If gate is PASS:
   - add a concise structured PASS note via `tk add-note <ticket> ...`
   - close the ticket via `tk close <ticket>`
   - treat the queue outcome as `PASS`
16. If gate is REVISE and this is failure 1 or 2:
   - add a concise structured REVISE note via `tk add-note <ticket> ...`
   - include `Review Attempt: <N>/3`
   - leave the ticket `in_progress`
   - treat the queue outcome as `REVISE`
17. If gate is REVISE and this is failure 3:
   - add a concise structured ESCALATE note via `tk add-note <ticket> ...`
   - include `Gate: ESCALATE`
   - leave the ticket `in_progress`
   - treat the queue outcome as `ESCALATE`
18. Overwrite `ticket-flow/current.md` with:

```md
ticket: <ticket>
ticket_path: <ticket_path>
stage: done
implementation_artifact: <implementation_artifact>
review_artifact: <review_artifact>
```

19. Update `ticket-flow/progress.md` by preserving `started_at` and existing history, then setting:
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
20. Update `ticket-flow/lessons-learned.md` only if there is a durable, reusable, non-duplicate lesson from this ticket.
   - add at most one new bullet for this ticket
   - prefer lessons about patterns, validation gaps, review findings, or implementation pitfalls that are likely to recur
   - if there is no strong new lesson, leave the file unchanged
   - bullet format:
     - `- [<ticket-id>] <concise reusable lesson>`
21. End with a short summary including the ticket id and final queue outcome.
