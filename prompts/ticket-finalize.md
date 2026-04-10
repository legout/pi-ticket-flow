---
description: Finalize the selected ticket from implementation, validation, and review artifacts
model: zai/glm-5-turbo, minimax/MiniMax-M2.7
thinking: minimal
skill: ticket-flow
restore: true
---
Finalize the currently selected ticket.

If any guard, state, or artifact prerequisite fails and finalization cannot safely complete, end your response with the exact final line:

`<!-- CHAIN_STOP -->`

## State model

Read machine state from:
- `ticket-flow/invocation.json`
- `ticket-flow/current.json`

Derive per-run artifact paths from `ticket` + `run_token` using `ticket_flow_artifact_paths`.

## Procedure

1. Read `ticket-flow/invocation.json` using `read_artifact`.
2. Parse it as JSON. Required keys:
   - `status`
   - `mode`
   - `ticket`
   - `run_token`
   - `reason`
3. If parsing fails, stop and report that this ticket-flow invocation is not armed for finalization.
4. If `status` is not `armed`, stop and report that this ticket-flow invocation is not armed for finalization.
5. Read `ticket-flow/current.json` using `read_artifact`.
6. Parse it as JSON. Required keys:
   - `ticket`
   - `ticket_path`
   - `stage`
   - optional `reason`
7. If parsing fails, stop and tell the user to run `/ticket-reset`.
8. Ensure `current.ticket === invocation.ticket` and that `ticket` / `ticket_path` / `run_token` are present.
9. If those checks fail, stop and report the mismatch.
10. Derive implementation / validation / review artifact paths from `ticket` + `run_token` using the helper script.
11. Read the implementation artifact.
12. If it is missing, stop and report that finalization cannot proceed because the implementation artifact is missing.
13. Parse and verify:
    - `ticket:` exactly matches the selected ticket
    - `status:` is present
14. If parsing fails, stop and report that the implementation artifact is malformed.
15. If implementation says `status: blocked`:
    - add a concise structured ESCALATE note via `tk add-note <ticket> ...`
    - include the exact line `Gate: ESCALATE`
    - explain that implementation blocked before validation
    - write `ticket-flow/current.json` tombstone with `stage: "done"`
    - write blocked `ticket-flow/invocation.json` with `ticket: null`, `run_token: null`, and `reason: "finalization complete"`
    - set outcome to `BLOCKED`
    - in queue mode skip directly to step 32; in single-ticket mode stop after your final summary
16. Otherwise read the validation artifact.
17. If it is missing, stop and report that finalization cannot proceed because the validation artifact is missing.
18. Parse and verify:
    - `ticket:` exactly matches the selected ticket
    - `status:` is present
    - `source_implementation_artifact:` exactly matches the derived implementation artifact path
19. If parsing fails, stop and report that the validation artifact is malformed.
20. If validation says `status: blocked`:
    - add a concise structured ESCALATE note via `tk add-note <ticket> ...`
    - include the exact line `Gate: ESCALATE`
    - explain that validation blocked before review
    - write `ticket-flow/current.json` tombstone with `stage: "done"`
    - write blocked `ticket-flow/invocation.json` with `ticket: null`, `run_token: null`, and `reason: "finalization complete"`
    - set outcome to `BLOCKED`
    - in queue mode skip directly to step 32; in single-ticket mode stop after your final summary
21. Otherwise treat `current.stage` as advisory only; if validation is green, continue even if the stage lagged behind.
22. Read the review artifact.
23. If it is missing, stop and report that finalization cannot proceed because the review artifact is missing.
24. Parse and verify:
    - `ticket:` exactly matches the selected ticket
    - `gate:` is `PASS` or `REVISE`
25. If parsing fails, stop and report that the review artifact is malformed.
26. Inspect existing ticket notes and count prior notes containing `Gate: REVISE` using `tk show <ticket>` and the Notes section.
27. If gate is PASS:
    - add a concise structured PASS note via `tk add-note <ticket> ...`
    - close the ticket via `tk close <ticket>`
    - set outcome to `PASS`
28. If gate is REVISE and this is failure 1 or 2:
    - add a concise structured REVISE note via `tk add-note <ticket> ...`
    - include `Review Attempt: <N>/3`
    - leave the ticket `in_progress`
    - set outcome to `REVISE`
29. If gate is REVISE and this is failure 3:
    - add a concise structured ESCALATE note via `tk add-note <ticket> ...`
    - include the exact line `Gate: ESCALATE`
    - leave the ticket `in_progress`
    - set outcome to `ESCALATE`
30. Write `ticket-flow/current.json` tombstone:

```json
{
  "version": 2,
  "ticket": null,
  "ticket_path": null,
  "stage": "done",
  "reason": "finalization complete"
}
```

31. Write blocked `ticket-flow/invocation.json`:

```json
{
  "version": 2,
  "status": "blocked",
  "mode": "<single|queue>",
  "ticket": null,
  "run_token": null,
  "reason": "finalization complete"
}
```

32. **Queue mode only:** update `ticket-flow/progress.md` by preserving `started_at` and existing history, then setting:
    - `status: waiting-next`
    - `last_updated: <now>`
    - `current_ticket: none`
    - `current_run_token: none`
    - increment `completed_tickets` only when outcome is PASS, ESCALATE, or BLOCKED
    - leave `completed_tickets` unchanged when outcome is REVISE
    - increment exactly one of `pass_count`, `revise_count`, `escalate_count`, or `blocked_count`
    - append one history bullet:
      - `- <ticket-id> — <OUTCOME> — <brief summary>`
33. **Queue mode only:** update `ticket-flow/lessons-learned.md` only if there is a durable, reusable, non-duplicate lesson worth keeping.
34. End with a short summary including the ticket id and final outcome.
