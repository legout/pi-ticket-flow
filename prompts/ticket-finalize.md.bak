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

## Procedure

1. Read `ticket-flow/state.json` via `read_artifact`. Verify `stage` is not `done`.
2. Derive artifact paths from `ticket` + `run_token` using `ticket_flow_artifact_paths`.
3. Read the implementation artifact. If missing or `status: blocked`, escalate.
4. Read the validation artifact. If missing or `status: blocked`, escalate.
5. Read the review artifact. If missing, stop.
6. Count prior revise notes via `tk show <ticket>`.
7. If `status: pass`, add PASS note and close ticket.
8. If `status: revise` and attempt ≤ 6, add REVISE note and leave in progress.
9. If `status: revise` and attempt ≥ 7, escalate.
10. Write `ticket-flow/state.json` with `stage: "done"`. Update queue progress if in queue mode.

End with a short summary including the ticket id and final outcome.
