---
description: Pick exactly one eligible tk ticket and initialize simplified ticket-flow state
model: zai/glm-5-turbo, minimax/MiniMax-M2.7
thinking: minimal
skill: ticket-flow
restore: true
---
Pick exactly one eligible ticket for ticket-flow processing.

Invocation mode hint: `$1`

Rules:
- This step runs in the main session.
- It must not spawn subagents.
- It must not implement code.
- It must not close tickets.
- It initializes new work only; it does not resume unfinished state.
- Use the deterministic helper tools exposed by this package for candidate selection and run-token generation.

If this procedure ends **without** selecting a ticket, end your response with the exact final line:

`<!-- CHAIN_STOP -->`

## State files

Machine state now lives in JSON session artifacts:
- `ticket-flow/invocation.json`
- `ticket-flow/current.json`

Legacy markdown state files may still exist from older runs:
- `ticket-flow/invocation.md`
- `ticket-flow/current.md`

If legacy state exists, stop and tell the user to run `/ticket-reset` so the session can be migrated cleanly.

## Invocation mode

Interpret the first argument exactly:

- `queue` → queue run
- empty → single-ticket run
- anything else → invalid

Before doing selection work, overwrite `ticket-flow/invocation.json` with this blocked sentinel:

```json
{
  "version": 2,
  "status": "blocked",
  "mode": "single or queue",
  "ticket": null,
  "run_token": null,
  "reason": "selection not completed"
}
```

## Queue-only initialization

If this is a queue run and `ticket-flow/progress.md` is missing, create:

```md
# Ticket Queue Progress

status: running
started_at: <ISO-8601>
last_updated: <ISO-8601>
current_ticket: none
current_run_token: none
completed_tickets: 0
pass_count: 0
revise_count: 0
escalate_count: 0
blocked_count: 0

## Ticket History
- none yet
```

If this is a queue run and `ticket-flow/lessons-learned.md` is missing, create:

```md
# Ticket Queue Lessons Learned

Add only durable, reusable lessons learned from implementing tickets.

## Lessons
- none yet
```

## Procedure

1. Interpret `$1` as the mode hint.
2. If it is `queue`, mode = `queue`.
3. If it is empty, mode = `single`.
4. Otherwise write blocked `ticket-flow/invocation.json` with `mode: "single"` and `reason: "invalid invocation mode hint"`, report the invalid hint, and stop.
5. Overwrite `ticket-flow/invocation.json` with blocked sentinel state for the chosen mode.
6. Try `read_artifact(name: "ticket-flow/current.json")`.
7. If `ticket-flow/current.json` exists, parse it as JSON. Required keys:
   - `version`
   - `ticket`
   - `ticket_path`
   - `stage`
   - optional `reason`
8. If `ticket-flow/current.json` is malformed, keep invocation blocked, report malformed state, and tell the user to run `/ticket-reset`.
   - In queue mode, call `signal_loop_success` before stopping so the queue does not spin on broken state.
9. If `ticket-flow/current.json` exists and `stage` is not `done`, keep invocation blocked, report unfinished orchestrator state, and stop.
   - In queue mode, call `signal_loop_success` before stopping so the queue does not spin uselessly.
10. If `ticket-flow/current.json` is missing, try `read_artifact(name: "ticket-flow/current.md")` and `read_artifact(name: "ticket-flow/invocation.md")` only as a legacy check.
11. If either legacy markdown state artifact exists, keep invocation blocked, report that legacy state is present, and tell the user to run `/ticket-reset`.
   - In queue mode, call `signal_loop_success` before stopping so the queue does not spin on legacy state.
12. In queue mode, create `ticket-flow/progress.md` and/or `ticket-flow/lessons-learned.md` if missing.
13. Call `ticket_flow_select`.
14. Parse its JSON output.
15. If helper returns `outcome: "none-ready"`:
    - **Queue mode:** update `ticket-flow/progress.md` to `status: done`, `last_updated: <now>`, `current_ticket: none`, `current_run_token: none`; write blocked `ticket-flow/invocation.json` with `reason: "queue complete"`; write `ticket-flow/current.json` tombstone with `ticket: null`, `ticket_path: null`, `stage: "done"`, and `reason: "queue complete"`; call `signal_loop_success`; stop.
    - **Single mode:** report that there are no ready tickets and stop.
16. If helper returns `outcome: "no-eligible"`:
    - **Queue mode:** same completion path as step 15 queue mode.
    - **Single mode:** report that all ready tickets are escalated, dependency-blocked, or otherwise ineligible, and stop.
17. If helper returns `outcome: "selected"`, extract:
    - `selected.ticket`
    - `selected.ticketPath`
    - `selected.currentStatus`
18. If no ticket path is available, stop and report that the ticket file could not be located.
19. If `selected.currentStatus` is not `in_progress`, run `tk start <ticket>`.
20. Call `ticket_flow_new_run_token`.
21. Write `ticket-flow/current.json`:

```json
{
  "version": 2,
  "ticket": "<ticket-id>",
  "ticket_path": ".tickets/<ticket-id>.md",
  "stage": "waiting-worker",
  "reason": "selected ticket"
}
```

22. Overwrite `ticket-flow/invocation.json`:

```json
{
  "version": 2,
  "status": "armed",
  "mode": "<single|queue>",
  "ticket": "<ticket-id>",
  "run_token": "<run-token>",
  "reason": "selected ticket"
}
```

23. **Queue mode only:** update `ticket-flow/progress.md` to set:
    - `status: running`
    - `last_updated: <now>`
    - `current_ticket: <ticket-id>`
    - `current_run_token: <run-token>`
24. End with a short summary including the selected ticket id and run token.
