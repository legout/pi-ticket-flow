---
description: Deprecated alias for /ticket-finalize
model: zai/glm-5-turbo, minimax/MiniMax-M2.7
thinking: minimal
skill: ticket-flow
restore: true
---
Finalize the currently selected ticket.

Procedure:
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
   - `implementation_artifact`
   - `review_artifact`
5. Read both artifacts.
6. If the implementation artifact indicates `status: blocked`:
   - add a concise structured ESCALATE note via `tk add-note <ticket> ...`
   - explain that implementation blocked before review
   - overwrite `ticket-flow/current.md` with the same values but `stage: done`
   - stop
7. Parse `gate: PASS` or `gate: REVISE` from the review artifact.
8. Run `tk notes <ticket>` and count prior notes containing `Gate: REVISE`.
9. If gate is PASS:
   - add a concise structured PASS note via `tk add-note <ticket> ...`
   - close the ticket via `tk close <ticket>`
10. If gate is REVISE and this is failure 1 or 2:
   - add a concise structured REVISE note via `tk add-note <ticket> ...`
   - include `Review Attempt: <N>/3`
   - leave the ticket `in_progress`
11. If gate is REVISE and this is failure 3:
   - add a concise structured ESCALATE note via `tk add-note <ticket> ...`
   - include `Gate: ESCALATE`
   - leave the ticket `in_progress`
12. Overwrite `ticket-flow/current.md` with:

```md
ticket: <ticket>
ticket_path: <ticket_path>
stage: done
implementation_artifact: <implementation_artifact>
review_artifact: <review_artifact>
```

13. End with a short summary including the final gate and ticket id.
