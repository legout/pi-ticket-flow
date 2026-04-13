---
description: Pick exactly one eligible tk ticket and initialize ticket-flow state
model: zai/glm-5-turbo, minimax/MiniMax-M2.7
thinking: minimal
skill: ticket-flow
restore: true
---
Pick exactly one eligible ticket for ticket-flow processing.

If this procedure ends without selecting a ticket, end your response with the exact final line:

`<!-- CHAIN_STOP -->`

Procedure:
1. Interpret `$1`: `queue` → mode = `queue`, empty → mode = `single`. Otherwise write blocked `ticket-flow/state.json` and stop.
2. Read `ticket-flow/state.json`. If it exists and `stage` is not `done`, report unfinished state; in queue mode call `signal_loop_success`; stop.
3. If old `invocation.json`, `current.json`, `invocation.md`, or `current.md` exist, report legacy state and tell the user to run `/ticket-reset`; in queue mode call `signal_loop_success`; stop.
4. In queue mode, ensure `progress.md` and `lessons-learned.md` exist.
5. Call `ticket_flow_select`. If no eligible ticket, write `ticket-flow/state.json` with `stage: "done"`; in queue mode update `progress.md` to `status: done` and call `signal_loop_success`; stop.
6. Run `tk start <ticket>` if it is not already `in_progress`.
7. Call `ticket_flow_new_run_token`.
8. Write `ticket-flow/state.json` with the armed state (`stage: "implementing"`).
9. Write `ticket-flow/handoff.json` via `write_artifact`.
10. In queue mode, update `progress.md` with the current ticket and run token.
11. End with a short human-readable summary.
