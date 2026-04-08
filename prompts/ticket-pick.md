---
description: Pick exactly one eligible tk ticket and initialize ticket-flow/current.md
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
- It initializes new work only; it does not resume unfinished `ticket-flow/current.md` state.

## Invocation mode

Interpret the first argument exactly:

- `queue` → this is a **queue run**
- empty → this is a **single-ticket run**
- anything else → overwrite `ticket-flow/invocation.md` with a blocked sentinel, then stop and report an invalid invocation mode hint

Before doing any ticket selection work, overwrite `ticket-flow/invocation.md` with:

```md
status: blocked
mode: <queue|single>
ticket: none
run_token: none
reason: selection not completed
```

### Queue-only initialization (only when `ticket-flow/progress.md` is missing but this is a queue run)

If `ticket-flow/progress.md` is missing during a queue run, create it:

```md
# Ticket Queue Progress

status: running
started_at: <ISO-8601>
last_updated: <ISO-8601>
current_ticket: none
completed_tickets: 0
pass_count: 0
revise_count: 0
escalate_count: 0
blocked_count: 0

## Ticket History
- none yet
```

If `ticket-flow/lessons-learned.md` is missing during a queue run, create it:

```md
# Ticket Queue Lessons Learned

Add only durable, reusable lessons learned from implementing tickets.

## Lessons
- none yet
```

## Procedure

1. Interpret `$1` as the invocation mode hint.
2. If the hint is `queue`, set mode to queue. If the hint is empty, set mode to single. Otherwise overwrite `ticket-flow/invocation.md` with `status: blocked`, `mode: single`, `ticket: none`, `run_token: none`, and `reason: invalid invocation mode hint`, then stop and report an invalid invocation mode hint.
3. Overwrite `ticket-flow/invocation.md` with:

```md
status: blocked
mode: <queue|single>
ticket: none
run_token: none
reason: selection not completed
```

4. Try `read_artifact(name: "ticket-flow/current.md")`.
5. If `ticket-flow/current.md` exists, parse it using exact single-occurrence line prefixes:
   - `ticket:`
   - `ticket_path:`
   - `stage:`
   - `implementation_artifact:`
   - `validation_artifact:`
   - `review_artifact:`
   - optional tombstone line: `reason:`
6. If parsing fails:
   - overwrite `ticket-flow/invocation.md` with `status: blocked`, `mode: <queue|single>`, `ticket: none`, `run_token: none`, and `reason: malformed current state`
   - **Queue run only:** call `signal_loop_success` so this queue invocation stops instead of looping uselessly on broken state
   - stop and tell the user to run `/ticket-reset`.
7. If `ticket-flow/current.md` exists and its `stage` is not `done`:
   - overwrite `ticket-flow/invocation.md` with `status: blocked`, `mode: <queue|single>`, `ticket: <ticket from current.md>`, `run_token: none`, and `reason: unfinished orchestrator state`
   - **Queue run only:** call `signal_loop_success` so this queue invocation stops instead of repeating on stale state
   - stop and report that there is already unfinished orchestrator state.
   - Tell the user to use `/ticket-reset` to clear stale state and retry.
8. If this is a queue run and `ticket-flow/progress.md` is missing, create it using the queue progress template above.
9. If this is a queue run and `ticket-flow/lessons-learned.md` is missing, create it using the lessons-learned template above.
10. Run `tk ready`.
11. If no ready tickets exist:
   - **Queue run:** update `ticket-flow/progress.md` to `status: done`, `last_updated: <now>`, `current_ticket: none`. Overwrite `ticket-flow/invocation.md` with `status: blocked`, `mode: queue`, `ticket: none`, `run_token: none`, and `reason: queue complete`. Write a queue-complete tombstone to `ticket-flow/current.md` with `ticket: none`, `ticket_path: none`, `stage: done`, `implementation_artifact: none`, `validation_artifact: none`, `review_artifact: none`, and `reason: queue complete`. Call `signal_loop_success`. Stop.
   - **Single-ticket run:** report that there are no ready tickets and stop.
12. Inspect candidates in listed order:
   - prefer tickets already marked `[in_progress]`
   - then consider the remaining ready tickets
13. For each candidate, inspect its notes.
   - Prefer `tk notes <ticket-id>` when that command exists in this repo's `tk` version.
   - If `tk notes` is unavailable, use `tk show <ticket-id>` and inspect the Notes section.
   - If the notes contain `Gate: ESCALATE`, skip that ticket.
14. Pick the first eligible ticket.
15. If no eligible ticket remains:
    - **Queue run:** same as step 11 queue path (progress → invocation blocked with `reason: queue complete` → tombstone including `validation_artifact: none` → `signal_loop_success` → stop).
    - **Single-ticket run:** report that all ready tickets are escalated or ineligible and stop.
16. If the chosen ticket is not already `in_progress`, run `tk start <ticket-id>`.
17. Generate a unique `<run-token>` for this ticket-flow attempt (for example an ISO-8601 UTC timestamp without punctuation, or another short unique token) and use the same token in all three artifact filenames below.
18. Write `ticket-flow/current.md` with:

```md
ticket: <ticket-id>
ticket_path: .tickets/<ticket-id>.md
stage: waiting-worker
implementation_artifact: ticket-flow/<ticket-id>/implementation-<run-token>.md
validation_artifact: ticket-flow/<ticket-id>/validation-<run-token>.md
review_artifact: ticket-flow/<ticket-id>/review-<run-token>.md
```

19. Overwrite `ticket-flow/invocation.md` with:

```md
status: armed
mode: <queue|single>
ticket: <ticket-id>
run_token: <run-token>
reason: selected ticket
```

20. **Queue run only:** update `ticket-flow/progress.md` by preserving the existing counters/history but setting:
    - `status: running`
    - `last_updated: <now>`
    - `current_ticket: <ticket-id>`
21. End with a short summary including the selected ticket id.
