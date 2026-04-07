---
description: Pick exactly one eligible tk ticket and initialize ticket-flow/current.md
model: zai/glm-5-turbo, minimax/MiniMax-M2.7
thinking: minimal
skill: ticket-flow
restore: true
---
Pick exactly one eligible ticket for ticket-flow processing.

Rules:
- This step runs in the main session.
- It must not spawn subagents.
- It must not implement code.
- It must not close tickets.

## Queue context detection

Determine whether this is a queue run by checking if `ticket-flow/progress.md` exists.
If it does, this is a **queue run** — you must also manage progress and lessons-learned artifacts.
If it does not, this is a **single-ticket run** — skip all progress/lessons steps.

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

1. Try `read_artifact(name: "ticket-flow/current.md")`.
2. If `ticket-flow/current.md` exists, parse it using exact single-occurrence line prefixes:
   - `ticket:`
   - `ticket_path:`
   - `stage:`
   - `implementation_artifact:`
   - `validation_artifact:`
   - `review_artifact:`
3. If parsing fails, stop and tell the user to run `/ticket-reset`.
4. If `ticket-flow/current.md` exists and its `stage` is not `done`, stop and report that there is already unfinished orchestrator state.
   - Tell the user to use `/ticket-reset` to clear stale state and retry.
5. Run `tk ready`.
6. If no ready tickets exist:
   - **Queue run:** update `ticket-flow/progress.md` to `status: done`, `last_updated: <now>`, `current_ticket: none`. Write a queue-complete tombstone to `ticket-flow/current.md` with `ticket: none`, `ticket_path: none`, `stage: done`, `implementation_artifact: none`, `validation_artifact: none`, `review_artifact: none`, and `reason: queue complete`. Call `signal_loop_success`. Stop.
   - **Single-ticket run:** report that there are no ready tickets and stop.
7. Inspect candidates in listed order:
   - prefer tickets already marked `[in_progress]`
   - then consider the remaining ready tickets
8. For each candidate, run `tk notes <ticket-id>`.
   - If the notes contain `Gate: ESCALATE`, skip that ticket.
9. Pick the first eligible ticket.
10. If no eligible ticket remains:
    - **Queue run:** same as step 6 queue path (progress → tombstone including `validation_artifact: none` → `signal_loop_success` → stop).
    - **Single-ticket run:** report that all ready tickets are escalated or ineligible and stop.
11. If the chosen ticket is not already `in_progress`, run `tk start <ticket-id>`.
12. Generate a unique `<run-token>` for this ticket-flow attempt (for example an ISO-8601 UTC timestamp without punctuation, or another short unique token) and use the same token in all three artifact filenames below.
13. Write `ticket-flow/current.md` with:

```md
ticket: <ticket-id>
ticket_path: .tickets/<ticket-id>.md
stage: waiting-worker
implementation_artifact: ticket-flow/<ticket-id>/implementation-<run-token>.md
validation_artifact: ticket-flow/<ticket-id>/validation-<run-token>.md
review_artifact: ticket-flow/<ticket-id>/review-<run-token>.md
```

14. **Queue run only:** update `ticket-flow/progress.md` by preserving the existing counters/history but setting:
    - `status: running`
    - `last_updated: <now>`
    - `current_ticket: <ticket-id>`
15. End with a short summary including the selected ticket id.
